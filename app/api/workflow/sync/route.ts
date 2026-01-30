import { NextResponse } from "next/server";
import { AzureBlobConnector } from "@/lib/azure-blob-connector";
import { createServiceRoleClient } from "@/lib/supabase";
import { getApiUser } from "@/lib/api-auth";
import { uploadAndEnqueueDocument } from "@/app/actions";
import { sanitizeFilename } from "@/lib/sanitize-filename";
import { getAzureConnection } from "@/lib/azure-connection";

export const dynamic = "force-dynamic";

/**
 * Workflow Sync Endpoint
 * Fetches files from Azure configured input folders and processes them
 * Matches Python workflow_manager.py functionality
 */
export async function POST() {
  try {
    const { user, error: authError } = await getApiUser();
    if (authError || !user) return authError!;
    
    // Get Azure connection (database or env fallback)
    const azureConnection = await getAzureConnection(user.id);
    
    if (!azureConnection) {
      return NextResponse.json(
        { error: "Azure connection not configured" },
        { status: 500 }
      );
    }
    
    const { connectionString, defaultContainer } = azureConnection;
    const containerName = defaultContainer || "arrivalwastedata";

    console.log("\n" + "=".repeat(60));
    console.log("🔄 WORKFLOW SYNC: Starting...");
    console.log("=".repeat(60));

    const supabase = createServiceRoleClient();

    // Fetch folder settings from database
    const { data: settings, error: settingsError } = await supabase
      .from("settings")
      .select("azure_input_folders")
      .eq("user_id", user.id)
      .single();

    if (settingsError) {
      console.warn(`⚠️ Could not fetch settings: ${settingsError.message}`);
    }

    const inputFolders = settings?.azure_input_folders;
    
    if (inputFolders && Array.isArray(inputFolders) && inputFolders.length > 0) {
      const enabledFolders = inputFolders.filter((f: any) => f.enabled !== false);
      console.log(`\n📁 Configured input folders (${enabledFolders.length} enabled):`);
      enabledFolders.forEach((f: any, i: number) => {
        const path = f.folder ? `${f.container}/${f.folder}` : f.container;
        console.log(`   ${i + 1}. ${path}`);
      });
    } else {
      console.log("\n⚠️ No input folders configured!");
      return NextResponse.json({
        success: false,
        error: "No input folders configured. Please configure folders in Settings → Azure & GUIDs.",
        processed: 0,
      });
    }

    console.log("\n🔎 Scanning for files...");
    const connector = new AzureBlobConnector(connectionString, containerName);
    const failedFiles = await connector.listFailedFiles(inputFolders);

    if (failedFiles.length === 0) {
      console.log("\n✅ WORKFLOW SYNC: Complete - No files to process\n");
      return NextResponse.json({
        success: true,
        message: "No files found in configured folders",
        processed: 0,
      });
    }

    console.log(`\n📦 Found ${failedFiles.length} file(s) to process`);
    
    // ============================================
    // DUPLICATE PROTECTION - Check existing files
    // ============================================
    // Get all azure_original_filename values for this user to detect duplicates
    const { data: existingDocs } = await supabase
      .from("documents")
      .select("azure_original_filename, filename")
      .eq("user_id", user.id)
      .not("azure_original_filename", "is", null);
    
    const existingPaths = new Set(
      (existingDocs || []).map(d => d.azure_original_filename)
    );
    const existingFilenames = new Set(
      (existingDocs || []).map(d => d.filename)
    );
    
    // Filter out duplicates
    const newFiles = failedFiles.filter(f => {
      const isDuplicatePath = existingPaths.has(f.full_path);
      const isDuplicateName = existingFilenames.has(f.name);
      
      if (isDuplicatePath) {
        console.log(`   ⏭️ Skipping duplicate (path match): ${f.name}`);
        return false;
      }
      if (isDuplicateName) {
        console.log(`   ⏭️ Skipping duplicate (filename match): ${f.name}`);
        return false;
      }
      return true;
    });
    
    const skippedCount = failedFiles.length - newFiles.length;
    if (skippedCount > 0) {
      console.log(`\n🔒 Duplicate protection: ${skippedCount} file(s) already imported, skipping`);
    }
    
    if (newFiles.length === 0) {
      console.log("\n✅ WORKFLOW SYNC: Complete - All files already imported\n");
      return NextResponse.json({
        success: true,
        message: `All ${failedFiles.length} files already imported (duplicate protection)`,
        processed: 0,
        skipped: skippedCount,
      });
    }
    
    console.log(`\n📥 Importing ${newFiles.length} new file(s)...`);
    
    const results = {
      total: failedFiles.length,
      newFiles: newFiles.length,
      skipped: skippedCount,
      processed: 0,
      errors: 0,
      files: [] as any[],
    };

    // Process each file
    for (const fileInfo of newFiles) {
      try {
        // Download file (use source_folder as container name)
        const buffer = await connector.downloadFile(fileInfo.full_path, fileInfo.source_folder);

        // Create a File object for uploadAndEnqueueDocument
        const file = new File([buffer], fileInfo.name, {
          type: fileInfo.content_type || "application/pdf",
        });

        // Upload to Supabase and enqueue for processing
        // Note: This requires modifying uploadAndEnqueueDocument to accept File objects
        // For now, we'll create a document record directly
        const sanitizedName = sanitizeFilename(fileInfo.name);
        const storagePath = `azure-sync/${sanitizedName}`;
        
        const { data: doc, error: docError } = await supabase
          .from("documents")
          .insert({
            filename: fileInfo.name,
            status: "uploaded",
            storage_path: storagePath,
            user_id: user.id, // IMPORTANT: Associate with authenticated user
            azure_original_filename: fileInfo.full_path, // Track FULL blob path for safe cleanup (includes folder!)
            source_container: fileInfo.source_folder || (fileInfo.name.endsWith('.pdf') ? 'unsupported-file-format' : 'unable-to-process'), // Track source container
            extracted_data: {
              source: "azure_failed",
              original_blob_path: fileInfo.full_path,
              source_folder: fileInfo.source_folder,
            },
          })
          .select()
          .single();

        if (docError) {
          console.error(`Error creating document for ${fileInfo.name}:`, docError);
          results.errors++;
          continue;
        }

        // Upload file to Supabase storage
        const { error: uploadError } = await supabase.storage
          .from("raw_documents")
          .upload(storagePath, buffer, {
            contentType: fileInfo.content_type || "application/pdf",
            upsert: true,
          });

        if (uploadError) {
          console.error(`Error uploading ${fileInfo.name}:`, uploadError);
          results.errors++;
          continue;
        }

        // Enqueue for processing
        await supabase.from("processing_jobs").insert({
          document_id: doc.id,
          status: "queued",
        });

        results.processed++;
        results.files.push({
          filename: fileInfo.name,
          status: "queued",
          documentId: doc.id,
        });
      } catch (error: any) {
        console.error(`Error processing ${fileInfo.name}:`, error);
        results.errors++;
        results.files.push({
          filename: fileInfo.name,
          status: "error",
          error: error.message,
        });
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log(`✅ WORKFLOW SYNC: Complete`);
    console.log(`   📊 Total: ${results.total}, Processed: ${results.processed}, Errors: ${results.errors}`);
    console.log("=".repeat(60) + "\n");

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} of ${results.total} files`,
      ...results,
    });
  } catch (error: any) {
    console.error("\n" + "=".repeat(60));
    console.error("❌ WORKFLOW SYNC: Fatal error");
    console.error(`   ${error?.message || error}`);
    console.error("=".repeat(60) + "\n");
    return NextResponse.json(
      { error: error.message || "Failed to sync workflow" },
      { status: 500 }
    );
  }
}


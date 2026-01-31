/**
 * Auto-Fetcher Cron Job
 * Runs periodically to check Azure Blob Storage for failed files
 * Processes for ALL users with configured Azure connections
 * 
 * Configure in Vercel: Add cron job in vercel.json
 * Or use external cron service to call this endpoint
 */

import { NextResponse } from "next/server";
import { AzureBlobConnector } from "@/lib/azure-blob-connector";
import { createServiceRoleClient } from "@/lib/supabase";
import { sanitizeFilename } from "@/lib/sanitize-filename";
import { getAzureConnection } from "@/lib/azure-connection";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max

export async function GET(request: Request) {
  // Verify cron secret (if using Vercel Cron)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceRoleClient();
    
    // Get all users with configured input folders
    const { data: users } = await supabase
      .from("settings")
      .select("user_id, azure_input_folders");
    
    if (!users || users.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No users with settings found",
        processed: 0,
      });
    }

    console.log("\n" + "=".repeat(60));
    console.log("🔍 AUTO-FETCHER: Starting scheduled scan...");
    console.log("=".repeat(60));
    console.log(`📅 Time: ${new Date().toISOString()}`);
    console.log(`👥 Found ${users.length} user(s) to check`);

    let totalProcessed = 0;
    let totalErrors = 0;
    const allResults: any[] = [];
    
    // Process for each user
    for (const userSettings of users) {
      const userId = userSettings.user_id;
      const inputFolders = userSettings.azure_input_folders;
      
      // Skip users without configured folders
      if (!inputFolders || !Array.isArray(inputFolders) || inputFolders.length === 0) {
        console.log(`⏭️ Skipping user ${userId}: No input folders configured`);
        continue;
      }
      
      const enabledFolders = inputFolders.filter((f: any) => f.enabled !== false);
      if (enabledFolders.length === 0) {
        console.log(`⏭️ Skipping user ${userId}: No enabled folders`);
        continue;
      }
      
      // Get Azure connection for this user
      const azureConnection = await getAzureConnection(userId);
      if (!azureConnection) {
        console.log(`⚠️ Skipping user ${userId}: No Azure connection configured`);
        continue;
      }
      
      const { connectionString, defaultContainer } = azureConnection;
      const containerName = defaultContainer || "arrivalwastedata";
      
      console.log(`\n👤 Processing user: ${userId}`);
      console.log(`   📁 Enabled folders: ${enabledFolders.length}`);
      
      enabledFolders.forEach((f: any, i: number) => {
        const path = f.folder ? `${f.container}/${f.folder}` : f.container;
        console.log(`      ${i + 1}. ${path}`);
      });

      try {
        const connector = new AzureBlobConnector(connectionString, containerName);
        const failedFiles = await connector.listFailedFiles(inputFolders);

        if (failedFiles.length === 0) {
          console.log(`   ✓ No files to process`);
          continue;
        }

        console.log(`   📦 Found ${failedFiles.length} file(s) in Azure`);
        
        // ============================================
        // DUPLICATE PROTECTION - Check existing files
        // ============================================
        // Check ALL documents for this user (not just those with azure_original_filename)
        // This ensures old documents imported before migration are also detected
        const { data: existingDocs } = await supabase
          .from("documents")
          .select("azure_original_filename, filename")
          .eq("user_id", userId);
        
        const existingPaths = new Set(
          (existingDocs || [])
            .filter(d => d.azure_original_filename)
            .map(d => d.azure_original_filename)
        );
        const existingFilenames = new Set(
          (existingDocs || []).map(d => d.filename)
        );
        
        // Filter out duplicates
        const newFiles = failedFiles.filter(f => {
          const isDuplicatePath = existingPaths.has(f.full_path);
          const isDuplicateName = existingFilenames.has(f.name);
          
          if (isDuplicatePath || isDuplicateName) {
            return false; // Skip silently in cron (avoid log spam)
          }
          return true;
        });
        
        const skippedCount = failedFiles.length - newFiles.length;
        if (skippedCount > 0) {
          console.log(`   🔒 Skipped ${skippedCount} duplicate(s)`);
        }
        
        if (newFiles.length === 0) {
          console.log(`   ✓ All files already imported`);
          continue;
        }
        
        console.log(`   📥 Importing ${newFiles.length} new file(s)`);

        // Process each NEW file only
        for (const fileInfo of newFiles) {
          try {
            console.log(`   📄 Processing ${fileInfo.name}`);

            // Download file
            const buffer = await connector.downloadFile(fileInfo.full_path, fileInfo.source_folder);

            // Upload to Supabase storage
            const sanitizedName = sanitizeFilename(fileInfo.name);
            const storagePath = `azure-auto-fetch/${Date.now()}-${sanitizedName}`;
            const { error: uploadError } = await supabase.storage
              .from("raw_documents")
              .upload(storagePath, buffer, {
                contentType: fileInfo.content_type || "application/pdf",
                upsert: false,
              });

            if (uploadError) {
              console.error(`   ❌ Upload failed: ${uploadError.message}`);
              totalErrors++;
              continue;
            }

            // Create document record
            const { data: doc, error: docError } = await supabase
              .from("documents")
              .insert({
                filename: fileInfo.name,
                status: "uploaded",
                storage_path: storagePath,
                user_id: userId,
                azure_original_filename: fileInfo.full_path,
                source_container: fileInfo.source_folder || 'unknown',
                extracted_data: {
                  source: "azure_auto_fetch",
                  original_blob_path: fileInfo.full_path,
                  source_folder: fileInfo.source_folder,
                  auto_fetched_at: new Date().toISOString(),
                },
              })
              .select()
              .single();

            if (docError) {
              console.error(`   ❌ Document creation failed: ${docError.message}`);
              totalErrors++;
              continue;
            }

            console.log(`   ✅ Imported (doc: ${doc.id})`);
            totalProcessed++;
            
            allResults.push({
              userId,
              filename: fileInfo.name,
              status: "queued",
              documentId: doc.id,
            });
          } catch (error) {
            console.error(`   ❌ Error: ${(error instanceof Error ? error.message : String(error))}`);
            totalErrors++;
            allResults.push({
              userId,
              filename: fileInfo.name,
              status: "error",
              error: (error instanceof Error ? error.message : String(error)),
            });
          }
        }
      } catch (userError: any) {
        console.error(`   ❌ User processing error: ${userError.message}`);
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log(`✅ AUTO-FETCHER: Complete`);
    console.log(`   ✅ Processed: ${totalProcessed}`);
    console.log(`   ❌ Errors: ${totalErrors}`);
    console.log("=".repeat(60) + "\n");

    // Send heartbeat on success (fire and forget - non-blocking)
    const heartbeatUrl = process.env.CRON_HEARTBEAT_URL;
    if (heartbeatUrl) {
      fetch(heartbeatUrl).catch(() => {
        // Silently ignore heartbeat errors
      });
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${totalProcessed} files with ${totalErrors} errors`,
      processed: totalProcessed,
      errors: totalErrors,
      files: allResults,
    });
  } catch (error) {
    console.error("\n" + "=".repeat(60));
    console.error("❌ AUTO-FETCHER: Fatal error");
    console.error(`   ${error?.message || error}`);
    console.error("=".repeat(60) + "\n");
    return NextResponse.json(
      { error: (error instanceof Error ? error.message : String(error)) || "Failed to run auto-fetcher" },
      { status: 500 }
    );
  }
}

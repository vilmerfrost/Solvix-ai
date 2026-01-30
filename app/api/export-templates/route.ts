/**
 * Export Templates API
 * 
 * GET - List all templates for user
 * POST - Create new template
 * PUT - Update template
 * DELETE - Delete template
 */

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase";

async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );
  
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// GET - List templates
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const supabase = createServiceRoleClient();
    
    // Get user templates + system templates
    const { data: templates, error } = await supabase
      .from("export_templates")
      .select("*")
      .or(`user_id.eq.${user.id},is_system.eq.true`)
      .order("is_system", { ascending: false })
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Failed to fetch templates:", error);
      return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
    }
    
    return NextResponse.json({ templates: templates || [] });
  } catch (error) {
    console.error("Template GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create template
export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await req.json();
    const supabase = createServiceRoleClient();
    
    // Validate required fields
    if (!body.name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    
    // Validate format
    const validFormats = ["xlsx", "csv", "json"];
    if (body.format && !validFormats.includes(body.format)) {
      return NextResponse.json({ error: "Invalid format" }, { status: 400 });
    }
    
    // Create template
    const { data: template, error } = await supabase
      .from("export_templates")
      .insert({
        user_id: user.id,
        name: body.name,
        description: body.description || null,
        columns: body.columns || [],
        format: body.format || "xlsx",
        include_headers: body.include_headers !== false,
        include_totals: body.include_totals !== false,
        is_default: false,
        is_system: false,
      })
      .select()
      .single();
    
    if (error) {
      console.error("Failed to create template:", error);
      return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
    }
    
    return NextResponse.json({ template });
  } catch (error) {
    console.error("Template POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT - Update template
export async function PUT(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await req.json();
    
    if (!body.id) {
      return NextResponse.json({ error: "Template ID is required" }, { status: 400 });
    }
    
    const supabase = createServiceRoleClient();
    
    // Check if trying to edit system template
    const { data: existing } = await supabase
      .from("export_templates")
      .select("is_system")
      .eq("id", body.id)
      .single();
    
    if (existing?.is_system) {
      return NextResponse.json({ error: "Cannot edit system templates" }, { status: 403 });
    }
    
    // Build update object
    const updates: Record<string, any> = {};
    
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.columns !== undefined) updates.columns = body.columns;
    if (body.format !== undefined) updates.format = body.format;
    if (body.include_headers !== undefined) updates.include_headers = body.include_headers;
    if (body.include_totals !== undefined) updates.include_totals = body.include_totals;
    
    // Handle setting as default
    if (body.is_default === true) {
      // First, unset all other defaults for this user
      await supabase
        .from("export_templates")
        .update({ is_default: false })
        .eq("user_id", user.id);
      
      updates.is_default = true;
    }
    
    const { data: template, error } = await supabase
      .from("export_templates")
      .update(updates)
      .eq("id", body.id)
      .eq("user_id", user.id)
      .select()
      .single();
    
    if (error) {
      console.error("Failed to update template:", error);
      return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
    }
    
    return NextResponse.json({ template });
  } catch (error) {
    console.error("Template PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Delete template
export async function DELETE(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { searchParams } = new URL(req.url);
    const templateId = searchParams.get("id");
    
    if (!templateId) {
      return NextResponse.json({ error: "Template ID is required" }, { status: 400 });
    }
    
    const supabase = createServiceRoleClient();
    
    // Check if system template
    const { data: existing } = await supabase
      .from("export_templates")
      .select("is_system")
      .eq("id", templateId)
      .single();
    
    if (existing?.is_system) {
      return NextResponse.json({ error: "Cannot delete system templates" }, { status: 403 });
    }
    
    const { error } = await supabase
      .from("export_templates")
      .delete()
      .eq("id", templateId)
      .eq("user_id", user.id);
    
    if (error) {
      console.error("Failed to delete template:", error);
      return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Template DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

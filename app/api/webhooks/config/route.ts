/**
 * Webhook Configuration API
 * 
 * GET - List all webhooks for user
 * POST - Create new webhook
 * PUT - Update webhook
 * DELETE - Delete webhook
 */

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase";
import { testWebhook, WEBHOOK_EVENTS } from "@/lib/webhooks";
import crypto from "crypto";

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

// GET - List webhooks
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const supabase = createServiceRoleClient();
    
    const { data: webhooks, error } = await supabase
      .from("webhooks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Failed to fetch webhooks:", error);
      return NextResponse.json({ error: "Failed to fetch webhooks" }, { status: 500 });
    }
    
    return NextResponse.json({ webhooks: webhooks || [] });
  } catch (error) {
    console.error("Webhook GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create or test webhook
export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await req.json();
    const supabase = createServiceRoleClient();
    
    // Handle test request
    if (body.action === "test" && body.webhookId) {
      const result = await testWebhook(body.webhookId, user.id);
      return NextResponse.json(result);
    }
    
    // Validate required fields
    if (!body.url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }
    
    // Validate URL format
    try {
      new URL(body.url);
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }
    
    // Validate events
    const events = body.events || [];
    const validEvents = events.filter((e: string) => WEBHOOK_EVENTS.includes(e as any));
    
    // Generate secret if requested
    let secret = body.secret;
    if (body.generateSecret) {
      secret = crypto.randomBytes(32).toString("hex");
    }
    
    // Create webhook
    const { data: webhook, error } = await supabase
      .from("webhooks")
      .insert({
        user_id: user.id,
        name: body.name || "Ny webhook",
        url: body.url,
        secret,
        events: validEvents,
        is_active: body.is_active !== false,
      })
      .select()
      .single();
    
    if (error) {
      console.error("Failed to create webhook:", error);
      return NextResponse.json({ error: "Failed to create webhook" }, { status: 500 });
    }
    
    return NextResponse.json({ webhook });
  } catch (error) {
    console.error("Webhook POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT - Update webhook
export async function PUT(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await req.json();
    
    if (!body.id) {
      return NextResponse.json({ error: "Webhook ID is required" }, { status: 400 });
    }
    
    const supabase = createServiceRoleClient();
    
    // Build update object
    const updates: Record<string, any> = {};
    
    if (body.name !== undefined) updates.name = body.name;
    if (body.url !== undefined) {
      try {
        new URL(body.url);
        updates.url = body.url;
      } catch {
        return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
      }
    }
    if (body.secret !== undefined) updates.secret = body.secret;
    if (body.events !== undefined) {
      updates.events = body.events.filter((e: string) => WEBHOOK_EVENTS.includes(e as any));
    }
    if (body.is_active !== undefined) updates.is_active = body.is_active;
    
    // Generate new secret if requested
    if (body.regenerateSecret) {
      updates.secret = crypto.randomBytes(32).toString("hex");
    }
    
    const { data: webhook, error } = await supabase
      .from("webhooks")
      .update(updates)
      .eq("id", body.id)
      .eq("user_id", user.id)
      .select()
      .single();
    
    if (error) {
      console.error("Failed to update webhook:", error);
      return NextResponse.json({ error: "Failed to update webhook" }, { status: 500 });
    }
    
    return NextResponse.json({ webhook });
  } catch (error) {
    console.error("Webhook PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Delete webhook
export async function DELETE(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { searchParams } = new URL(req.url);
    const webhookId = searchParams.get("id");
    
    if (!webhookId) {
      return NextResponse.json({ error: "Webhook ID is required" }, { status: 400 });
    }
    
    const supabase = createServiceRoleClient();
    
    const { error } = await supabase
      .from("webhooks")
      .delete()
      .eq("id", webhookId)
      .eq("user_id", user.id);
    
    if (error) {
      console.error("Failed to delete webhook:", error);
      return NextResponse.json({ error: "Failed to delete webhook" }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

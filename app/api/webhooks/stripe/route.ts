/**
 * Stripe Webhook Handler
 * Processes subscription events from Stripe
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";

// Raw body parser for Stripe webhook verification
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event: any;

  try {
    // Verify webhook signature
    const Stripe = require("stripe");
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  // IDEMPOTENCY CHECK: Prevent duplicate event processing
  // Stripe may retry webhooks, so we track processed events
  try {
    const { data: existingEvent } = await supabase
      .from("webhook_events")
      .select("id")
      .eq("stripe_event_id", event.id)
      .single();

    if (existingEvent) {
      console.log(`Webhook event ${event.id} already processed, skipping`);
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Record this event as being processed
    await supabase
      .from("webhook_events")
      .insert({
        stripe_event_id: event.id,
        event_type: event.type,
        processed_at: new Date().toISOString(),
      });
  } catch (idempotencyError) {
    // If the webhook_events table doesn't exist, log warning but continue
    // This allows the webhook to work even if the table hasn't been created yet
    console.warn("Idempotency check failed (table may not exist):", idempotencyError);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const planId = session.metadata?.planId;
        const customerId = session.customer;
        const subscriptionId = session.subscription;
        const paymentIntentId = session.payment_intent;

        if (userId && customerId) {
          // Check if this is a one-time payment (Enterprise) or subscription (Pro)
          const isOneTimePayment = !subscriptionId && paymentIntentId;

          if (isOneTimePayment && planId === "enterprise") {
            // One-time Enterprise/White-label purchase - lifetime access
            await supabase
              .from("subscriptions")
              .upsert({
                user_id: userId,
                stripe_customer_id: customerId,
                stripe_payment_intent_id: paymentIntentId,
                plan: "enterprise",
                status: "lifetime",
                is_lifetime: true,
                updated_at: new Date().toISOString(),
              }, {
                onConflict: "user_id",
              });
          } else {
            // Regular subscription (Pro plan)
            await supabase
              .from("subscriptions")
              .upsert({
                user_id: userId,
                stripe_customer_id: customerId,
                stripe_subscription_id: subscriptionId,
                plan: planId || "pro",
                status: "active",
                updated_at: new Date().toISOString(),
              }, {
                onConflict: "user_id",
              });
          }
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        // Find user by customer ID
        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (existingSub) {
          // Map Stripe status to our status
          let status = subscription.status;
          if (status === "incomplete" || status === "incomplete_expired") {
            status = "past_due";
          }

          // Map price to plan
          let plan = "pro";
          const priceId = subscription.items?.data?.[0]?.price?.id;
          if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) {
            plan = "enterprise";
          }

          await supabase
            .from("subscriptions")
            .update({
              stripe_subscription_id: subscription.id,
              stripe_price_id: priceId,
              plan,
              status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
              trial_start: subscription.trial_start 
                ? new Date(subscription.trial_start * 1000).toISOString() 
                : null,
              trial_end: subscription.trial_end 
                ? new Date(subscription.trial_end * 1000).toISOString() 
                : null,
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_customer_id", customerId);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        // Don't downgrade lifetime Enterprise users
        await supabase
          .from("subscriptions")
          .update({
            plan: "free",
            status: "canceled",
            stripe_subscription_id: null,
            stripe_price_id: null,
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId)
          .eq("is_lifetime", false); // Only cancel non-lifetime subscriptions
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        await supabase
          .from("subscriptions")
          .update({
            status: "past_due",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        // Reactivate subscription if it was past_due
        await supabase
          .from("subscriptions")
          .update({
            status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId)
          .eq("status", "past_due");
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 });
  }
}

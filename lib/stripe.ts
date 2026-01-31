/**
 * Stripe Integration
 * Handles subscription management and billing
 */

// NOTE: Install stripe package: npm install stripe

import { createServiceRoleClient } from "./supabase";

// Subscription plans
// BYOK model - users bring their own API keys for AI providers
// Platform fee covers: infrastructure, support, and features
export const PLANS = {
  starter: {
    id: "starter",
    name: "Starter",
    nameSv: "Starter",
    price: 49, // ~49 USD
    priceSek: 499,
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID,
    features: {
      documentsPerMonth: 50,
      models: ["gemini-3-flash", "gpt-5.2-chat", "claude-haiku-4.5"],
      support: "email",
      customInstructions: false,
      priority: false,
      azureIntegration: false,
      excelExport: true,
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    nameSv: "Pro",
    price: 199, // ~199 USD
    priceSek: 1990,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID,
    features: {
      documentsPerMonth: "unlimited",
      models: ["all"],
      support: "email",
      customInstructions: true,
      priority: true,
      azureIntegration: true,
      excelExport: true,
    },
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise / Whitelabel",
    nameSv: "Enterprise / Whitelabel",
    price: 2000, // ~2000 USD one-time
    priceSek: 20000,
    isOneTime: true, // One-time fee, not subscription
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    features: {
      documentsPerMonth: "unlimited",
      models: ["all"],
      support: "priority",
      customInstructions: true,
      priority: true,
      sla: true,
      dedicatedSupport: true,
      whitelabel: true,
      selfHosted: true,
      sourceCode: true,
    },
  },
} as const;

export type PlanId = keyof typeof PLANS | "trial";

// Trial plan for new users (not available for purchase)
export const TRIAL_PLAN = {
  id: "trial",
  name: "Trial",
  nameSv: "Provperiod",
  price: 0,
  priceSek: 0,
  features: {
    documentsPerMonth: 10,
    models: ["gemini-3-flash"],
    support: "email",
    customInstructions: false,
    priority: false,
  },
};

interface CustomerCreateParams {
  email: string;
  metadata?: Record<string, string>;
}

interface CheckoutSessionCreateParams {
  customer?: string;
  mode: 'payment' | 'subscription' | 'setup';
  line_items?: Array<{
    price: string;
    quantity?: number;
  }>;
  success_url: string;
  cancel_url: string;
  metadata?: Record<string, string>;
}

interface BillingPortalSessionCreateParams {
  customer: string;
  return_url: string;
}

interface StripeClient {
  customers: {
    create: (params: CustomerCreateParams) => Promise<{ id: string }>;
  };
  checkout: {
    sessions: {
      create: (params: CheckoutSessionCreateParams) => Promise<{ url: string }>;
    };
  };
  billingPortal: {
    sessions: {
      create: (params: BillingPortalSessionCreateParams) => Promise<{ url: string }>;
    };
  };
}

/**
 * Get Stripe client (lazy initialization)
 */
function getStripeClient(): StripeClient | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.warn("STRIPE_SECRET_KEY not configured");
    return null;
  }

  try {
    const Stripe = require("stripe");
    return new Stripe(secretKey, {
      apiVersion: "2023-10-16",
    });
  } catch {
    console.warn("Stripe package not installed");
    return null;
  }
}

/**
 * Get or create Stripe customer for user
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string
): Promise<string | null> {
  const supabase = createServiceRoleClient();
  const stripe = getStripeClient();
  
  if (!stripe) return null;

  // Check if user already has a customer ID
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .single();

  if (subscription?.stripe_customer_id) {
    return subscription.stripe_customer_id;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    metadata: {
      userId,
    },
  });

  // Save customer ID
  await supabase
    .from("subscriptions")
    .upsert({
      user_id: userId,
      stripe_customer_id: customer.id,
      plan: "free",
      status: "active",
    }, {
      onConflict: "user_id",
    });

  return customer.id;
}

/**
 * Create checkout session for subscription
 */
export async function createCheckoutSession(
  userId: string,
  email: string,
  planId: PlanId
): Promise<string | null> {
  const stripe = getStripeClient();
  if (!stripe) return null;

  const plan = PLANS[planId];
  if (!plan || !("stripePriceId" in plan) || !plan.stripePriceId) {
    throw new Error("Invalid plan or price not configured");
  }

  const customerId = await getOrCreateStripeCustomer(userId, email);
  if (!customerId) {
    throw new Error("Failed to create customer");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: plan.stripePriceId,
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/settings/billing?success=true`,
    cancel_url: `${appUrl}/pricing?canceled=true`,
    metadata: {
      userId,
      planId,
    },
  });

  return session.url;
}

/**
 * Create billing portal session
 */
export async function createBillingPortalSession(
  userId: string
): Promise<string | null> {
  const supabase = createServiceRoleClient();
  const stripe = getStripeClient();
  
  if (!stripe) return null;

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .single();

  if (!subscription?.stripe_customer_id) {
    throw new Error("No subscription found");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${appUrl}/settings/billing`,
  });

  return session.url;
}

/**
 * Get user subscription
 */
export async function getSubscription(userId: string) {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    // Return trial plan if no subscription
    return {
      plan: "trial" as PlanId,
      status: "active",
      currentPeriodEnd: null,
    };
  }

  return {
    plan: (data.plan || "trial") as PlanId,
    status: data.status,
    currentPeriodEnd: data.current_period_end,
    cancelAtPeriodEnd: data.cancel_at_period_end,
  };
}

/**
 * Get plan details (handles both paid plans and trial)
 */
function getPlanDetails(planId: PlanId) {
  if (planId === "trial") return TRIAL_PLAN;
  return PLANS[planId as keyof typeof PLANS] || TRIAL_PLAN;
}

/**
 * Check if user has access to a feature
 */
export async function hasFeatureAccess(
  userId: string,
  feature: string
): Promise<boolean> {
  const subscription = await getSubscription(userId);
  const plan = getPlanDetails(subscription.plan);

  if (!plan) return false;

  // Check specific features
  switch (feature) {
    case "customInstructions":
      return "customInstructions" in plan.features && plan.features.customInstructions === true;
    case "priority":
      return "priority" in plan.features && plan.features.priority === true;
    case "allModels":
      return plan.features.models === "all" || (Array.isArray(plan.features.models) && plan.features.models.includes("all"));
    default:
      return subscription.plan !== "trial";
  }
}

/**
 * Check if user is within document limit
 */
export async function canProcessDocument(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  limit?: number | string;
  used?: number;
}> {
  const supabase = createServiceRoleClient();
  const subscription = await getSubscription(userId);
  const plan = getPlanDetails(subscription.plan);

  if (!plan) {
    return { allowed: false, reason: "Invalid plan" };
  }

  const limit = plan.features.documentsPerMonth;
  
  // Unlimited
  if (limit === "unlimited") {
    return { allowed: true };
  }

  // Count documents processed this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("usage_tracking")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("success", true)
    .gte("created_at", startOfMonth.toISOString());

  const used = count || 0;

  if (used >= (limit as number)) {
    return {
      allowed: false,
      reason: "Monthly document limit reached. Upgrade to Pro for unlimited documents.",
      limit,
      used,
    };
  }

  return { allowed: true, limit, used };
}

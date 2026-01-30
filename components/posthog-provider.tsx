"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Only initialize PostHog in production
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

    if (!posthogKey) {
      console.warn("PostHog key not configured - analytics disabled");
      return;
    }

    posthog.init(posthogKey, {
      api_host: posthogHost || "https://eu.i.posthog.com",
      // Capture pageviews automatically
      capture_pageview: true,
      // Capture pageleaves for session duration
      capture_pageleave: true,
      // Respect Do Not Track
      respect_dnt: true,
      // Disable in development
      loaded: (posthog) => {
        if (process.env.NODE_ENV !== "production") {
          posthog.opt_out_capturing();
        }
      },
    });
  }, []);

  // In development, just render children without PostHog context
  if (process.env.NODE_ENV !== "production") {
    return <>{children}</>;
  }

  return <PHProvider client={posthog}>{children}</PHProvider>;
}

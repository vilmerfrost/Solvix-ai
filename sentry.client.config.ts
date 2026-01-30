// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring - 10% sample rate to stay within free tier
  tracesSampleRate: 0.1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Session Replay configuration (optimized for free tier)
  // Disable random session recordings to save quota
  replaysSessionSampleRate: 0.0,
  // Only record replays when an error occurs (captures context for debugging)
  replaysOnErrorSampleRate: 1.0,

  // Only initialize replay integration if DSN is configured
  integrations: process.env.NEXT_PUBLIC_SENTRY_DSN
    ? [
        Sentry.replayIntegration({
          // Mask all text for privacy
          maskAllText: true,
          // Block all media for smaller payloads
          blockAllMedia: true,
        }),
      ]
    : [],
});

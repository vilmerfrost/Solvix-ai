"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

interface UserFeatures {
  industry: string;
  features: Record<string, boolean>;
  hiddenFields: string[];
  loading: boolean;
}

/**
 * Hook to get the current user's industry features
 * Used to conditionally show/hide UI elements
 */
export function useFeatures(): UserFeatures {
  const [state, setState] = useState<UserFeatures>({
    industry: "general",
    features: {},
    hiddenFields: [],
    loading: true,
  });

  useEffect(() => {
    async function load() {
      try {
        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          setState((prev) => ({ ...prev, loading: false }));
          return;
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setState((prev) => ({ ...prev, loading: false }));
          return;
        }

        const { data: settings } = await supabase
          .from("settings")
          .select("industry, features_enabled")
          .eq("user_id", user.id)
          .single();

        if (settings) {
          const { getHiddenFields } = await import("@/config/industries");
          setState({
            industry: settings.industry || "general",
            features: settings.features_enabled || {},
            hiddenFields: getHiddenFields(settings.industry || "general"),
            loading: false,
          });
        } else {
          setState((prev) => ({ ...prev, loading: false }));
        }
      } catch {
        setState((prev) => ({ ...prev, loading: false }));
      }
    }

    load();
  }, []);

  return state;
}

/**
 * Helper to check if a specific feature is enabled
 */
export function useFeatureEnabled(featureKey: string): boolean {
  const { features, loading } = useFeatures();
  if (loading) return false;
  return features[featureKey] ?? false;
}

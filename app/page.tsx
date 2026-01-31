// Server-side authentication check
export const dynamic = "force-dynamic";

import { getAuthUser } from "@/lib/auth";
import { LandingPage } from "@/components/landing-page";

export default async function Home() {
  const user = await getAuthUser();
  // No redirect - always show landing page, but pass user state
  return <LandingPage user={user} />;
}

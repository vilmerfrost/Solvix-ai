"use client";

import { useState, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Mail, Lock, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#f25022" d="M1 1h10v10H1z" />
      <path fill="#00a4ef" d="M1 13h10v10H1z" />
      <path fill="#7fba00" d="M13 1h10v10H13z" />
      <path fill="#ffb900" d="M13 13h10v10H13z" />
    </svg>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const message = searchParams.get("message");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(message);

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return createBrowserClient(url, key);
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) { setError("Konfigurationsfel"); return; }
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message === "Invalid login credentials" ? "Fel e-post eller lösenord" : error.message);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  };

  const handleOAuthLogin = async (provider: "google" | "azure") => {
    if (!supabase) { setError("Konfigurationsfel"); return; }
    setSocialLoading(provider);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setError(error.message); setSocialLoading(null); }
  };

  const handleMagicLink = async () => {
    if (!supabase) { setError("Konfigurationsfel"); return; }
    if (!email) { setError("Ange din e-postadress först"); return; }
    setSocialLoading("magic");
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setError(error.message); setSocialLoading(null); return; }
    alert("Kolla din e-post för en inloggningslänk!");
    setSocialLoading(null);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden font-[family-name:var(--font-inter)]">
      {/* Left Side: Brand & Visuals */}
      <div className="hidden md:flex md:w-1/2 bg-[#f8f9fa] relative flex-col justify-between p-12 lg:p-16 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -translate-x-1/2" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-300/20 rounded-full blur-3xl translate-x-1/3" />
          <div className="absolute inset-0 flex items-center justify-center opacity-40">
            <div className="relative w-[500px] h-[500px]">
              <div className="absolute top-10 left-10 w-48 h-64 bg-white/60 border border-white/40 backdrop-blur-sm rounded-xl -rotate-12 shadow-lg z-10" />
              <div className="absolute top-20 left-24 w-48 h-64 bg-indigo-500/20 border border-indigo-500/10 backdrop-blur-md rounded-xl rotate-6 shadow-xl z-20 flex items-center justify-center">
                <svg className="w-16 h-16 text-indigo-500/40" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md">
            <span className="text-sm font-bold text-white">S</span>
          </div>
          <span className="text-2xl font-bold tracking-tight text-slate-900">Solvix.AI</span>
        </div>

        {/* Tagline */}
        <div className="relative z-10 mt-auto mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold leading-tight mb-4 text-slate-800">
            Smartare dokumenthantering.
          </h2>
          <p className="text-lg text-slate-500 max-w-md">
            Automatiserad dokumenthantering med AI som frigör tid för det som verkligen spelar roll.
          </p>
        </div>

        {/* Social proof */}
        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Betrodd av 500+ företag</p>
          <div className="flex gap-8 opacity-50 grayscale">
            <div className="h-8 w-24 bg-slate-300 rounded" />
            <div className="h-8 w-24 bg-slate-300 rounded" />
            <div className="h-8 w-24 bg-slate-300 rounded" />
          </div>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="w-full md:w-1/2 bg-white flex flex-col justify-center items-center p-6 md:p-12 lg:p-24 overflow-y-auto">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="flex md:hidden items-center gap-2 mb-8 justify-center">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-sm font-bold text-white">S</span>
            </div>
            <span className="text-xl font-bold text-slate-900">Solvix.AI</span>
          </div>

          {/* Header */}
          <div className="text-center md:text-left">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Välkommen tillbaka</h1>
            <p className="mt-2 text-slate-500">Logga in på ditt konto</p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleEmailLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">E-postadress</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="namn@foretag.se" required
                className="block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-700">Lösenord</label>
                <Link href="/forgot-password" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
                  Glömt lösenord?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  className="block w-full px-4 py-3 pr-10 border border-slate-300 rounded-lg shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-colors"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex justify-center py-3 px-4 rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? <><Loader2 className="w-5 h-5 animate-spin mr-2" />Loggar in...</> : "Logga in"}
            </button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-500">eller</span>
            </div>
          </div>

          {/* Social logins */}
          <div className="space-y-3">
            <button onClick={() => handleOAuthLogin("google")} disabled={!!socialLoading}
              className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-slate-300 rounded-lg shadow-sm bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50">
              {socialLoading === "google" ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <span className="mr-2"><GoogleIcon /></span>}
              Logga in med Google
            </button>
            <button onClick={() => handleOAuthLogin("azure")} disabled={!!socialLoading}
              className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-slate-300 rounded-lg shadow-sm bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50">
              {socialLoading === "azure" ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <span className="mr-2"><MicrosoftIcon /></span>}
              Logga in med Microsoft
            </button>
          </div>

          {/* Magic link */}
          <button onClick={handleMagicLink} disabled={!!socialLoading}
            className="w-full text-sm text-slate-500 hover:text-indigo-600 transition-colors disabled:opacity-50">
            {socialLoading === "magic" ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Skickar...</span> : "Skicka inloggningslänk via e-post"}
          </button>

          {/* Footer */}
          <p className="text-center text-sm text-slate-500">
            Har du inget konto?{" "}
            <Link href="/signup" className="font-medium text-indigo-600 hover:text-indigo-700">Skapa konto</Link>
          </p>

          <p className="text-center text-xs text-slate-400">
            Genom att logga in godkänner du våra{" "}
            <Link href="/terms" className="underline hover:text-slate-600">villkor</Link>{" "}och{" "}
            <Link href="/privacy" className="underline hover:text-slate-600">integritetspolicy</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function LoginPageLoading() {
  return (
    <div className="flex h-screen items-center justify-center bg-white">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageLoading />}>
      <LoginPageContent />
    </Suspense>
  );
}

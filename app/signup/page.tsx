"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Mail, Lock, User, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

// Social login icons
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

export default function SignupPage() {
  const router = useRouter();
  
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Lazy initialize Supabase client - only when env vars are available
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return createBrowserClient(url, key);
  }, []);

  const handleOAuthSignup = async (provider: "google" | "azure") => {
    if (!supabase) {
      setError("Konfigurationsfel - försök igen senare");
      return;
    }
    setSocialLoading(provider);
    setError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError((error instanceof Error ? error.message : String(error)));
      setSocialLoading(null);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError("Konfigurationsfel - försök igen senare");
      return;
    }
    setLoading(true);
    setError(null);

    // Validation
    if (password !== confirmPassword) {
      setError("Lösenorden matchar inte");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Lösenordet måste vara minst 8 tecken");
      setLoading(false);
      return;
    }

    if (!acceptTerms) {
      setError("Du måste godkänna villkoren");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      if ((error instanceof Error ? error.message : String(error)).includes("already registered")) {
        setError("Denna e-postadress är redan registrerad");
      } else {
        setError((error instanceof Error ? error.message : String(error)));
      }
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50/30 via-slate-50 to-white flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-slate-200 p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-50 rounded-full mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Kolla din e-post!</h2>
            <p className="text-slate-500 mb-6">
              Vi har skickat en bekräftelselänk till <strong className="text-slate-700">{email}</strong>. 
              Klicka på länken för att aktivera ditt konto.
            </p>
            <Link href="/login" className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
              Tillbaka till inloggning
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden font-[family-name:var(--font-inter)]">
      {/* Left: Brand Panel */}
      <div className="hidden md:flex md:w-1/2 relative flex-col justify-between p-12 bg-gradient-to-br from-indigo-50 via-white to-slate-50 overflow-hidden">
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">S</div>
          <span className="font-bold text-xl tracking-tight text-slate-900">Solvix.AI</span>
        </div>
        <div className="relative flex-1 flex items-center justify-center">
          <div className="absolute w-64 h-64 bg-indigo-100/50 rounded-full blur-3xl -top-20 -left-20" />
          <div className="absolute w-96 h-96 bg-indigo-50/80 rounded-full blur-3xl bottom-0 right-0" />
          <div className="relative z-10 text-center max-w-sm">
            <div className="mb-8 flex justify-center">
              <div className="bg-white/60 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/40 transform -rotate-3">
                <User className="w-12 h-12 text-indigo-500 mb-3" />
                <div className="h-2 w-28 bg-indigo-200/50 rounded mb-2" />
                <div className="h-2 w-20 bg-indigo-100/50 rounded" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Effektivisera din dokumenthantering med AI</h2>
            <p className="text-slate-500 text-sm">Automatisera dataextraktion och arbetsflöden med nästa generations språkmodeller.</p>
          </div>
        </div>
        <div className="relative z-10">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest mb-4">Betrodd av ledande företag</p>
          <div className="flex gap-6 opacity-30">
            {[1,2,3,4].map(i => <div key={i} className="w-16 h-6 bg-slate-300 rounded" />)}
          </div>
        </div>
      </div>

      {/* Right: Signup Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-md space-y-6">
          <div className="md:hidden flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">S</div>
            <span className="text-xl font-bold tracking-tight text-slate-900">Solvix.AI</span>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Skapa ditt konto</h1>
            <p className="text-slate-500 mt-1">Börja din resa mot automatiserad dokumenthantering.</p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* OAuth */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => handleOAuthSignup("google")} disabled={!!socialLoading} type="button"
              className="flex items-center justify-center gap-2.5 px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 text-sm font-medium text-slate-700">
              {socialLoading === "google" ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon />}
              Google
            </button>
            <button onClick={() => handleOAuthSignup("azure")} disabled={!!socialLoading} type="button"
              className="flex items-center justify-center gap-2.5 px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 text-sm font-medium text-slate-700">
              {socialLoading === "azure" ? <Loader2 className="w-4 h-4 animate-spin" /> : <MicrosoftIcon />}
              Microsoft
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
            <div className="relative flex justify-center text-xs"><span className="px-3 bg-white text-slate-400 uppercase tracking-widest font-medium">eller</span></div>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Namn</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ditt fullständiga namn" required
                className="w-full px-4 py-3 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">E-post</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="namn@företag.se" required
                className="w-full px-4 py-3 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Lösenord</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minst 8 tecken" required minLength={8}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Bekräfta lösenord</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Upprepa ditt lösenord" required
                className="w-full px-4 py-3 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all" />
            </div>

            <div className="flex items-start gap-3 pt-1">
              <input type="checkbox" id="terms" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-1 w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500" />
              <label htmlFor="terms" className="text-sm text-slate-500">
                Jag godkänner <Link href="/terms" className="text-indigo-600 hover:underline">användarvillkoren</Link> och <Link href="/privacy" className="text-indigo-600 hover:underline">integritetspolicyn</Link>.
              </label>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? (<><Loader2 className="w-5 h-5 animate-spin" /> Skapar konto...</>) : "Skapa konto"}
            </button>
          </form>

          <div className="text-center">
            <p className="text-sm text-slate-500">
              Redan har ett konto? <Link href="/login" className="font-semibold text-indigo-600 hover:underline">Logga in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

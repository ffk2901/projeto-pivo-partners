"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      if (from) {
        router.push(from);
      } else if (data.user.role === "admin") {
        router.push("/");
      } else {
        router.push("/portal");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-surface-0 rounded-2xl shadow-xl p-6 space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs text-ink-400 uppercase tracking-wide mb-1.5">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
          className="w-full border border-brand-200 rounded-xl px-4 py-2.5 text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 text-ink-800 placeholder:text-ink-300"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label className="block text-xs text-ink-400 uppercase tracking-wide mb-1.5">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full border border-brand-200 rounded-xl px-4 py-2.5 text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 text-ink-800 placeholder:text-ink-300"
          placeholder="Enter your password"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 text-sm font-medium bg-brand-500 text-white rounded-xl hover:bg-brand-600 disabled:opacity-50 transition-colors shadow-sm"
      >
        {loading ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-brand-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-brand-100 tracking-tight">Pivo Partners</h1>
          <p className="text-sm text-brand-400 mt-1">Fundraising CRM</p>
        </div>
        <Suspense fallback={
          <div className="bg-surface-0 rounded-2xl shadow-xl p-6 animate-pulse space-y-4">
            <div className="h-10 bg-brand-200/40 rounded-xl"></div>
            <div className="h-10 bg-brand-200/40 rounded-xl"></div>
            <div className="h-10 bg-brand-200/40 rounded-xl"></div>
          </div>
        }>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}

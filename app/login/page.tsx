"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { LockKeyhole, LogIn, Mail } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password");
    } else if (result?.ok) {
      router.push(callbackUrl);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ebony-50 px-4 py-8">
      <Card className="w-full max-w-md overflow-hidden border-ebony-200 shadow-luxury hover:shadow-luxury">
        <div className="h-1.5 bg-gold-600" />
        <CardHeader className="border-b-0 px-7 pb-2 pt-7 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gold-100 text-gold-700">
            <LockKeyhole className="h-6 w-6" aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl text-ebony-900">JewelPack Login</CardTitle>
          <CardDescription className="text-ebony-600">Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent className="px-7 pb-7 pt-4">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-medium text-ebony-700">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ebony-400" aria-hidden="true" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@jewelpack.com"
                  className="h-11 w-full rounded-lg border border-ebony-200 bg-white pl-10 pr-4 text-sm outline-none transition-all focus:border-gold-500 focus:ring-2 focus:ring-gold-400/30"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-ebony-700">Password</label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ebony-400" aria-hidden="true" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="h-11 w-full rounded-lg border border-ebony-200 bg-white pl-10 pr-4 text-sm outline-none transition-all focus:border-gold-500 focus:ring-2 focus:ring-gold-400/30"
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gold-600 px-4 text-sm font-semibold text-white transition-all hover:bg-gold-700 disabled:cursor-not-allowed disabled:bg-gold-100 disabled:text-gold-700"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              {loading ? "Signing in..." : "Sign In"}
            </button>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-ebony-50 p-4">
          <Card className="w-full max-w-md border-ebony-200 shadow-luxury">
            <CardContent>
              <div className="py-8 text-center text-sm text-ebony-600">Loading...</div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

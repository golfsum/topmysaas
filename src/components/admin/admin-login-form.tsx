"use client";

import { FirebaseError } from "firebase/app";
import {
  inMemoryPersistence,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import {
  getFirebaseAuth,
  isFirebaseClientConfigured,
} from "@/lib/firebase-client";

import { AdminLogo } from "./admin-logo";

function getLoginErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/invalid-credential":
      case "auth/invalid-email":
      case "auth/user-disabled":
      case "auth/user-not-found":
      case "auth/wrong-password":
        return "The email or password is incorrect. Use the email attached to your Firebase admin account.";
      case "auth/too-many-requests":
        return "Too many sign-in attempts. Wait a moment and try again.";
      case "auth/network-request-failed":
        return "The sign-in service could not be reached. Check your connection.";
      default:
        return "Sign-in failed. Check your credentials and try again.";
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Sign-in failed. Try again.";
}

async function readApiError(response: Response): Promise<string> {
  const fallback = "The secure session could not be created.";

  try {
    const body = (await response.json()) as {
      error?: string;
      message?: string;
    };
    return body.error ?? body.message ?? fallback;
  } catch {
    return fallback;
  }
}

export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    isFirebaseClientConfigured
      ? null
      : "Firebase Authentication is not configured for this environment.",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || !isFirebaseClientConfigured) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const auth = getFirebaseAuth();
      await setPersistence(auth, inMemoryPersistence);
      const credential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );
      const idToken = await credential.user.getIdToken(true);

      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      await signOut(auth).catch(() => undefined);
      router.replace("/admin");
      router.refresh();
    } catch (loginError) {
      setError(getLoginErrorMessage(loginError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-screen overflow-hidden bg-[#070909] px-4 py-6 text-zinc-100 sm:px-6 lg:px-8">
      <div
        className="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(circle_at_18%_12%,rgba(103,232,95,0.10),transparent_28%),radial-gradient(circle_at_82%_88%,rgba(103,232,95,0.06),transparent_25%)]"
        aria-hidden="true"
      />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col">
        <header className="flex items-center justify-between">
          <AdminLogo />
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/10 px-4 text-sm font-medium text-zinc-300 transition hover:border-white/20 hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#67e85f]"
          >
            View leaderboard
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </header>

        <section className="flex flex-1 items-center justify-center py-12 sm:py-16">
          <div className="w-full max-w-md">
            <div className="mb-7 text-center">
              <span className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#67e85f]/20 bg-[#67e85f]/10 text-[#8af383] shadow-[0_0_32px_rgba(103,232,95,0.10)]">
                <LockKeyhole className="h-5 w-5" aria-hidden="true" />
              </span>
              <h1 className="text-3xl font-semibold tracking-[-0.035em] text-white">
                Admin sign in
              </h1>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                Use the authorized Firebase account to manage the live board.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-white/10 bg-[#0d1010]/95 p-5 shadow-2xl shadow-black/30 sm:p-7"
              noValidate
            >
              <div className="space-y-5">
                <label className="grid gap-2 text-sm font-medium text-zinc-200">
                  Email address
                  <input
                    type="email"
                    name="email"
                    autoComplete="username"
                    inputMode="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={isSubmitting || !isFirebaseClientConfigured}
                    className="min-h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-base text-white outline-none transition placeholder:text-zinc-600 hover:border-white/20 focus:border-[#67e85f]/70 focus:ring-3 focus:ring-[#67e85f]/10 disabled:cursor-not-allowed disabled:opacity-60"
                    placeholder="you@example.com"
                  />
                </label>

                <label className="grid gap-2 text-sm font-medium text-zinc-200">
                  Password
                  <input
                    type="password"
                    name="password"
                    autoComplete="current-password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={isSubmitting || !isFirebaseClientConfigured}
                    className="min-h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-base text-white outline-none transition placeholder:text-zinc-600 hover:border-white/20 focus:border-[#67e85f]/70 focus:ring-3 focus:ring-[#67e85f]/10 disabled:cursor-not-allowed disabled:opacity-60"
                    placeholder="Enter your password"
                  />
                </label>
              </div>

              {error ? (
                <div
                  className="mt-5 rounded-xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm leading-5 text-red-200"
                  role="alert"
                >
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  !isFirebaseClientConfigured ||
                  email.trim().length === 0 ||
                  password.length === 0
                }
                className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#67e85f] px-5 text-sm font-semibold text-[#10200e] transition hover:bg-[#7df175] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7df175] disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
              >
                {isSubmitting ? (
                  <>
                    <span
                      className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
                      aria-hidden="true"
                    />
                    Creating secure session
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </>
                )}
              </button>

              <p className="mt-5 flex items-center justify-center gap-2 text-center text-xs leading-5 text-zinc-500">
                <ShieldCheck className="h-4 w-4 text-[#67e85f]" aria-hidden="true" />
                Access is restricted to the configured admin UID.
              </p>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

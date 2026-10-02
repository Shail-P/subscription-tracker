import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { DashboardPage } from "./DashboardPage";

// Keep this in sync with electron/main.cjs and Supabase's allowed redirect URLs.
// Google's browser flow returns to Electron's local callback server at this address.
const AUTH_CALLBACK_URL = "http://127.0.0.1:57432/auth/callback";

export function LoginPage() {
  // A session contains the authenticated user and tokens; null displays the login page.
  const [session, setSession] = useState<Session | null>(null);
  // Wait for the saved session before choosing a page, avoiding a login flash.
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  // This tracks an OAuth attempt, not the initial restoration of a saved session.
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const client = supabase;
    if (!client) {
      setIsRestoringSession(false);
      return;
    }

    // Restore the locally persisted session so restarting the app does not require login.
    void client.auth.getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => setErrorMessage("Couldn’t restore your session. Please sign in again."))
      .finally(() => setIsRestoringSession(false));

    // Keep the rendered page in sync with sign-in, token refresh, and sign-out events.
    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    // The main process receives the browser redirect and forwards its URL through preload.
    // onCallback returns a function that removes this listener when the effect is cleaned up.
    const removeCallbackListener = window.electronAuth.onCallback(
      async (callbackUrl) => {
        const code = new URL(callbackUrl).searchParams.get("code");

        if (!code) {
          setErrorMessage(
            "Google did not return a sign-in code. Please try again.",
          );
          setIsLoading(false);
          return;
        }

        // Complete PKCE using the callback code and this client's saved code verifier.
        // A successful exchange triggers the auth listener above with the new session.
        const { error } = await client.auth.exchangeCodeForSession(code);
        setIsLoading(false);

        if (error) setErrorMessage(error.message);
      },
    );

    // Remove both subscriptions on unmount (and during development effect re-runs)
    // so old listeners do not process the same sign-in more than once.
    return () => {
      data.subscription.unsubscribe();
      removeCallbackListener();
    };
  }, []);

  async function handleGoogleLogin() {
    if (!supabase) {
      setErrorMessage(
        "Add your Supabase project URL and publishable key to .env.local first.",
      );
      return;
    }

    setErrorMessage("");
    setIsLoading(true);

    // Ask Supabase for the Google sign-in URL, without navigating the Electron renderer.
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: AUTH_CALLBACK_URL,
        skipBrowserRedirect: true,
      },
    });

    if (error || !data.url) {
      setErrorMessage(error?.message ?? "Unable to start Google sign-in.");
      setIsLoading(false);
      return;
    }

    // The preload bridge asks Electron to start the callback server and open the URL
    // in the system browser. Loading stays true until a callback or opening failure.
    try {
      await window.electronAuth.openOAuth(data.url);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to open Google sign-in.",
      );
      setIsLoading(false);
    }
  }

  // The auth-state listener updates session after a successful sign-out.
  async function handleSignOut() {
    setErrorMessage("");
    await supabase?.auth.signOut();
  }

  if (isRestoringSession) {
    return (
      <main className="motion-page grid min-h-[calc(100svh-2.5rem)] place-items-center bg-[#0f1115]" role="status" aria-label="Opening SubTrack">
        <span className="loading-spinner text-[#a8c7fa]" aria-hidden="true" />
      </main>
    );
  }

  // This conditional switches pages without a router. The user ID identifies database
  // ownership; the email is for display, and onSignOut lets the dashboard request logout.
  if (session) {
    return (
      <DashboardPage
        userId={session.user.id}
        userEmail={session.user.email ?? "Signed-in user"}
        onSignOut={handleSignOut}
      />
    );
  }

  return (
    <main className="motion-page grid min-h-[calc(100svh-2.5rem)] place-items-center bg-[#0f1115] px-4 py-8 sm:px-6">
      <section className="motion-card w-full max-w-md rounded-[28px] bg-[#1e1f20] px-6 py-9 sm:px-10 sm:py-11">
        <div className="text-center">
          <p className="text-sm font-medium text-[#a8c7fa]">SubTrack</p>
          <h1 className="mt-3 text-3xl font-normal tracking-tight text-white sm:text-4xl">
            Sign in
          </h1>
          <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-[#c4c7c5] sm:text-base">
            Keep your subscriptions and upcoming payments together.
          </p>
        </div>

        <button
          className="motion-button mt-9 flex min-h-12 w-full items-center justify-center gap-3 rounded-full bg-[#a8c7fa] px-5 py-3 text-sm font-medium text-[#062e6f] hover:bg-[#d3e3fd] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a8c7fa] disabled:cursor-wait disabled:opacity-60 sm:text-base"
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          aria-busy={isLoading}
        >
          {isLoading ? <span className="loading-spinner" aria-hidden="true" /> : <svg
            className="size-5 shrink-0"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              fill="#4285f4"
              d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"
            />
            <path
              fill="#34a853"
              d="M12 22c2.7 0 4.98-.9 6.63-2.36l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"
            />
            <path
              fill="#fbbc05"
              d="M6.39 13.93A6.02 6.02 0 0 1 6.07 12c0-.67.12-1.32.32-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.62.39 3.15 1.04 4.55l3.35-2.62Z"
            />
            <path
              fill="#ea4335"
              d="M12 5.94c1.47 0 2.79.51 3.83 1.5l2.87-2.88A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z"
            />
          </svg>}
          {isLoading ? "Opening Google…" : "Continue with Google"}
        </button>

        {/* Show setup, OAuth-start, or callback errors reported by the handlers above. */}
        {errorMessage && (
          <p
            className="motion-feedback mt-5 rounded-2xl bg-[#3c1f1f] px-4 py-3 text-center text-sm leading-5 text-[#f2b8b5]"
            role="alert"
          >
            {errorMessage}
          </p>
        )}

        {!isSupabaseConfigured && !errorMessage && (
          <p className="mt-5 text-center text-sm leading-5 text-[#ffb95c]">
            Supabase setup is required before sign-in can open.
          </p>
        )}

        <p className="mt-7 text-center text-xs leading-5 text-[#8e918f] sm:px-4">
          Sign in securely with your Google account.
        </p>
      </section>
    </main>
  );
}

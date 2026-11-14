// OAuth redirect target: Supabase lands here after Google/Facebook sign-in.
// We take the verified Supabase session, exchange it with the backend for the
// app's own JWT (the backend re-verifies the session server-side), then enter
// the app like any other logged-in user.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Spinner } from "flowbite-react";
import { supabase } from "../../lib/supabase";
import { setUserLocalStorage } from "../../auth/auth";

const serverUrl = import.meta.env.VITE_SERVER_URL?.replace(/\/+$/, "");
const apiBase = serverUrl ? `${serverUrl}/api` : "http://localhost:5000/api";

const OAuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const exchange = async () => {
      if (!supabase) {
        setError("Social sign-in is not configured.");
        return;
      }
      // The OAuth redirect delivers the session in the URL hash — waitFor it.
      const { data, error: sessionError } = await supabase.auth.getSession();
      const accessToken = data?.session?.access_token;

      if (sessionError || !accessToken) {
        if (!cancelled)
          setError(
            sessionError?.message || "Could not read the sign-in session."
          );
        return;
      }

      try {
        const res = await fetch(`${apiBase}/auth/oauth`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken }),
        });
        const json = await res.json().catch(() => null);
        const token = json?.data?.token;
        if (!res.ok || !token) {
          if (!cancelled)
            setError(json?.message || "Sign-in failed. Please try again.");
          return;
        }
        setUserLocalStorage(token);
        if (!cancelled) navigate("/", { replace: true });
      } catch {
        if (!cancelled) setError("Sign-in failed. Please try again.");
      }
    };

    exchange();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <section className="page flex items-center justify-center px-4 py-20">
      <div className="card max-w-md p-10 text-center">
        {error ? (
          <>
            <h1 className="text-lg font-bold text-ink">Sign-in problem</h1>
            <p className="mt-2 text-sm text-ink-dim">{error}</p>
            <a href="/login" className="btn btn-brand mt-5 inline-flex">
              Back to login
            </a>
          </>
        ) : (
          <>
            <Spinner size="lg" className="text-accent" />
            <p className="mt-4 text-sm text-ink-dim">
              Finishing sign-in…
            </p>
          </>
        )}
      </div>
    </section>
  );
};

export default OAuthCallback;

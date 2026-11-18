// Verify email: confirms the emailed token.
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";

const serverUrl = import.meta.env.VITE_SERVER_URL?.replace(/\/+$/, "");

const VerifyEmail = () => {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [state, setState] = useState<"busy" | "ok" | "error">("busy");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("This page needs a verification link from your email.");
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${serverUrl}/api/verify-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const j = await res.json();
        if (j.success) {
          setState("ok");
          setMessage(j.message || "Email verified.");
        } else {
          setState("error");
          setMessage(j.message || "Verification failed.");
        }
      } catch {
        setState("error");
        setMessage("Could not reach the server — try again.");
      }
    })();
  }, [token]);

  return (
    <section className="page flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-line bg-card p-8 text-center shadow-pop">
        {state === "busy" ? (
          <p className="text-sm text-ink-dim">Verifying…</p>
        ) : state === "ok" ? (
          <>
            <FaCheckCircle className="mx-auto h-12 w-12 text-ok" />
            <h1 className="mt-4 text-2xl font-bold text-ink">
              Email verified
            </h1>
            <p className="mt-2 text-sm text-ink-dim">{message}</p>
            <Link to="/" className="btn btn-brand mt-6 w-full">
              Start using Campus RecovR
            </Link>
          </>
        ) : (
          <>
            <FaTimesCircle className="mx-auto h-12 w-12 text-rose-400" />
            <h1 className="mt-4 text-2xl font-bold text-ink">
              Verification failed
            </h1>
            <p className="mt-2 text-sm text-ink-dim">{message}</p>
            <Link to="/login" className="btn btn-outline mt-6 w-full">
              Back to login
            </Link>
          </>
        )}
      </div>
    </section>
  );
};

export default VerifyEmail;

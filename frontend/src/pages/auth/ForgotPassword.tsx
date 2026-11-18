// Forgot password: request a reset link by email.
import { useState } from "react";
import { Link } from "react-router-dom";
import { FaEnvelope, FaKey, FaArrowLeft } from "react-icons/fa";

const serverUrl = import.meta.env.VITE_SERVER_URL?.replace(/\/+$/, "");

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [resetLink, setResetLink] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || busy) return;
    setBusy(true);
    setMessage("");
    setResetLink("");
    try {
      const res = await fetch(`${serverUrl}/api/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const j = await res.json();
      setMessage(j.message || j?.data?.message || "Request sent.");
      if (j?.data?.resetLink) setResetLink(j.data.resetLink);
    } catch {
      setMessage("Could not reach the server — try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="page flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-line bg-card p-8 shadow-pop">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-accent/30 bg-accent/10 text-accent">
            <FaKey className="text-xl" />
          </span>
          <h1 className="text-2xl font-bold text-ink">Forgot your password?</h1>
          <p className="mt-2 text-sm text-ink-dim">
            Enter the email you signed up with and we'll send you a reset link.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="email" className="field-label">
              Email Address
            </label>
            <div className="relative">
              <FaEnvelope className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-mute" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="field pl-11"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="btn btn-brand w-full disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send reset link"}
          </button>
        </form>

        {message && (
          <div className="mt-4 rounded-xl border border-accent/40 bg-accent/[0.06] px-4 py-3 text-sm text-accent-soft">
            {message}
          </div>
        )}
        {resetLink && (
          <div className="mt-3 rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm">
            <p className="font-medium text-ink-dim">QA mode — reset link:</p>
            <a
              href={resetLink}
              className="link-accent mt-1 block break-all text-xs"
            >
              {resetLink}
            </a>
          </div>
        )}

        <Link
          to="/login"
          className="link-accent mt-6 flex items-center justify-center gap-2 text-sm"
        >
          <FaArrowLeft className="h-3 w-3" /> Back to login
        </Link>
      </div>
    </section>
  );
};

export default ForgotPassword;

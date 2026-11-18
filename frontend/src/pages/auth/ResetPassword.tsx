// Reset password: set a new password using the emailed token.
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FaKey, FaEye, FaEyeSlash } from "react-icons/fa";
import { passwordStrength } from "../register/passwordStrength";

const serverUrl = import.meta.env.VITE_SERVER_URL?.replace(/\/+$/, "");

const ResetPassword = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const strength = passwordStrength(password);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (password !== confirm) {
      setMessage("Passwords are not the same");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(`${serverUrl}/api/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const j = await res.json();
      if (j.success) {
        setDone(true);
        setMessage(j.message || "Password reset.");
      } else {
        setMessage(j.message || "Could not reset the password.");
      }
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
          <h1 className="text-2xl font-bold text-ink">Set a new password</h1>
          <p className="mt-2 text-sm text-ink-dim">
            Choose a strong password — at least 8 characters with a mix of
            letters, numbers and symbols.
          </p>
        </div>

        {!token ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            This page needs a reset link — request a new one from the{" "}
            <Link to="/forgot-password" className="link-accent">
              forgot password
            </Link>{" "}
            page.
          </div>
        ) : done ? (
          <div className="space-y-4 text-center">
            <div className="rounded-xl border border-ok/30 bg-ok/10 px-4 py-3 text-sm text-emerald-300">
              {message}
            </div>
            <button
              type="button"
              onClick={() => navigate("/login", { replace: true })}
              className="btn btn-brand w-full"
            >
              Go to login
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="password" className="field-label">
                New Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="field pr-10"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  aria-label="Toggle password visibility"
                  className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-ink-mute transition-colors hover:text-ink"
                >
                  {show ? (
                    <FaEyeSlash className="h-4 w-4" />
                  ) : (
                    <FaEye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {strength && (
                <div className="mt-2">
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((seg) => (
                      <span
                        key={seg}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          strength.level > seg ? strength.bar : "bg-surface-4"
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`mt-1 text-xs ${strength.text}`}>
                    <span className="font-semibold">{strength.label}</span>
                    <span className="text-ink-mute"> — {strength.hint}</span>
                  </p>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirm" className="field-label">
                Confirm Password
              </label>
              <input
                id="confirm"
                type={show ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="field"
                minLength={8}
                required
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="btn btn-brand w-full disabled:opacity-50"
            >
              {busy ? "Resetting…" : "Reset password"}
            </button>
          </form>
        )}

        {message && !done && !token && null}
        {message && !done && token && (
          <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {message}
          </div>
        )}
      </div>
    </section>
  );
};

export default ResetPassword;

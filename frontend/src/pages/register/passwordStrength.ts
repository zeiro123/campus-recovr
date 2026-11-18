// Password strength: bad (< 8 chars) → medium (8+, simple) → excellent
// (8+ chars mixing letters, numbers and symbols). Sequential/common
// patterns like "12345678" can never be excellent.
const COMMON_WEAK = [
  "password",
  "password1",
  "qwerty123",
  "qwertyui",
  "letmein1",
  "iloveyou",
  "admin123",
];

const hasRun = (pw: string, alphabet: string, min = 4) => {
  const lower = pw.toLowerCase();
  for (let i = 0; i + min <= alphabet.length; i++) {
    const run = alphabet.slice(i, i + min);
    if (lower.includes(run) || lower.includes([...run].reverse().join(""))) {
      return true;
    }
  }
  return false;
};

export const passwordStrength = (pw: string) => {
  if (!pw) return null;
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((r) =>
    r.test(pw)
  ).length;
  const predictable =
    COMMON_WEAK.includes(pw.toLowerCase()) ||
    hasRun(pw, "0123456789") ||
    hasRun(pw, "abcdefghijklmnopqrstuvwxyz") ||
    /^(.)\1+$/.test(pw);

  if (pw.length < 8) {
    return {
      level: 0,
      label: "Bad",
      bar: "bg-rose-500",
      text: "text-rose-400",
      hint: "Use at least 8 characters",
    };
  }
  if (predictable) {
    return {
      level: 1,
      label: "Medium",
      bar: "bg-amber-400",
      text: "text-amber-300",
      hint: "Too predictable — mix letters, numbers and symbols",
    };
  }
  if (classes >= 3) {
    return {
      level: 3,
      label: "Excellent",
      bar: "bg-emerald-400",
      text: "text-emerald-300",
      hint: classes === 4 ? "Great mix of letters, numbers and symbols" : "Strong mix — nice one",
    };
  }
  if (classes === 2) {
    return {
      level: 2,
      label: "Medium",
      bar: "bg-amber-400",
      text: "text-amber-300",
      hint: "Add a symbol or capital letter to make it excellent",
    };
  }
  return {
    level: 1,
    label: "Medium",
    bar: "bg-amber-400",
    text: "text-amber-300",
    hint: "Only letters or only numbers — mix them for a stronger password",
  };
};

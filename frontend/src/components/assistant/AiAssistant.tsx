// AI assistant: a floating helper button (bottom-right) with quick links and an
// optional guided walkthrough of the platform's main features. Walkthrough state
// persists in localStorage so it never nags twice — and it can be skipped.
import { useEffect, useState } from "react";
import {
  FaRobot,
  FaTimes,
  FaPlay,
  FaArrowRight,
  FaArrowLeft,
  FaFlagCheckered,
  FaCommentDots,
  FaSearch,
  FaMapSigns,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const TOUR_KEY = "recover-tour-done";

const TOUR_STEPS = [
  {
    title: "Welcome to Campus RecovR 👋",
    body: "This is your campus lost & found. Let me show you around — you can skip any time.",
    route: "/",
  },
  {
    title: "Report something you lost",
    body: "Lost your student ID, phone or laptop? Use 'Report Lost Item' to post it with a photo, where and when you lost it.",
    route: "/reportlostItem",
  },
  {
    title: "Found something?",
    body: "Picked up a lost item? Report it as found so its owner can track you down. You keep the item until the claim is sorted.",
    route: "/reportFoundItem",
  },
  {
    title: "Browse lost & found listings",
    body: "Search and filter everything the community has reported. Open an item to see its details, claim it, or message the owner.",
    route: "/lostItems",
  },
  {
    title: "Your dashboard",
    body: "Track the items you reported, your claims, and your account settings — including your WhatsApp number for the contact handoff.",
    route: "/dashboard",
  },
  {
    title: "Chat with people",
    body: "Every item has a message button — talk on-platform, or jump straight to the owner's WhatsApp if they shared a number. That's the tour done! 🎉",
    route: "/messages",
  },
];

const QUICK_LINKS = [
  { label: "Report a lost item", route: "/reportlostItem" },
  { label: "Report a found item", route: "/reportFoundItem" },
  { label: "Browse lost items", route: "/lostItems" },
  { label: "Browse found items", route: "/foundItems" },
  { label: "My dashboard", route: "/dashboard" },
  { label: "My messages", route: "/messages" },
];

const AiAssistant = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<number | null>(null);
  const [tourDone, setTourDone] = useState(true);

  useEffect(() => {
    setTourDone(localStorage.getItem(TOUR_KEY) === "1");
  }, []);

  const finishTour = () => {
    localStorage.setItem(TOUR_KEY, "1");
    setTourDone(true);
    setStep(null);
  };

  const startTour = () => {
    setStep(0);
    navigate(TOUR_STEPS[0].route);
  };

  const goToStep = (index: number) => {
    if (index >= TOUR_STEPS.length) {
      finishTour();
      return;
    }
    setStep(index);
    navigate(TOUR_STEPS[index].route);
  };

  const inTour = step !== null;
  const current = inTour ? TOUR_STEPS[step] : null;

  return (
    <>
      {/* Floating assistant button — always available, bottom-right corner */}
      {!inTour && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Open the Campus RecovR assistant"
          className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/40 transition hover:scale-105 focus:outline-none"
        >
          {open ? (
            <FaTimes className="h-5 w-5" />
          ) : (
            <FaRobot className="h-6 w-6" />
          )}
          {!tourDone && !open && (
            <span className="absolute -right-0.5 -top-0.5 h-4 w-4 animate-pulse rounded-full border-2 border-white bg-amber-400" />
          )}
        </button>
      )}

      {/* Help panel */}
      {open && !inTour && (
        <div className="fixed bottom-24 right-5 z-50 w-80 max-w-[calc(100vw-2.5rem)] overflow-hidden rounded-2xl border border-line bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div className="flex items-center gap-2">
              <FaRobot className="text-accent" />
              <span className="text-sm font-bold text-ink">RecovR Assistant</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              className="text-ink-mute transition hover:text-ink"
            >
              <FaTimes className="h-4 w-4" />
            </button>
          </div>
          <div className="p-4">
            <button
              type="button"
              onClick={startTour}
              className="btn btn-brand flex w-full items-center justify-center gap-2"
            >
              <FaPlay className="h-3 w-3" />
              {tourDone ? "Replay the walkthrough" : "Take a quick tour"}
            </button>
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-ink-mute">
              <FaMapSigns className="h-3 w-3 shrink-0" />
              6 short steps through the main features — skippable at any point.
            </p>
            <div className="mt-4 space-y-1.5">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-mute">
                <FaSearch className="h-3 w-3" /> Jump to
              </p>
              {QUICK_LINKS.map((link) => (
                <button
                  key={link.route + link.label}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    navigate(link.route);
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-ink-dim transition hover:bg-surface-2 hover:text-ink"
                >
                  {link.label}
                  <FaArrowRight className="h-3 w-3 opacity-60" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Walkthrough card */}
      {inTour && current && (
        <div className="fixed bottom-5 right-5 z-50 w-80 max-w-[calc(100vw-2.5rem)] overflow-hidden rounded-2xl border border-line bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div className="flex items-center gap-2">
              <FaCommentDots className="text-accent" />
              <span className="text-sm font-bold text-ink">
                Walkthrough · step {step + 1} of {TOUR_STEPS.length}
              </span>
            </div>
            <button
              type="button"
              onClick={finishTour}
              className="text-xs text-ink-mute transition hover:text-ink"
            >
              Skip
            </button>
          </div>
          <div className="p-4">
            <h3 className="text-base font-bold text-ink">{current.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-dim">
              {current.body}
            </p>
            <div className="mt-3 flex items-center gap-1.5">
              {TOUR_STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full ${
                    i === step ? "bg-accent" : "bg-line"
                  }`}
                />
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2">
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => goToStep(step - 1)}
                  className="btn flex items-center gap-1.5 border border-line px-3 py-2 text-sm text-ink-dim"
                >
                  <FaArrowLeft className="h-3 w-3" /> Back
                </button>
              )}
              <button
                type="button"
                onClick={() => goToStep(step + 1)}
                className="btn btn-brand flex flex-1 items-center justify-center gap-1.5 px-3 py-2 text-sm"
              >
                {step === TOUR_STEPS.length - 1 ? (
                  <>
                    <FaFlagCheckered className="h-3 w-3" /> Done
                  </>
                ) : (
                  <>
                    Next <FaArrowRight className="h-3 w-3" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AiAssistant;

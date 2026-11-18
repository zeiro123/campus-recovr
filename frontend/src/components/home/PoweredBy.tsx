// "Powered by Young and Dynamic UZ" credit: a continuously rotating
// color-wheel mark with typewriter text, floating on the home page.
const PoweredBy = () => {
  return (
    <div
      className="fixed right-4 top-20 z-40 flex items-center gap-3 rounded-2xl border border-line bg-card/90 px-4 py-2.5 shadow-pop backdrop-blur"
      aria-label="Powered by Young and Dynamic UZ"
    >
      <img
        src="/young-dynamic.png"
        alt="Young and Dynamic UZ"
        className="animate-wheel h-11 w-11"
      />
      <span className="typewriter text-xs font-semibold text-ink-dim sm:text-sm">
        Powered by Young and Dynamic UZ
      </span>
    </div>
  );
};

export default PoweredBy;

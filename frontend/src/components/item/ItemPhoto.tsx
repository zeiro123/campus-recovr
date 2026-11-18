// Item photo with a graceful placeholder: when no image was uploaded (or the
// URL fails to load) a greyscale camera-icon tile is shown instead of a
// random/broken image.
import { useState } from "react";

type Props = {
  src?: string;
  alt?: string;
  className?: string;      // sizing classes for BOTH the img and the placeholder
  imgClassName?: string;   // extra classes for the img element itself
  label?: string;
};

const ItemPhoto = ({ src, alt, className = "", imgClassName = "", label }: Props) => {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src && src.trim()) && !failed;

  if (!showImage) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1.5 bg-surface-2 ${className}`}
        role="img"
        aria-label={label || alt || "No image available"}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-9 w-9 text-ink-mute opacity-50 grayscale"
          aria-hidden="true"
        >
          {/* Greyscale camera icon */}
          <path d="M14.5 4h-5L7.5 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3.5L14.5 4z" />
          <circle cx="12" cy="13" r="3.5" />
          <circle cx="17.5" cy="10.5" r=".75" fill="currentColor" stroke="none" />
        </svg>
        <span className="px-2 text-center text-[10px] font-medium uppercase tracking-widest text-ink-mute/60">
          {label || "No image"}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || "Item photo"}
      className={`object-cover ${className} ${imgClassName}`}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  );
};

export default ItemPhoto;

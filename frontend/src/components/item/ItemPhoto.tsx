// Item photo with a graceful placeholder: when no image was uploaded (or the
// URL fails to load) a branded "No photo" tile is shown instead of a broken img.
import { useState } from "react";
import { FaCamera } from "react-icons/fa";

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
        className={`flex flex-col items-center justify-center gap-2 bg-surface-2 ${className}`}
        role="img"
        aria-label={label || alt || "No photo available"}
      >
        <FaCamera className="h-7 w-7 text-ink-mute/70" />
        <span className="px-2 text-center text-[11px] font-medium uppercase tracking-wide text-ink-mute/80">
          {label || "No photo yet"}
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

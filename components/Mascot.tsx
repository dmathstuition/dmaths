"use client";
import { useState } from "react";

// A full character illustration (not a circular avatar). If the PNG is missing
// or fails to load, it renders `fallback` instead — usually the built-in SVG
// illustration — so a page is never broken by an absent image.
export default function Mascot({
  src,
  alt = "",
  className = "",
  fallback = null,
}: {
  src: string;
  alt?: string;
  className?: string;
  fallback?: React.ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} onError={() => setFailed(true)} className={className} />
  );
}

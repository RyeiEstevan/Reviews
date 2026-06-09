"use client";

/**
 * frontend/components/StarRating.tsx
 *
 * Two modes:
 *   readonly  — displays filled/half/empty stars for a given score (0-5).
 *   interactive — clickable stars for submitting a review rating.
 */

import { useState } from "react";

interface ReadonlyProps {
  value: number;   // 0.0 – 5.0
  size?: number;
  interactive?: false;
  onChange?: never;
}

interface InteractiveProps {
  value: number;
  size?: number;
  interactive: true;
  onChange: (rating: number) => void;
  hasError?: boolean;
}

type StarRatingProps = ReadonlyProps | InteractiveProps;

export function StarRating({ value, size = 20, ...rest }: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const display = hovered ?? value;
  const isInteractive = "interactive" in rest && rest.interactive;
  const hasError = isInteractive && (rest as InteractiveProps).hasError;

  return (
    <span
      className="star-rating"
      role={isInteractive ? "radiogroup" : undefined}
      aria-label={isInteractive ? "Selecione uma nota de 1 a 5" : `${value} de 5 estrelas`}
      style={{ display: "inline-flex", gap: 2 }}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = display >= star;
        const half = !filled && display >= star - 0.5;

        return (
          <svg
            key={star}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            aria-hidden="true"
            style={{
              cursor: isInteractive ? "pointer" : "default",
              transition: "transform 0.1s",
            }}
            onMouseEnter={isInteractive ? () => setHovered(star) : undefined}
            onMouseLeave={isInteractive ? () => setHovered(null) : undefined}
            onClick={
              isInteractive
                ? () => (rest as InteractiveProps).onChange(star)
                : undefined
            }
          >
            <defs>
              <linearGradient id={`half-${star}`} x1="0" x2="1" y1="0" y2="0">
                <stop offset="50%" stopColor={half ? "#f59e0b" : "transparent"} />
                <stop offset="50%" stopColor="transparent" />
              </linearGradient>
            </defs>
            <polygon
              points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
              fill={
                filled
                  ? "#f59e0b"
                  : half
                  ? `url(#half-${star})`
                  : "none"
              }
              stroke={hasError ? "#ef4444" : filled || half ? "#f59e0b" : "#94a3b8"}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        );
      })}
    </span>
  );
}

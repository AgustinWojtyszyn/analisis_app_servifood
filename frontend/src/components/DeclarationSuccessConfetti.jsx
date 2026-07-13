import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const CONFETTI_PIECES = Array.from({ length: 120 }, (_, index) => ({
  left: `${3 + ((index * 19) % 94)}%`,
  drift: `${((index % 13) - 6) * 12}px`,
  rotate: `${((index % 11) - 5) * 38}deg`,
  delay: `${Math.floor(index / 40) * 170 + (index % 16) * 12}ms`,
  duration: `${1050 + (index % 8) * 65}ms`,
  size: `${5 + (index % 4)}px`,
  top: `${-10 - (index % 4) * 10}px`
}));

export default function DeclarationSuccessConfetti({ runId = 0 }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!runId) return undefined;

    if (timerRef.current) window.clearTimeout(timerRef.current);
    setVisible(true);
    timerRef.current = window.setTimeout(() => {
      setVisible(false);
    }, 2200);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [runId]);

  if (!visible || typeof document === 'undefined') return null;

  return createPortal(
    <div className="declaration-success-confetti" aria-hidden="true">
      {CONFETTI_PIECES.map(({ left, drift, rotate, delay, duration, size, top }, index) => (
        <span
          key={`${left}-${delay}-${index}`}
          className="declaration-success-confetti__piece"
          style={{
            left,
            top,
            '--confetti-drift': drift,
            '--confetti-rotate': rotate,
            '--confetti-size': size,
            '--confetti-duration': duration,
            animationDelay: delay,
            animationDuration: duration
          }}
        />
      ))}
    </div>,
    document.body
  );
}

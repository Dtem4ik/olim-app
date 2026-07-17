"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  ariaLabel?: string;
}

/**
 * A native-feeling bottom sheet: slides up from the bottom, dims the page,
 * closes on backdrop tap / Escape / swipe-down.
 *
 * Rendered inline (no portal) so its content is server-rendered — a shared
 * step URL lands in the section with this sheet already open and its content in
 * the SSR HTML (SEO). The host must render it OUTSIDE any transformed ancestor,
 * or `position: fixed` would resolve against that ancestor instead of the
 * viewport.
 */
export function BottomSheet({ open, onClose, children, ariaLabel }: BottomSheetProps) {
  const [render, setRender] = useState(open);
  const [visible, setVisible] = useState(false);
  const [dragY, setDragY] = useState(0);
  const startY = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      setRender(true);
      // Double rAF: guarantees the browser paints the closed (translate-y-full)
      // state before we flip to open, so the transition actually plays.
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setVisible(true));
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }
    setVisible(false);
    const id = setTimeout(() => setRender(false), 440);
    return () => clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!render) return null;

  const onPointerDown = (e: React.PointerEvent) => {
    startY.current = e.clientY;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (startY.current === null) return;
    setDragY(Math.max(0, e.clientY - startY.current));
  };
  const onPointerUp = () => {
    if (startY.current === null) return;
    if (dragY > 120) onClose();
    setDragY(0);
    startY.current = null;
  };

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={ariaLabel}>
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-black/50 transition-opacity duration-300",
          visible ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-background shadow-2xl transition-transform duration-420 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform",
          visible ? "translate-y-0" : "translate-y-full",
        )}
        style={dragY ? { transform: `translateY(${dragY}px)`, transition: "none" } : undefined}
      >
        <div
          className="flex shrink-0 cursor-grab touch-none justify-center pt-3 pb-1"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <div className="h-1.5 w-10 rounded-full bg-muted" />
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 pb-10">{children}</div>
      </div>
    </div>
  );
}

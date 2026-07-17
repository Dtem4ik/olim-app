"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  ariaLabel?: string;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

// Drag-to-dismiss physics (tuned to feel like vaul / a native sheet).
const CLOSE_DISTANCE_RATIO = 0.25; // dragged past 25% of the sheet height → close
const CLOSE_VELOCITY = 0.45; // …or a downward flick faster than this (px/ms)
const UP_RESISTANCE = 0.35; // rubber-band factor when dragging above the open rest
const UP_MAX = 48; // hard cap on how far it rubber-bands up (px)
const EXIT_MS = 440;

/**
 * Native-feeling bottom sheet — our own SSR-safe implementation of a shadcn/vaul-style
 * drawer.
 *
 * Why not shadcn's Drawer (vaul / Base UI)? Both portal their content and render
 * NOTHING on the server (verified: vaul emits no dialog/h1 in the SSR HTML; Base UI
 * `Dialog.Portal` renders empty and refuses to mount without a portal). A shared step
 * URL must land in its section with the step's content (h1, body, JSON-LD) already in
 * the server HTML for SEO / no-JS — a portal drawer would strip all of that. Opening a
 * step in-app is also client state, not navigation, so a portal drawer would add an RSC
 * round-trip per tap. So we render INLINE (no portal) and implement the drawer logic
 * ourselves: focus trap + return, initial focus, body scroll-lock, Escape, backdrop
 * dismiss, and velocity-aware drag-to-close with rubber-banding and spring-back.
 *
 * The host must render this OUTSIDE any transformed ancestor, or `position: fixed`
 * would resolve against that ancestor instead of the viewport.
 */
export function BottomSheet({ open, onClose, children, ariaLabel }: BottomSheetProps) {
  const [render, setRender] = useState(open);
  const [visible, setVisible] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Live drag bookkeeping (kept in a ref so moves don't re-render per frame).
  const drag = useRef({
    active: false,
    engaged: false,
    fromHandle: false,
    atTop: true,
    startY: 0,
    lastY: 0,
    lastT: 0,
    velocity: 0,
  });

  // Mount + entrance/exit animation. Double rAF paints the closed state first so the
  // slide-up transition plays; the exit keeps the node mounted for the slide-down.
  useEffect(() => {
    if (open) {
      setRender(true);
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
    setDragOffset(0);
    const id = setTimeout(() => setRender(false), EXIT_MS);
    return () => clearTimeout(id);
  }, [open]);

  // Modal behaviour while open: scroll-lock, Escape, focus trap + return.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;

    const raf = requestAnimationFrame(() => {
      const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? panel)?.focus();
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      );
      if (nodes.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      restoreFocusRef.current?.focus?.();
    };
  }, [open]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // Ignore secondary buttons; let controls (checkbox, links, textarea) work.
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    const fromHandle = target.closest("[data-sheet-handle]") !== null;
    if (!fromHandle && target.closest("button,a,input,textarea,select,[role='button']")) return;
    const scroller = scrollRef.current;
    drag.current = {
      active: true,
      engaged: false,
      fromHandle,
      atTop: (scroller?.scrollTop ?? 0) <= 0,
      startY: e.clientY,
      lastY: e.clientY,
      lastT: e.timeStamp,
      velocity: 0,
    };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.active) return;
    const dy = e.clientY - d.startY;

    if (!d.engaged) {
      // Engage a drag only when it clearly starts downward from the handle, or from
      // content that's scrolled to the top — otherwise let native scrolling win.
      if (dy > 3 && (d.fromHandle || d.atTop)) {
        d.engaged = true;
        setDragging(true);
        panelRef.current?.setPointerCapture(e.pointerId);
      } else if (dy < -3 || !d.atTop) {
        d.active = false;
        return;
      } else {
        return;
      }
    }

    const dt = e.timeStamp - d.lastT;
    if (dt > 0) d.velocity = (e.clientY - d.lastY) / dt;
    d.lastY = e.clientY;
    d.lastT = e.timeStamp;

    // Follow 1:1 downward; rubber-band (dampened, capped) upward.
    const offset = dy >= 0 ? dy : Math.max(-UP_MAX, dy * UP_RESISTANCE);
    setDragOffset(offset);
    e.preventDefault();
  }, []);

  const endDrag = useCallback(() => {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    if (!d.engaged) return;
    setDragging(false);
    const height = panelRef.current?.offsetHeight ?? 600;
    const dragged = Math.max(0, d.lastY - d.startY);
    const shouldClose = dragged > height * CLOSE_DISTANCE_RATIO || d.velocity > CLOSE_VELOCITY;
    setDragOffset(0); // spring back to rest (or slide out if closing)
    if (shouldClose) onCloseRef.current();
  }, []);

  if (!render) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={ariaLabel}>
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-black/50 transition-opacity duration-300",
          visible && dragOffset === 0 ? "opacity-100" : visible ? "opacity-90" : "opacity-0",
        )}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={cn(
          "absolute inset-x-0 bottom-0 flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-background shadow-2xl outline-none will-change-transform",
          // No transition while the finger drives it; spring easing on release / enter.
          dragging
            ? "transition-none"
            : "transition-transform duration-420 ease-[cubic-bezier(0.32,0.72,0,1)]",
          visible ? "translate-y-0" : "translate-y-full",
        )}
        style={
          dragging || dragOffset !== 0 ? { transform: `translateY(${dragOffset}px)` } : undefined
        }
      >
        {/* Grab handle — always drag-initiating (touch-action:none) even mid-scroll. */}
        <div
          data-sheet-handle
          className="flex shrink-0 touch-none cursor-grab justify-center pt-3 pb-1"
        >
          <div className="h-1.5 w-10 rounded-full bg-muted" />
        </div>
        <div ref={scrollRef} className="overflow-y-auto overscroll-contain px-5 pb-10">
          {children}
        </div>
      </div>
    </div>
  );
}

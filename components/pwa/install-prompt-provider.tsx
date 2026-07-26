"use client";

import { Plus, Share } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { capture } from "@/lib/analytics";
import {
  type BeforeInstallPromptEvent,
  detectPlatform,
  type InstallPlatform,
  isStandalone,
  markDismissed,
  wasDismissed,
} from "@/lib/pwa/install";

interface InstallPromptContextValue {
  /** Whether the app can still be installed (not already standalone). */
  canInstall: boolean;
  /** Open the sheet on demand (e.g. the Profile "Установить приложение" row). */
  open: () => void;
}

const InstallPromptContext = createContext<InstallPromptContextValue>({
  canInstall: false,
  open: () => {},
});

/** Read by the Profile manual-install entry. */
export function useInstallPrompt(): InstallPromptContextValue {
  return useContext(InstallPromptContext);
}

/**
 * Drives the "add to home screen" flow (Phase 9a). Mounted once at the root
 * (outside any transformed ancestor, as BottomSheet requires). Captures Chrome's
 * `beforeinstallprompt`, shows our own dismissible sheet, and on iOS Safari —
 * which has no such API — shows illustrated Share→Home-Screen instructions.
 *
 * Frequency discipline: auto-shows at most once and remembers dismissal in a
 * versioned localStorage key, never nags; skips entirely when already installed
 * (`display-mode: standalone`) or previously dismissed. Manual opens from Profile
 * always work.
 */
export function InstallPromptProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("install");
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<InstallPlatform>("other");
  const [canInstall, setCanInstall] = useState(false);
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone()) return; // already installed — never prompt
    setCanInstall(true);
    const detected = detectPlatform();
    setPlatform(detected);

    const onBeforeInstall = (e: Event) => {
      // Stop Chrome's mini-infobar; we present our own sheet instead.
      e.preventDefault();
      deferred.current = e as BeforeInstallPromptEvent;
      setPlatform("android");
      if (!wasDismissed(window.localStorage)) setOpen(true);
    };

    const onInstalled = () => {
      capture("install_accepted", { platform: "appinstalled" });
      markDismissed(window.localStorage);
      setOpen(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    // iOS Safari never fires beforeinstallprompt → auto-show the instructions once.
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (detected === "ios" && !wasDismissed(window.localStorage)) {
      // Small delay so it never competes with first paint.
      timer = setTimeout(() => setOpen(true), 1200);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Fire the "shown" event whenever the sheet becomes visible (auto or manual).
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) capture("install_prompt_shown", { platform });
    wasOpen.current = open;
  }, [open, platform]);

  const openManually = useCallback(() => setOpen(true), []);

  const dismiss = useCallback(() => {
    markDismissed(window.localStorage);
    setOpen(false);
  }, []);

  const accept = useCallback(async () => {
    const event = deferred.current;
    if (!event) {
      // No native prompt available (manual open before the event, or desktop):
      // fall back to closing; the sheet already shows menu instructions.
      dismiss();
      return;
    }
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === "accepted") capture("install_accepted", { platform: "android" });
    deferred.current = null;
    markDismissed(window.localStorage);
    setOpen(false);
  }, [dismiss]);

  const ctx = useMemo<InstallPromptContextValue>(
    () => ({ canInstall, open: openManually }),
    [canInstall, openManually],
  );

  const hasNativePrompt = deferred.current !== null;

  return (
    <InstallPromptContext.Provider value={ctx}>
      {children}
      <BottomSheet open={open} onClose={dismiss} ariaLabel={t("title")}>
        <div className="flex flex-col gap-5" data-testid="install-sheet">
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight">{t("title")}</h2>
            <p className="text-sm text-muted-foreground">
              {platform === "ios"
                ? t("iosIntro")
                : hasNativePrompt
                  ? t("androidBody")
                  : t("genericBody")}
            </p>
          </div>

          {platform === "ios" && (
            <ol className="flex flex-col gap-3" data-testid="install-ios-steps">
              <InstructionStep
                icon={<Share className="size-5" aria-hidden />}
                text={t("iosStep1")}
              />
              <InstructionStep
                icon={<Plus className="size-5" aria-hidden />}
                text={t("iosStep2")}
              />
              <InstructionStep index="3" text={t("iosStep3")} />
            </ol>
          )}

          <div className="flex flex-col gap-2 pt-1">
            {platform !== "ios" && hasNativePrompt && (
              <Button size="lg" className="w-full" data-testid="install-accept" onClick={accept}>
                {t("cta")}
              </Button>
            )}
            <Button
              variant={platform === "ios" || !hasNativePrompt ? "default" : "ghost"}
              size="lg"
              className="w-full"
              data-testid="install-dismiss"
              onClick={dismiss}
            >
              {platform === "ios" || !hasNativePrompt ? t("gotIt") : t("dismiss")}
            </Button>
          </div>
        </div>
      </BottomSheet>
    </InstallPromptContext.Provider>
  );
}

/** One illustrated instruction row: a leading icon (or number) + text. */
function InstructionStep({
  icon,
  index,
  text,
}: {
  icon?: ReactNode;
  index?: string;
  text: string;
}) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
        {icon ?? <span className="text-sm font-semibold">{index}</span>}
      </span>
      <span className="text-sm">{text}</span>
    </li>
  );
}

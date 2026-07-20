"use client";

import { LogOut, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import { markSignedOut } from "@/lib/sync/state-sync";

type AuthState = { status: "loading" } | { status: "anon" } | { status: "signedIn"; email: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Account sign-in / sign-out on the Profile screen (Phase 7a). Anonymous-first:
 * one calm entry point ("save your plan to an account"). Signing in adds only
 * cross-device sync + deadline reminders — no login walls. Uses the browser
 * Supabase SDK, which is code-split onto this route only.
 *
 * Renders nothing when auth is not configured (CI/preview) so the rest of the
 * Profile screen still works.
 */
export function AccountPanel({
  onSignedOut,
}: {
  onSignedOut?: () => void;
}): React.JSX.Element | null {
  const t = useTranslations("account");
  const [supabase] = useState(() => getSupabaseBrowser());
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<"idle" | "sending" | "sent" | "error" | "invalid">("idle");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setAuth({ status: "anon" });
      return;
    }
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setAuth(
        data.user ? { status: "signedIn", email: data.user.email ?? "" } : { status: "anon" },
      );
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuth(
        session?.user
          ? { status: "signedIn", email: session.user.email ?? "" }
          : { status: "anon" },
      );
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  if (!supabase || auth.status === "loading") return null;

  async function sendMagicLink(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    if (!EMAIL_RE.test(email)) {
      setPhase("invalid");
      return;
    }
    setPhase("sending");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setPhase(error ? "error" : "sent");
  }

  async function signInWithGoogle() {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    markSignedOut();
    setAuth({ status: "anon" });
    onSignedOut?.();
  }

  async function deleteAccount() {
    setDeleting(true);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (res.ok) {
        await supabase?.auth.signOut().catch(() => {});
        markSignedOut();
        setAuth({ status: "anon" });
        setConfirmingDelete(false);
        onSignedOut?.();
      }
    } finally {
      setDeleting(false);
    }
  }

  if (auth.status === "signedIn") {
    const initial = (auth.email.trim()[0] ?? "?").toUpperCase();
    return (
      <section className="flex flex-col gap-3" data-testid="account-signed-in">
        <div className="flex items-center gap-4 rounded-3xl bg-sec-mint p-5 text-foreground">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-surface/70 text-xl font-bold">
            {initial}
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="text-xs text-foreground/70 uppercase tracking-wide">
              {t("signedInAs")}
            </span>
            <span className="truncate font-semibold" data-testid="account-email">
              {auth.email}
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={signOut}
          data-testid="account-signout"
        >
          <LogOut aria-hidden />
          {t("signOut")}
        </Button>
        {confirmingDelete ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-destructive/40 p-4">
            <p className="text-sm text-muted-foreground">{t("deletePrompt")}</p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
              >
                {t("deleteCancel")}
              </Button>
              <Button
                className="flex-1 bg-destructive text-white hover:bg-destructive/90"
                onClick={deleteAccount}
                disabled={deleting}
                data-testid="account-delete-confirm"
              >
                {deleting ? t("deleting") : t("deleteConfirm")}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            className="self-start text-destructive"
            onClick={() => setConfirmingDelete(true)}
            data-testid="account-delete"
          >
            {t("delete")}
          </Button>
        )}
      </section>
    );
  }

  return (
    <section
      className="flex flex-col gap-4 rounded-3xl bg-sec-lavender p-5 text-foreground"
      data-testid="account-signin"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold tracking-tight">{t("anonTitle")}</h2>
        <p className="text-sm text-foreground/70">{t("anonSubtitle")}</p>
      </div>
      <form className="flex flex-col gap-2" onSubmit={sendMagicLink}>
        <label className="sr-only" htmlFor="account-email-input">
          {t("emailLabel")}
        </label>
        <Input
          id="account-email-input"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={t("emailPlaceholder")}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (phase !== "idle") setPhase("idle");
          }}
          className="bg-surface"
          data-testid="account-email-input"
        />
        <Button
          type="submit"
          className="w-full"
          disabled={phase === "sending"}
          data-testid="account-send-link"
        >
          <Mail aria-hidden />
          {phase === "sending" ? t("sending") : t("sendLink")}
        </Button>
        <p className="min-h-5 text-center text-sm" aria-live="polite" data-testid="account-status">
          {phase === "sent" && <span className="text-success">{t("linkSent")}</span>}
          {phase === "invalid" && <span className="text-destructive">{t("invalidEmail")}</span>}
          {phase === "error" && <span className="text-destructive">{t("error")}</span>}
        </p>
      </form>
      <div className="flex items-center gap-3 text-xs text-foreground/70">
        <span className="h-px flex-1 bg-foreground/20" />
        {t("or")}
        <span className="h-px flex-1 bg-foreground/20" />
      </div>
      <Button
        type="button"
        variant="outline"
        className="w-full bg-surface"
        onClick={signInWithGoogle}
        data-testid="account-google"
      >
        {t("google")}
      </Button>
    </section>
  );
}

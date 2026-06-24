import { useEffect, useState } from "react";
import { Share, Plus, X, Smartphone, MoreVertical } from "lucide-react";

/** A captured beforeinstallprompt event (Android/Chrome only). */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
  });
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean })
    .standalone;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    iosStandalone === true
  );
}

function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  const coarse = window.matchMedia?.("(pointer: coarse)").matches === true;
  const small = window.matchMedia?.("(max-width: 768px)").matches === true;
  return coarse || small;
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    // iPadOS 13+ reports as Mac but is touch-capable
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/**
 * Decides whether the home-screen prompt is relevant for this device.
 * Returns false on desktop or when the app is already installed.
 */
export function useIsInstallable(): boolean {
  const [installable, setInstallable] = useState(false);
  useEffect(() => {
    setInstallable(isMobile() && !isStandalone());
  }, []);
  return installable;
}

export function InstallInstructionsSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [ios, setIos] = useState(false);
  const [canPrompt, setCanPrompt] = useState(false);

  useEffect(() => {
    setIos(isIOS());
    setCanPrompt(deferredPrompt !== null);
  }, [open]);

  if (!open) return null;

  async function nativeInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl bg-card p-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Smartphone className="h-5 w-5" />
            Add to home screen
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-foreground/60 hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-5 text-sm text-muted-foreground">
          Keep Grateful one tap away and stay signed in between visits.
        </p>

        {canPrompt && !ios ? (
          <button
            onClick={nativeInstall}
            className="mb-2 w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
          >
            Install Grateful
          </button>
        ) : ios ? (
          <ol className="space-y-3 text-sm">
            <Step n={1}>
              Tap the <strong>Share</strong> button{" "}
              <span className="inline-flex translate-y-0.5 items-center">
                <Share className="h-4 w-4" />
              </span>{" "}
              in Safari's toolbar.
            </Step>
            <Step n={2}>
              Scroll down and choose{" "}
              <strong>Add to Home Screen</strong>{" "}
              <span className="inline-flex translate-y-0.5 items-center">
                <Plus className="h-4 w-4" />
              </span>
              .
            </Step>
            <Step n={3}>
              Tap <strong>Add</strong> — Grateful now lives on your home screen.
            </Step>
          </ol>
        ) : (
          <ol className="space-y-3 text-sm">
            <Step n={1}>
              Open your browser menu{" "}
              <span className="inline-flex translate-y-0.5 items-center">
                <MoreVertical className="h-4 w-4" />
              </span>
              .
            </Step>
            <Step n={2}>
              Choose <strong>Add to Home screen</strong> (or{" "}
              <strong>Install app</strong>).
            </Step>
            <Step n={3}>
              Confirm — Grateful now lives on your home screen.
            </Step>
          </ol>
        )}
      </div>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold">
        {n}
      </span>
      <span className="pt-0.5 leading-snug text-foreground/80">{children}</span>
    </li>
  );
}

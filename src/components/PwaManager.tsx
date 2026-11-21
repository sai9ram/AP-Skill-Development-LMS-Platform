"use client";

import React, { useEffect, useState } from "react";
import { Download, Smartphone, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaManager() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIosTip, setShowIosTip] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Ignore service worker registration errors in unsupported contexts
      });
    }

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    const ua = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua);
    if (isIos) {
      setShowIosTip(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (dismissed || (!deferredPrompt && !showIosTip)) return null;

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setDeferredPrompt(null);
    }
  }

  return (
    <div className="fixed bottom-16 md:bottom-4 right-4 left-4 md:left-auto md:w-96 z-50 bg-[#0F3D2E] text-white border-2 border-white rounded-lg shadow-2xl p-3.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="p-2 rounded bg-white text-[#0F3D2E] shrink-0">
          <Smartphone className="w-4 h-4" />
        </div>
        <div className="min-w-0 text-xs">
          <p className="font-bold truncate">Install AP Skill LMS App</p>
          <p className="text-[11px] text-white/80 leading-snug">
            {deferredPrompt
              ? "Add to your home screen for full-screen mobile access."
              : "Tap Share then 'Add to Home Screen' on your iPhone/iPad."}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {deferredPrompt && (
          <button
            onClick={handleInstall}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white text-[#0F3D2E] text-xs font-bold rounded cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Install
          </button>
        )}
        <button
          onClick={() => setDismissed(true)}
          className="p-1.5 rounded border border-white/30 text-white hover:bg-white/10 cursor-pointer"
          aria-label="Dismiss install prompt"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

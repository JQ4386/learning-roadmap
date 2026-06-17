"use client";

import { useEffect, useState } from "react";
import { ListChecks, BarChart3, Brain, Flag, Radar, LogOut, LogIn } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useUserState } from "@/lib/store";
import { progressCounts } from "@/lib/curriculum";
import { ProgressRing } from "@/components/shared/ProgressRing";
import { Confetti } from "@/components/shared/Confetti";
import { AchievementBanner } from "@/components/shared/AchievementBanner";
import { Track } from "@/components/Track";
import { Progress } from "@/components/Progress";
import { Quiz } from "@/components/Quiz";
import { Gaps } from "@/components/Gaps";
import { Scan } from "@/components/Scan";

type Tab = "track" | "progress" | "quiz" | "gaps" | "scan";

const TABS: { id: Tab; label: string; icon: typeof ListChecks }[] = [
  { id: "track", label: "Track", icon: ListChecks },
  { id: "progress", label: "Progress", icon: BarChart3 },
  { id: "quiz", label: "Quiz", icon: Brain },
  { id: "gaps", label: "Gaps", icon: Flag },
  { id: "scan", label: "Scan", icon: Radar },
];

export default function Home() {
  const { user, loading, ready, error, signIn, signOut } = useAuth();
  const { state, ready: stateReady, update, newlyEarned, clearNewlyEarned } = useUserState(
    user?.uid ?? null
  );

  const [tab, setTab] = useState<Tab>("track");
  const [confettiKey, setConfettiKey] = useState(0);
  const [banners, setBanners] = useState<string[]>([]);

  const fireConfetti = () => setConfettiKey((k) => k + 1);

  // Drain newly-earned achievements into the banner queue + celebrate.
  useEffect(() => {
    if (newlyEarned.length) {
      setBanners((b) => [...b, ...newlyEarned]);
      fireConfetti();
      clearNewlyEarned();
    }
  }, [newlyEarned, clearNewlyEarned]);

  // --- Firebase not configured ---
  if (!ready) {
    return (
      <Centered>
        <h1 className="text-lg font-bold text-ink">Setup needed</h1>
        <p className="max-w-xs text-sm text-muted">
          Firebase isn&apos;t configured. Copy <code className="text-accent">.env.local.example</code> to{" "}
          <code className="text-accent">.env.local</code> and fill in your{" "}
          <code className="text-accent">NEXT_PUBLIC_FIREBASE_*</code> values, then restart. See the README.
        </p>
      </Centered>
    );
  }

  // --- Auth loading ---
  if (loading) {
    return (
      <Centered>
        <div className="anim-sweep h-8 w-8 rounded-full border-2 border-accent border-t-transparent" />
      </Centered>
    );
  }

  // --- Signed out ---
  if (!user) {
    return (
      <Centered>
        <div className="anim-fadeSlideUp flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15 text-accent">
            <Brain size={30} />
          </div>
          <h1 className="text-xl font-bold text-ink">Agent Pipeline Mastery</h1>
          <p className="max-w-xs text-sm text-muted">
            Your synced learning tracker for agent-pipeline orchestration. Sign in to pick up on any
            device.
          </p>
          <button
            onClick={signIn}
            className="mt-2 flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-bg"
          >
            <LogIn size={16} /> Continue with Google
          </button>
          {error && <p className="text-xs text-red-300">{error}</p>}
        </div>
      </Centered>
    );
  }

  const { done, total } = progressCounts(state);
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 pt-5">
      <Confetti fireKey={confettiKey} />
      <AchievementBanner queue={banners} onDone={() => setBanners((b) => b.slice(1))} />

      {/* Header */}
      <header className="mb-5 flex items-center gap-4">
        <ProgressRing value={pct} size={72} stroke={7} sublabel="frame" />
        <div className="min-w-0 flex-1">
          <div className="font-eyebrow text-[10px] text-accent">agent pipeline mastery</div>
          <h1 className="truncate text-lg font-bold text-ink">
            {done} / {total} complete
          </h1>
          <p className="text-xs text-muted">{pct}% through the frame</p>
        </div>
        <button
          onClick={signOut}
          aria-label="Sign out"
          className="shrink-0 rounded-lg border border-border p-2 text-muted hover:text-ink"
        >
          <LogOut size={16} />
        </button>
      </header>

      {!stateReady ? (
        <div className="flex justify-center pt-16">
          <div className="anim-sweep h-7 w-7 rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : (
        <div className="pb-6">
          {tab === "track" && <Track state={state} update={update} onConfetti={fireConfetti} />}
          {tab === "progress" && <Progress state={state} />}
          {tab === "quiz" && <Quiz state={state} update={update} onConfetti={fireConfetti} />}
          {tab === "gaps" && <Gaps state={state} update={update} />}
          {tab === "scan" && <Scan state={state} update={update} />}
        </div>
      )}

      {/* Bottom tab nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 backdrop-blur"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex max-w-md">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex flex-1 flex-col items-center gap-1 py-2.5 ${
                  active ? "text-accent" : "text-muted"
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.4 : 2} />
                <span className="font-eyebrow text-[9px]">{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      {children}
    </main>
  );
}

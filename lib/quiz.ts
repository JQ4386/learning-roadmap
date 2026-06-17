// lib/quiz.ts — quiz session builder (domain-agnostic).
//
// Three modes:
//   recent  : up to 4 questions whose src items were most recently completed,
//             plus >=1 curveball (prefer a bank question badged FRESH INTEL,
//             else an untouched canon question badged CURVEBALL). Cap 5.
//   cat     : 5 random questions from one category.
//   random  : "Curveball 5" — random across canon + bank questions.
// Option order is always shuffled per question, tracking the correct index.

import { QUESTIONS, type Question } from "@/domain/config";
import type { UserState, BankEntry, BankQuiz } from "@/lib/types";

export type QuizMode = "recent" | "cat" | "random";
export type Badge = "FRESH INTEL" | "CURVEBALL" | null;

export type SessionQuestion = {
  id: string; // canon id, or "bk_<bankId>"
  cat: string;
  q: string;
  opts: string[];
  a: number; // correct index AFTER shuffle
  why: string;
  badge: Badge;
};

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Validate a scout-generated quiz: string q, exactly 4 opts, integer a in 0-3.
export function isValidBankQuiz(quiz: any): quiz is BankQuiz {
  return (
    !!quiz &&
    typeof quiz.q === "string" &&
    quiz.q.trim().length > 0 &&
    Array.isArray(quiz.opts) &&
    quiz.opts.length === 4 &&
    quiz.opts.every((o: any) => typeof o === "string") &&
    Number.isInteger(quiz.a) &&
    quiz.a >= 0 &&
    quiz.a <= 3 &&
    typeof quiz.why === "string"
  );
}

function fromCanon(qn: Question, badge: Badge): SessionQuestion {
  const order = shuffle(qn.opts.map((_, i) => i));
  return {
    id: qn.id,
    cat: qn.cat,
    q: qn.q,
    opts: order.map((i) => qn.opts[i]),
    a: order.indexOf(qn.a),
    why: qn.why,
    badge,
  };
}

function fromBank(entry: BankEntry, badge: Badge): SessionQuestion | null {
  if (!isValidBankQuiz(entry.quiz)) return null;
  const quiz = entry.quiz as BankQuiz;
  const order = shuffle(quiz.opts.map((_, i) => i));
  return {
    id: "bk_" + entry.id,
    cat: entry.cat,
    q: quiz.q,
    opts: order.map((i) => quiz.opts[i]),
    a: order.indexOf(quiz.a),
    why: quiz.why,
    badge,
  };
}

function validBankEntries(state: UserState): BankEntry[] {
  return (state.bank || []).filter((b) => isValidBankQuiz(b.quiz));
}

// Most recent doneAt among a question's src items, or null if none done.
function recencyOf(qn: Question, state: UserState): number | null {
  let best: number | null = null;
  qn.src.forEach((id) => {
    if (state.done[id] && state.doneAt[id]) {
      const t = new Date(state.doneAt[id]).getTime();
      if (best === null || t > best) best = t;
    }
  });
  return best;
}

// Is true if at least one item teaching this question has been completed.
export function hasRecentMaterial(state: UserState): boolean {
  return QUESTIONS.some((q) => recencyOf(q, state) !== null);
}

export function buildSession(mode: QuizMode, state: UserState, catId?: string): SessionQuestion[] {
  if (mode === "cat" && catId) {
    const pool = QUESTIONS.filter((q) => q.cat === catId);
    return shuffle(pool).slice(0, 5).map((q) => fromCanon(q, null));
  }

  if (mode === "random") {
    const canon = QUESTIONS.map((q) => fromCanon(q, null));
    const bank = validBankEntries(state)
      .map((b) => fromBank(b, "FRESH INTEL"))
      .filter((x): x is SessionQuestion => x !== null);
    return shuffle([...canon, ...bank]).slice(0, 5);
  }

  // recent (primary)
  const recent = QUESTIONS.map((q) => ({ q, r: recencyOf(q, state) }))
    .filter((x) => x.r !== null)
    .sort((a, b) => (b.r as number) - (a.r as number))
    .slice(0, 4)
    .map((x) => fromCanon(x.q, null));

  const chosenIds = new Set(recent.map((s) => s.id));

  // Curveball: prefer a fresh bank question, else an untouched canon question.
  let curveball: SessionQuestion | null = null;
  const banks = shuffle(validBankEntries(state));
  for (const b of banks) {
    if (!chosenIds.has("bk_" + b.id)) {
      curveball = fromBank(b, "FRESH INTEL");
      if (curveball) break;
    }
  }
  if (!curveball) {
    const untouched = shuffle(
      QUESTIONS.filter((q) => recencyOf(q, state) === null && !chosenIds.has(q.id))
    );
    if (untouched.length) curveball = fromCanon(untouched[0], "CURVEBALL");
  }

  const session = curveball ? [...recent, curveball] : recent;
  return shuffle(session).slice(0, 5);
}

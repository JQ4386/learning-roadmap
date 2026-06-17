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

/**
 * Creates a shuffled shallow copy of an array.
 *
 * @returns A shuffled shallow copy of `arr`
 */
function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Validates that an object conforms to the BankQuiz structure.
 *
 * Checks for a non-empty string question, exactly 4 string options,
 * an integer answer index between 0 and 3, and an explanation string.
 *
 * @returns `true` if valid, `false` otherwise.
 */
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

/**
 * Creates a session question from a canon question with shuffled option order.
 *
 * @returns A session question with shuffled options and the correct answer index adjusted to reflect the new order
 */
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

/**
 * Converts a bank entry into a session question if its quiz is valid.
 *
 * @param entry - The bank entry to convert
 * @param badge - The badge to apply to the resulting question
 * @returns A session question with shuffled options and remapped correct answer index, or `null` if the entry's quiz is invalid
 */
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

/**
 * Filters bank entries to only those with valid quiz data.
 *
 * @returns Entries from `state.bank` whose `quiz` passes validation.
 */
function validBankEntries(state: UserState): BankEntry[] {
  return (state.bank || []).filter((b) => isValidBankQuiz(b.quiz));
}

/**
 * Finds the most recent completion timestamp among a question's source items.
 *
 * @returns The most recent finite timestamp in milliseconds, or `null` if no completed items are found.
 */
function recencyOf(qn: Question, state: UserState): number | null {
  let best: number | null = null;
  qn.src.forEach((id) => {
    if (state.done[id] && state.doneAt[id]) {
      const t = Date.parse(state.doneAt[id]);
      if (Number.isFinite(t) && (best === null || t > best)) best = t;
    }
  });
  return best;
}

/**
 * Determines whether the quiz pool contains completed questions.
 *
 * @returns `true` if at least one question has been completed, `false` otherwise.
 */
export function hasRecentMaterial(state: UserState): boolean {
  return QUESTIONS.some((q) => recencyOf(q, state) !== null);
}

/**
 * Builds a quiz session of up to 5 shuffled questions according to the specified mode.
 *
 * The composition varies by mode:
 * - `"cat"`: Questions from the specified category.
 * - `"random"`: A mix of canon and validated bank questions.
 * - `"recent"`: Up to 4 most recently completed questions plus an optional new question.
 *
 * @param mode - The session mode.
 * @param state - The user state containing completed questions and bank entries.
 * @param catId - The category ID, required when `mode` is "cat".
 * @returns An array of up to 5 shuffled session questions.
 */
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

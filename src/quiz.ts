import { RANKS, STACK, sameCard, type Card, type Rank, type Suit } from "./stack.ts";

export const SUIT_POSITION_ORDER: readonly Suit[] = ["c", "h", "s", "d"];

/** "position" shows a card and asks where it sits. "card" shows a position and asks which card. */
export type AskFor = "position" | "card";
export type QuestionMode = "cards" | "positions" | "both";

export interface Question {
  position: number;
  card: Card;
  askFor: AskFor;
}

export interface Range {
  from: number;
  to: number;
}

export interface CardPerformance {
  misses: number;
  correctAnswers: number;
  correctTimeMs: number;
}

export type CardPerformanceRecord = Partial<Record<number, CardPerformance>>;

export interface SuitPosition {
  suit: Suit;
  position: number;
}

export function normalizeCardPerformanceRecord(value: unknown): CardPerformanceRecord {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return {};

  const normalized: CardPerformanceRecord = {};
  for (const [positionText, entry] of Object.entries(value)) {
    const position = Number(positionText);
    if (!Number.isInteger(position) || position < 1 || position > STACK.length) continue;
    if (entry == null || typeof entry !== "object" || Array.isArray(entry)) continue;
    const stats = entry as Record<string, unknown>;
    const misses = stats.misses;
    const correctAnswers = stats.correctAnswers;
    const correctTimeMs = stats.correctTimeMs;
    if (
      typeof misses !== "number" || !Number.isInteger(misses) || misses < 0 ||
      typeof correctAnswers !== "number" || !Number.isInteger(correctAnswers) || correctAnswers < 0 ||
      typeof correctTimeMs !== "number" || !Number.isFinite(correctTimeMs) || correctTimeMs < 0
    ) {
      continue;
    }
    normalized[position] = {
      misses,
      correctAnswers,
      correctTimeMs,
    };
  }
  return normalized;
}

export function recordCardAnswer(
  record: CardPerformanceRecord,
  position: number,
  correct: boolean,
  elapsedMs: number,
): CardPerformanceRecord {
  if (!Number.isInteger(position) || position < 1 || position > STACK.length) {
    throw new RangeError(`Invalid card position: ${position}`);
  }
  if (!Number.isFinite(elapsedMs)) throw new RangeError(`Invalid response time: ${elapsedMs}`);
  const previous = record[position] ?? { misses: 0, correctAnswers: 0, correctTimeMs: 0 };
  const next = { ...record };
  next[position] = correct
    ? {
        ...previous,
        correctAnswers: previous.correctAnswers + 1,
        correctTimeMs: previous.correctTimeMs + Math.max(0, elapsedMs),
      }
    : { ...previous, misses: previous.misses + 1 };
  return next;
}

export function priorityPositions(
  record: CardPerformanceRecord,
  from = 1,
  to = STACK.length,
  limit = 10,
): number[] {
  if (!Number.isInteger(limit) || limit < 0) throw new RangeError(`Invalid focus list size: ${limit}`);
  const eligiblePositions = Object.keys(record)
    .map(Number)
    .filter((position) =>
      Number.isInteger(position) &&
      position >= 1 &&
      position <= STACK.length &&
      position >= from &&
      position <= to
    );
  const byMisses = eligiblePositions
    .filter((position) => (record[position]?.misses ?? 0) > 0)
    .sort((left, right) =>
      (record[right]?.misses ?? 0) - (record[left]?.misses ?? 0) || left - right
    )
    .slice(0, limit);
  const byAverageTime = eligiblePositions
    .filter((position) => (record[position]?.correctAnswers ?? 0) > 0)
    .sort((left, right) => {
      const leftStats = record[left]!;
      const rightStats = record[right]!;
      const averageDifference =
        rightStats.correctTimeMs / rightStats.correctAnswers -
        leftStats.correctTimeMs / leftStats.correctAnswers;
      return averageDifference || left - right;
    })
    .slice(0, limit);
  return [...new Set([...byMisses, ...byAverageTime])];
}

export function toggleQuestionMode(
  current: QuestionMode,
  toggled: "cards" | "positions",
): QuestionMode {
  const cardsEnabled = current === "cards" || current === "both";
  const positionsEnabled = current === "positions" || current === "both";
  let nextCardsEnabled = toggled === "cards" ? !cardsEnabled : cardsEnabled;
  let nextPositionsEnabled = toggled === "positions" ? !positionsEnabled : positionsEnabled;

  if (!nextCardsEnabled && !nextPositionsEnabled) {
    if (toggled === "cards") nextPositionsEnabled = true;
    else nextCardsEnabled = true;
  }

  return nextCardsEnabled
    ? nextPositionsEnabled ? "both" : "cards"
    : "positions";
}

export function positionsForRank(rank: Rank): SuitPosition[] {
  return SUIT_POSITION_ORDER.map((suit) => ({
    suit,
    position: STACK.findIndex((card) => card.rank === rank && card.suit === suit) + 1,
  }));
}

export function pickSuitPositionRank(
  previous: Rank | null,
  random: () => number = Math.random,
): Rank {
  const pool = RANKS.filter((rank) => rank !== previous);
  return pool[Math.floor(random() * pool.length)];
}

export function clampPosition(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(52, Math.max(1, Math.round(n)));
}

/** Ranges always span at least two positions so consecutive questions never repeat. */
export function normalizeRange(from: number, to: number): Range {
  let start = clampPosition(from);
  let end = clampPosition(to);
  if (start > end) [start, end] = [end, start];
  if (start === end) {
    if (end < 52) end += 1;
    else start -= 1;
  }
  return { from: start, to: end };
}

/** Never returns the previous position, and therefore never the previous card. */
export function pickQuestion(
  from: number,
  to: number,
  previous: number | null,
  random: () => number = Math.random,
  mode: QuestionMode = "both",
): Question {
  const range = normalizeRange(from, to);
  const positions = Array.from(
    { length: range.to - range.from + 1 },
    (_, index) => range.from + index,
  );
  return pickQuestionFromPositions(positions, previous, random, mode);
}

export function pickQuestionFromPositions(
  positions: readonly number[],
  previous: number | null,
  random: () => number = Math.random,
  mode: QuestionMode = "both",
): Question {
  if (positions.length === 0) throw new Error("Cannot pick a question from an empty position list.");
  const uniquePositions = [...new Set(positions)];
  if (uniquePositions.some((position) =>
    !Number.isInteger(position) || position < 1 || position > STACK.length
  )) {
    throw new RangeError("Question positions must be integers between 1 and 52.");
  }
  const pool = uniquePositions.filter((position) => position !== previous);
  const choices = pool.length > 0 ? pool : uniquePositions;

  const position = choices[Math.floor(random() * choices.length)];
  const askFor = mode === "both"
    ? (random() < 0.5 ? "position" : "card")
    : mode === "positions" ? "position" : "card";
  return { position, card: STACK[position - 1], askFor };
}

export function buildRaceQuestions(
  from: number,
  to: number,
  random: () => number = Math.random,
  mode: QuestionMode = "both",
): Question[] {
  const range = normalizeRange(from, to);
  const positions = Array.from({ length: range.to - range.from + 1 }, (_, index) => range.from + index);
  return buildRaceQuestionsFromPositions(positions, random, mode);
}

export function buildRaceQuestionsFromPositions(
  positions: readonly number[],
  random: () => number = Math.random,
  mode: QuestionMode = "both",
): Question[] {
  const questions: Question[] = [];

  const uniquePositions = [...new Set(positions)];
  if (uniquePositions.some((position) =>
    !Number.isInteger(position) || position < 1 || position > STACK.length
  )) {
    throw new RangeError("Race positions must be integers between 1 and 52.");
  }

  for (const position of uniquePositions) {
    const card = STACK[position - 1];
    if (mode === "positions" || mode === "both") {
      questions.push({ position, card, askFor: "position" });
    }
    if (mode === "cards" || mode === "both") {
      questions.push({ position, card, askFor: "card" });
    }
  }

  for (let index = questions.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [questions[index], questions[swapIndex]] = [questions[swapIndex], questions[index]];
  }

  return questions;
}

export function isRightPosition(question: Question, answer: number): boolean {
  return answer === question.position;
}

export function isRightCard(question: Question, answer: Card | null): boolean {
  return answer != null && sameCard(answer, question.card);
}

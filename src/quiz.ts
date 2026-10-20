import { STACK, sameCard, type Card } from "./stack.ts";

/** "position" shows a card and asks where it sits. "card" shows a position and asks which card. */
export type AskFor = "position" | "card";

export interface Question {
  position: number;
  card: Card;
  askFor: AskFor;
}

export interface Range {
  from: number;
  to: number;
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
): Question {
  const range = normalizeRange(from, to);
  const pool: number[] = [];
  for (let position = range.from; position <= range.to; position += 1) {
    if (position !== previous) pool.push(position);
  }

  const position = pool[Math.floor(random() * pool.length)];
  const askFor: AskFor = random() < 0.5 ? "position" : "card";
  return { position, card: STACK[position - 1], askFor };
}

export function buildRaceQuestions(
  from: number,
  to: number,
  random: () => number = Math.random,
): Question[] {
  const range = normalizeRange(from, to);
  const questions: Question[] = [];

  for (let position = range.from; position <= range.to; position += 1) {
    const card = STACK[position - 1];
    questions.push(
      { position, card, askFor: "position" },
      { position, card, askFor: "card" },
    );
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

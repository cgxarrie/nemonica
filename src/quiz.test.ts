import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRaceQuestions,
  clampPosition,
  isRightCard,
  isRightPosition,
  normalizeRange,
  pickQuestion,
  pickSuitPositionRank,
  positionsForRank,
  toggleQuestionMode,
  type QuestionMode,
  SUIT_POSITION_ORDER,
} from "./quiz.ts";
import { STACK, cardCode, type Rank } from "./stack.ts";

test("stack is the Mnemónica order", () => {
  assert.equal(STACK.length, 52);
  assert.equal(cardCode(STACK[0]), "4c");
  assert.equal(cardCode(STACK[5]), "6d");
  assert.equal(cardCode(STACK[6]), "As");
  assert.equal(cardCode(STACK[12]), "Qc");
  assert.equal(cardCode(STACK[25]), "Kd");
  assert.equal(cardCode(STACK[26]), "2c");
  assert.equal(cardCode(STACK[38]), "Ad");
  assert.equal(cardCode(STACK[49]), "6c");
  assert.equal(cardCode(STACK[50]), "Ah");
  assert.equal(cardCode(STACK[51]), "9d");
});

test("normalizeRange clamps and orders the ends", () => {
  assert.deepEqual(normalizeRange(0, 99), { from: 1, to: 52 });
  assert.deepEqual(normalizeRange(20, 10), { from: 10, to: 20 });
  assert.deepEqual(normalizeRange(3.6, 8.2), { from: 4, to: 8 });
  assert.deepEqual(normalizeRange(Number.NaN, 10), { from: 1, to: 10 });
  assert.equal(clampPosition(52.4), 52);
});

test("normalizeRange always spans at least two positions", () => {
  assert.deepEqual(normalizeRange(5, 5), { from: 5, to: 6 });
  assert.deepEqual(normalizeRange(52, 52), { from: 51, to: 52 });
  assert.deepEqual(normalizeRange(1, 1), { from: 1, to: 2 });
});

test("pickQuestion stays inside the range and avoids the previous position", () => {
  const question = pickQuestion(14, 16, 14, () => 0);
  assert.equal(question.position, 15);
  assert.equal(cardCode(question.card), cardCode(STACK[14]));
  assert.equal(question.askFor, "position");
});

test("consecutive questions never repeat a position or card", () => {
  for (const [from, to] of [[1, 2], [51, 52], [7, 9], [1, 52]]) {
    let previous = pickQuestion(from, to, null);
    for (let i = 0; i < 500; i += 1) {
      const next = pickQuestion(from, to, previous.position);
      assert.notEqual(next.position, previous.position);
      assert.notEqual(cardCode(next.card), cardCode(previous.card));
      previous = next;
    }
  }
});

test("answers match the asked card and position", () => {
  const question = { position: 1, card: STACK[0], askFor: "position" as const };
  assert.equal(isRightPosition(question, 1), true);
  assert.equal(isRightPosition(question, 2), false);
  assert.equal(isRightCard(question, STACK[0]), true);
  assert.equal(isRightCard(question, STACK[1]), false);
  assert.equal(isRightCard(question, null), false);
});

test("random questions never leave the requested range", () => {
  for (let i = 0; i < 200; i += 1) {
    const question = pickQuestion(27, 39, null);
    assert.ok(question.position >= 27 && question.position <= 39);
    assert.equal(cardCode(question.card), cardCode(STACK[question.position - 1]));
    assert.ok(question.askFor === "position" || question.askFor === "card");
  }
});

test("practice question mode selects the requested question direction", () => {
  const cards = pickQuestion(1, 10, null, () => 0, "cards");
  const positions = pickQuestion(1, 10, null, () => 0, "positions");
  const both = pickQuestion(1, 10, null, () => 0, "both");
  assert.equal(cards.askFor, "card");
  assert.equal(positions.askFor, "position");
  assert.equal(both.askFor, "position");
});

test("race questions ask each position and card once in a shuffled order", () => {
  const questions = buildRaceQuestions(3, 7);
  assert.equal(questions.length, 10);

  for (let position = 3; position <= 7; position += 1) {
    assert.equal(questions.filter((question) => question.position === position).length, 2);
    assert.equal(
      questions.filter((question) => question.position === position && question.askFor === "position")
        .length,
      1,
    );
    assert.equal(
      questions.filter((question) => question.position === position && question.askFor === "card")
        .length,
      1,
    );
  }
});

test("race questions include only the selected question direction", () => {
  const expected: Record<"cards" | "positions", "card" | "position"> = {
    cards: "card",
    positions: "position",
  };
  for (const mode of ["cards", "positions"] as const) {
    const questions = buildRaceQuestions(3, 7, () => 0, mode);
    assert.equal(questions.length, 5);
    assert.ok(questions.every((question) => question.askFor === expected[mode]));
  }

  assert.equal(buildRaceQuestions(3, 7, () => 0, "both").length, 10);
});

test("question type toggles always leave at least one type active", () => {
  assert.equal(toggleQuestionMode("both", "cards"), "positions");
  assert.equal(toggleQuestionMode("both", "positions"), "cards");
  assert.equal(toggleQuestionMode("cards", "cards"), "positions");
  assert.equal(toggleQuestionMode("positions", "positions"), "cards");
  assert.equal(toggleQuestionMode("cards", "positions"), "both");
  assert.equal(toggleQuestionMode("positions", "cards"), "both");
});

test("race question order can be controlled for deterministic tests", () => {
  const questions = buildRaceQuestions(1, 2, () => 0);
  assert.deepEqual(
    questions.map(({ position, askFor }) => `${position}-${askFor}`),
    ["1-card", "2-position", "2-card", "1-position"],
  );
});

test("suit positions are returned in Clubs, Hearts, Spades, Diamonds order", () => {
  assert.deepEqual(SUIT_POSITION_ORDER, ["c", "h", "s", "d"]);
  const positions = positionsForRank("A");
  assert.deepEqual(
    positions.map(({ suit }) => suit),
    ["c", "h", "s", "d"],
  );
  for (const { suit, position } of positions) {
    assert.equal(STACK[position - 1].rank, "A");
    assert.equal(STACK[position - 1].suit, suit);
  }
});

test("suit-position rank selection avoids repeating the previous rank", () => {
  for (const rank of ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"] as Rank[]) {
    const next = pickSuitPositionRank(rank, () => 0);
    assert.notEqual(next, rank);
  }
});

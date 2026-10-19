import assert from "node:assert/strict";
import test from "node:test";
import { clampPosition, isRightCard, isRightPosition, normalizeRange, pickQuestion } from "./quiz.ts";
import { STACK, cardCode } from "./stack.ts";

test("stack is the Mnemonica order", () => {
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

import {
  RANKS,
  STACK,
  SUIT_NAME,
  SUIT_SYMBOL,
  cardLabel,
  cardSpoken,
  isRed,
  type Card,
  type Rank,
  type Suit,
} from "./stack.ts";
import {
  isRightCard,
  isRightPosition,
  normalizeRange,
  pickQuestion,
  type Question,
  type Range,
} from "./quiz.ts";

const STORAGE_KEY = "nemonica-range";
const AUTO_ADVANCE_MS = 1200;

const scoreValue = must<HTMLElement>("#score-value");
const scoreMeta = must<HTMLElement>("#score-meta");
const resetScore = must<HTMLButtonElement>("#reset-score");
const fromInput = must<HTMLInputElement>("#from-input");
const toInput = must<HTMLInputElement>("#to-input");
const fromDec = must<HTMLButtonElement>("#from-dec");
const fromInc = must<HTMLButtonElement>("#from-inc");
const toDec = must<HTMLButtonElement>("#to-dec");
const toInc = must<HTMLButtonElement>("#to-inc");
const rangeSummary = must<HTMLElement>("#range-summary");
const presets = must<HTMLElement>("#presets");
const tabPractice = must<HTMLButtonElement>("#tab-practice");
const tabStack = must<HTMLButtonElement>("#tab-stack");
const practice = must<HTMLElement>("#practice");
const stackView = must<HTMLElement>("#stack-view");
const prompt = must<HTMLElement>("#prompt");
const ask = must<HTMLElement>("#ask");
const positionEntry = must<HTMLElement>("#position-entry");
const cardEntry = must<HTMLElement>("#card-entry");
const positionPreview = must<HTMLElement>("#position-preview");
const positionOk = must<HTMLButtonElement>("#position-ok");
const keypad = must<HTMLElement>("#keypad");
const cardPreview = must<HTMLElement>("#card-preview");
const ranksEl = must<HTMLElement>("#ranks");
const suitsEl = must<HTMLElement>("#suits");
const checkCard = must<HTMLButtonElement>("#check-card");
const feedbackBlock = must<HTMLElement>("#feedback-block");
const feedback = must<HTMLElement>("#feedback");
const nextButton = must<HTMLButtonElement>("#next");
const stackGrid = must<HTMLElement>("#stack-grid");
const stackNote = must<HTMLElement>("#stack-note");

type Phase = "answering" | "feedback";
type View = "practice" | "stack";

interface Result {
  right: boolean;
  positionAnswer: number | null;
  cardAnswer: Card | null;
}

const initialRange = loadRange();

const state: {
  from: number;
  to: number;
  question: Question;
  phase: Phase;
  view: View;
  correct: number;
  attempts: number;
  streak: number;
  draft: string;
  rank: Rank | null;
  suit: Suit | null;
  pendingTen: boolean;
  result: Result | null;
  timer: number | null;
  token: number;
} = {
  from: initialRange.from,
  to: initialRange.to,
  question: pickQuestion(initialRange.from, initialRange.to, null),
  phase: "answering",
  view: "practice",
  correct: 0,
  attempts: 0,
  streak: 0,
  draft: "",
  rank: null,
  suit: null,
  pendingTen: false,
  result: null,
  timer: null,
  token: 0,
};

buildRankButtons();
buildSuitButtons();
buildStack();
bindEvents();
render();

function must<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing ${selector}`);
  return element;
}

function loadRange(): Range {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { from: 1, to: 52 };
    const parsed = JSON.parse(raw) as Partial<Range>;
    return normalizeRange(Number(parsed.from), Number(parsed.to));
  } catch {
    return { from: 1, to: 52 };
  }
}

function persistRange(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ from: state.from, to: state.to }));
}

function buildRankButtons(): void {
  for (const rank of RANKS) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = rank;
    button.dataset.rank = rank;
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => selectRank(rank));
    ranksEl.append(button);
  }
}

function buildSuitButtons(): void {
  for (const suit of ["c", "h", "s", "d"] as const) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = SUIT_SYMBOL[suit];
    button.dataset.suit = suit;
    button.className = isRed(suit) ? "red" : "black";
    button.setAttribute("aria-label", SUIT_NAME[suit]);
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => selectSuit(suit));
    suitsEl.append(button);
  }
}

function buildStack(): void {
  STACK.forEach((card, index) => {
    const item = document.createElement("li");
    item.className = "stack-card";
    item.dataset.position = String(index + 1);
    item.setAttribute("aria-label", `${index + 1}, ${cardSpoken(card)}`);

    const position = document.createElement("span");
    position.className = "pos";
    position.textContent = String(index + 1);

    const name = document.createElement("span");
    name.className = `mini ${isRed(card.suit) ? "red" : "black"}`;
    name.textContent = cardLabel(card);

    item.append(position, name);
    stackGrid.append(item);
  });
}

function bindEvents(): void {
  fromDec.addEventListener("click", () => {
    if (state.from > 1) updateRange({ from: state.from - 1, to: state.to });
  });
  fromInc.addEventListener("click", () => {
    if (state.from < state.to - 1) updateRange({ from: state.from + 1, to: state.to });
  });
  toDec.addEventListener("click", () => {
    if (state.to > state.from + 1) updateRange({ from: state.from, to: state.to - 1 });
  });
  toInc.addEventListener("click", () => {
    if (state.to < 52) updateRange({ from: state.from, to: state.to + 1 });
  });

  for (const input of [fromInput, toInput]) {
    input.addEventListener("focus", () => input.select());
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        input.blur();
      }
    });
    input.addEventListener("blur", commitTypedRange);
  }

  presets.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest("button");
    if (!button) return;
    updateRange(normalizeRange(Number(button.dataset.from), Number(button.dataset.to)));
  });

  tabPractice.addEventListener("click", () => setView("practice"));
  tabStack.addEventListener("click", () => setView("stack"));
  resetScore.addEventListener("click", resetSession);
  keypad.addEventListener("click", onKeypad);
  checkCard.addEventListener("click", submitCard);
  nextButton.addEventListener("click", advance);
  document.addEventListener("keydown", onKeyDown);
}

function commitTypedRange(): void {
  const fromRaw = fromInput.value.trim();
  const toRaw = toInput.value.trim();
  if (!/^\d{1,2}$/.test(fromRaw) || !/^\d{1,2}$/.test(toRaw)) {
    syncRangeInputs(true);
    return;
  }
  updateRange(normalizeRange(Number(fromRaw), Number(toRaw)));
  syncRangeInputs(true);
}

function updateRange(range: Range): void {
  const next = normalizeRange(range.from, range.to);
  const changed = next.from !== state.from || next.to !== state.to;
  state.from = next.from;
  state.to = next.to;
  persistRange();
  syncRangeInputs();
  renderPresets();
  renderStackState();
  if (!changed) return;

  const position = state.question.position;
  if (state.phase === "answering" && (position < next.from || position > next.to)) {
    clearTimer();
    state.question = pickQuestion(next.from, next.to, position);
    clearAnswer();
    renderQuestion();
  }
}

function syncRangeInputs(force = false): void {
  if (force || document.activeElement !== fromInput) fromInput.value = String(state.from);
  if (force || document.activeElement !== toInput) toInput.value = String(state.to);
  rangeSummary.textContent = `${state.from}–${state.to}`;
  fromDec.disabled = state.from <= 1;
  fromInc.disabled = state.from >= state.to - 1;
  toDec.disabled = state.to <= state.from + 1;
  toInc.disabled = state.to >= 52;
}

function setView(view: View): void {
  state.view = view;
  practice.hidden = view !== "practice";
  stackView.hidden = view !== "stack";
  tabPractice.setAttribute("aria-selected", String(view === "practice"));
  tabStack.setAttribute("aria-selected", String(view === "stack"));
}

function resetSession(): void {
  state.correct = 0;
  state.attempts = 0;
  state.streak = 0;
  renderScore();
}

function selectRank(rank: Rank): void {
  if (state.phase !== "answering" || state.question.askFor !== "card") return;
  state.rank = state.rank === rank ? null : rank;
  state.pendingTen = false;
  renderSelection();
}

function selectSuit(suit: Suit): void {
  if (state.phase !== "answering" || state.question.askFor !== "card") return;
  state.suit = state.suit === suit ? null : suit;
  state.pendingTen = false;
  renderSelection();
}

function onKeypad(event: Event): void {
  const button = (event.target as HTMLElement).closest("button");
  if (!button || state.phase !== "answering" || state.question.askFor !== "position") return;
  if (button.dataset.digit) pushDigit(button.dataset.digit);
  if (button.dataset.action === "back") backspace();
  if (button.dataset.action === "ok") submitPosition();
}

function pushDigit(digit: string): void {
  if (state.draft === "") {
    if (digit === "0") return;
    state.draft = digit;
  } else if (state.draft.length < 2) {
    const next = Number(state.draft + digit);
    if (next > 52) return;
    state.draft = String(next);
  }
  renderDraft();
}

function backspace(): void {
  state.draft = state.draft.slice(0, -1);
  renderDraft();
}

function submitPosition(): void {
  if (state.phase !== "answering" || state.question.askFor !== "position") return;
  if (!/^\d+$/.test(state.draft)) return;
  const answer = Number(state.draft);
  if (answer < 1 || answer > 52) return;
  settle(isRightPosition(state.question, answer), answer, null);
}

function submitCard(): void {
  if (state.phase !== "answering" || state.question.askFor !== "card") return;
  if (!state.rank || !state.suit) return;
  const answer = { rank: state.rank, suit: state.suit };
  settle(isRightCard(state.question, answer), null, answer);
}

function settle(right: boolean, positionAnswer: number | null, cardAnswer: Card | null): void {
  clearTimer();
  state.phase = "feedback";
  state.attempts += 1;
  if (right) {
    state.correct += 1;
    state.streak += 1;
  } else {
    state.streak = 0;
  }
  state.result = { right, positionAnswer, cardAnswer };
  render();
  if (right) armAutoAdvance();
  else nextButton.focus();
}

function armAutoAdvance(): void {
  clearTimer();
  const token = state.token;
  state.timer = window.setTimeout(() => {
    if (token !== state.token) return;
    advance();
  }, AUTO_ADVANCE_MS);
}

function clearTimer(): void {
  if (state.timer != null) {
    window.clearTimeout(state.timer);
    state.timer = null;
  }
}

function advance(): void {
  state.token += 1;
  clearTimer();
  state.phase = "answering";
  state.result = null;
  state.question = pickQuestion(state.from, state.to, state.question.position);
  clearAnswer();
  render();
}

function clearAnswer(): void {
  state.draft = "";
  state.rank = null;
  state.suit = null;
  state.pendingTen = false;
}

function render(): void {
  syncRangeInputs();
  renderPresets();
  renderScore();
  renderQuestion();
  renderStackState();
}

function renderScore(): void {
  scoreValue.textContent = `${state.correct}/${state.attempts}`;
  if (state.attempts === 0) {
    scoreMeta.textContent = "Listo";
  } else {
    const percent = Math.round((state.correct / state.attempts) * 100);
    scoreMeta.textContent = state.streak > 1 ? `${percent}% · racha de ${state.streak}` : `${percent}%`;
  }
  resetScore.hidden = state.attempts === 0;
}

function renderPresets(): void {
  for (const button of presets.querySelectorAll("button")) {
    const selected = Number(button.dataset.from) === state.from && Number(button.dataset.to) === state.to;
    button.setAttribute("aria-pressed", String(selected));
  }
}

function renderQuestion(): void {
  const question = state.question;
  const answering = state.phase === "answering";
  const result = state.result;
  prompt.replaceChildren();

  if (question.askFor === "position") {
    ask.textContent = answering ? "¿Qué posición?" : "";
    practice.setAttribute("aria-label", `${cardSpoken(question.card)}. ¿Qué posición?`);
  } else {
    ask.textContent = answering ? "¿Qué carta?" : "";
    practice.setAttribute("aria-label", `Posición ${question.position}. ¿Qué carta?`);
  }

  prompt.append(flipCard(question, result));
  positionEntry.hidden = !(answering && question.askFor === "position");
  cardEntry.hidden = !(answering && question.askFor === "card");
  feedbackBlock.hidden = answering;

  prompt.classList.remove("swap");
  void prompt.offsetWidth;
  prompt.classList.add("swap");

  renderDraft();
  renderSelection();
  if (result) renderFeedback(result);
}

function flipCard(question: Question, result: Result | null): HTMLElement {
  const card = document.createElement("div");
  card.className = "flip-card";
  card.setAttribute("aria-hidden", "true");

  const inner = document.createElement("div");
  inner.className = `flip-card-inner${result ? " is-flipped" : ""}`;

  const front = document.createElement("div");
  front.className = "flip-face flip-front";
  const back = document.createElement("div");
  back.className = "flip-face flip-back";

  if (question.askFor === "position") {
    front.append(playingCard(question.card));
    back.append(positionCardBack(question.position));
  } else {
    front.append(positionCard(question.position));
    back.append(playingCard(question.card));
  }

  if (result) back.append(feedbackMark(result.right));
  inner.append(front, back);
  card.append(inner);
  return card;
}

function positionCard(position: number): HTMLElement {
  const face = document.createElement("div");
  face.className = "position-card";

  const kicker = document.createElement("span");
  kicker.className = "kicker";
  kicker.textContent = "Posición";

  const mark = document.createElement("span");
  mark.className = "position-mark";
  mark.textContent = String(position);

  face.append(kicker, mark);
  return face;
}

function positionCardBack(position: number): HTMLElement {
  const back = document.createElement("div");
  back.className = "card-back";

  const mark = document.createElement("span");
  mark.className = "back-position";
  mark.textContent = String(position);
  back.append(mark);
  return back;
}

function feedbackMark(right: boolean): HTMLElement {
  const mark = document.createElement("span");
  mark.className = `feedback-mark ${right ? "good" : "bad"}`;
  mark.textContent = right ? "✓" : "✕";
  return mark;
}

function playingCard(card: Card): HTMLElement {
  const face = document.createElement("div");
  face.className = `playing-card ${isRed(card.suit) ? "red" : "black"}`;
  face.setAttribute("aria-hidden", "true");

  const top = document.createElement("span");
  top.className = "corner top";
  top.textContent = cardLabel(card);

  const pip = document.createElement("span");
  pip.className = "pip";
  pip.textContent = SUIT_SYMBOL[card.suit];

  const bottom = document.createElement("span");
  bottom.className = "corner bottom";
  bottom.textContent = cardLabel(card);

  face.append(top, pip, bottom);
  return face;
}

function renderDraft(): void {
  const empty = state.draft === "";
  positionPreview.textContent = empty ? "—" : state.draft;
  positionPreview.classList.toggle("placeholder", empty);
  positionOk.disabled = empty;
}

function renderSelection(): void {
  for (const button of ranksEl.querySelectorAll("button")) {
    button.setAttribute("aria-pressed", String(button.dataset.rank === state.rank));
  }
  for (const button of suitsEl.querySelectorAll("button")) {
    button.setAttribute("aria-pressed", String(button.dataset.suit === state.suit));
  }

  const ready = state.rank != null && state.suit != null;
  checkCard.disabled = !ready;
  cardPreview.className = "typed";
  if (ready && state.rank && state.suit) {
    cardPreview.classList.add(isRed(state.suit) ? "red" : "black");
    cardPreview.textContent = cardLabel({ rank: state.rank, suit: state.suit });
    return;
  }
  cardPreview.classList.add("placeholder");
  if (state.rank) cardPreview.textContent = state.rank;
  else if (state.suit) {
    cardPreview.textContent = SUIT_SYMBOL[state.suit];
    cardPreview.classList.add(isRed(state.suit) ? "red" : "black");
  } else cardPreview.textContent = "Valor y palo";
}

function renderFeedback(result: Result): void {
  const question = state.question;
  feedback.replaceChildren();
  feedback.className = `feedback ${result.right ? "good" : "bad"}`;

  const title = document.createElement("span");
  title.className = "feedback-title";
  title.textContent = result.right ? "Correcto" : "Incorrecto";
  feedback.append(title);

  const detail = document.createElement("span");
  if (!result.right && question.askFor === "position") {
    detail.textContent = `Respuesta correcta: posición ${question.position}.`;
  } else if (!result.right) {
    detail.append("Respuesta correcta: ", cardSpan(question.card), ".");
  } else if (question.askFor === "position") {
    detail.append(cardSpan(question.card), ` es la posición ${question.position}.`);
  } else {
    detail.append(`La posición ${question.position} es `, cardSpan(question.card), ".");
  }
  feedback.append(detail);

  if (!result.right) {
    const yours = document.createElement("span");
    yours.className = "you-said";
    if (result.positionAnswer != null) {
      yours.textContent = `Has dicho ${result.positionAnswer}.`;
    } else if (result.cardAnswer) {
      yours.append("Has dicho ", cardSpan(result.cardAnswer), ".");
    }
    feedback.append(yours);

    const continueHint = document.createElement("span");
    continueHint.className = "you-said";
    continueHint.textContent = "Pulsa Siguiente para continuar.";
    feedback.append(continueHint);
  }
}

function cardSpan(card: Card): HTMLElement {
  const span = document.createElement("span");
  span.className = `inline-card ${isRed(card.suit) ? "red" : "black"}`;
  span.textContent = cardLabel(card);
  return span;
}

function renderStackState(): void {
  const partial = !(state.from === 1 && state.to === 52);
  for (const item of stackGrid.querySelectorAll<HTMLElement>(".stack-card")) {
    const position = Number(item.dataset.position);
    const inside = position >= state.from && position <= state.to;
    item.classList.toggle("in", partial && inside);
    item.classList.toggle("out", !inside);
  }
  const count = state.to - state.from + 1;
  stackNote.textContent = partial
    ? `El rango ${state.from}–${state.to} (${count} cartas) está resaltado.`
    : "Las 52 posiciones están en el rango de práctica.";
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const target = event.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;

  if (state.phase === "feedback") {
    if (event.key === "Enter") {
      event.preventDefault();
      advance();
    }
    return;
  }

  if (state.view !== "practice") return;

  if (state.question.askFor === "position") {
    if (/^[0-9]$/.test(event.key)) {
      event.preventDefault();
      pushDigit(event.key);
    } else if (event.key === "Backspace") {
      event.preventDefault();
      backspace();
    } else if (event.key === "Enter") {
      event.preventDefault();
      submitPosition();
    }
    return;
  }

  const key = event.key.toLowerCase();
  if (key === "enter") {
    event.preventDefault();
    submitCard();
    return;
  }
  if (key === "backspace" || key === "escape") {
    event.preventDefault();
    state.rank = null;
    state.suit = null;
    state.pendingTen = false;
    renderSelection();
    return;
  }
  if (key === "1") {
    state.pendingTen = true;
    return;
  }
  if ((key === "0" && state.pendingTen) || key === "t" || (key === "0" && !state.pendingTen)) {
    state.rank = "10";
    state.pendingTen = false;
    renderSelection();
    return;
  }

  const ranks: Record<string, Rank> = {
    a: "A",
    "2": "2",
    "3": "3",
    "4": "4",
    "5": "5",
    "6": "6",
    "7": "7",
    "8": "8",
    "9": "9",
    j: "J",
    q: "Q",
    k: "K",
  };
  if (ranks[key]) {
    state.rank = ranks[key];
    state.pendingTen = false;
    renderSelection();
    return;
  }

  const suits: Record<string, Suit> = { s: "s", h: "h", d: "d", c: "c" };
  if (suits[key]) {
    state.suit = suits[key];
    state.pendingTen = false;
    renderSelection();
  }
}

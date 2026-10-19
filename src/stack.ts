/** Juan Tamariz's Mnemonica order, positions 1 through 52. */
export const RANKS = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
] as const;

export const SUITS = ["s", "h", "d", "c"] as const;

export type Rank = (typeof RANKS)[number];
export type Suit = (typeof SUITS)[number];

export interface Card {
  rank: Rank;
  suit: Suit;
}

const CODES = [
  "4c", "2h", "7d", "3c", "4h", "6d", "As", "5h", "9s", "2s", "Qh", "3d", "Qc",
  "8h", "6s", "5s", "9h", "Kc", "2d", "Jh", "3s", "8s", "6h", "10c", "5d", "Kd",
  "2c", "3h", "8d", "5c", "Ks", "Jd", "8c", "10s", "Kh", "Jc", "7s", "10h", "Ad",
  "4s", "7h", "4d", "Ac", "9c", "Js", "Qd", "7c", "Qs", "10d", "6c", "Ah", "9d",
];

export const SUIT_SYMBOL: Record<Suit, string> = {
  s: "♠",
  h: "♥",
  d: "♦",
  c: "♣",
};

export const SUIT_NAME: Record<Suit, string> = {
  s: "picas",
  h: "corazones",
  d: "diamantes",
  c: "tréboles",
};

const RANK_NAME: Record<Rank, string> = {
  A: "as",
  "2": "dos",
  "3": "tres",
  "4": "cuatro",
  "5": "cinco",
  "6": "seis",
  "7": "siete",
  "8": "ocho",
  "9": "nueve",
  "10": "diez",
  J: "jota",
  Q: "reina",
  K: "rey",
};

function isRank(value: string): value is Rank {
  return (RANKS as readonly string[]).includes(value);
}

function isSuit(value: string): value is Suit {
  return (SUITS as readonly string[]).includes(value);
}

function parseCard(code: string): Card {
  const suit = code.slice(-1);
  const rank = code.slice(0, -1);
  if (!isSuit(suit) || !isRank(rank)) {
    throw new Error(`Bad card code: ${code}`);
  }
  return { rank, suit };
}

export function cardCode(card: Card): string {
  return `${card.rank}${card.suit}`;
}

export function cardLabel(card: Card): string {
  return `${card.rank}${SUIT_SYMBOL[card.suit]}`;
}

export function cardSpoken(card: Card): string {
  return `${RANK_NAME[card.rank]} de ${SUIT_NAME[card.suit]}`;
}

export function isRed(suit: Suit): boolean {
  return suit === "h" || suit === "d";
}

export function sameCard(a: Card, b: Card): boolean {
  return a.rank === b.rank && a.suit === b.suit;
}

export const STACK: Card[] = CODES.map(parseCard);

function assertValidStack(cards: Card[]): void {
  if (cards.length !== 52) {
    throw new Error(`Expected 52 cards, got ${cards.length}`);
  }
  const seen = new Set<string>();
  for (const card of cards) {
    const code = cardCode(card);
    if (seen.has(code)) throw new Error(`Duplicate card ${code}`);
    seen.add(code);
  }
  for (const rank of RANKS) {
    for (const suit of SUITS) {
      if (!seen.has(rank + suit)) throw new Error(`Missing ${rank}${suit}`);
    }
  }
}

assertValidStack(STACK);

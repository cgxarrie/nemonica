# Mnemónica

Trainer for Juan Tamariz’s Mnemónica stack. The app keeps the 52-card order and quizzes it in both directions: it shows a card and asks for its position, or shows a position and asks for the card. **Suit Positions** shows a rank and asks for the position of that card in Clubs, Hearts, Spades, and Diamonds order.

The interface is in Spanish.

## Practice

Set **Desde** and **Hasta**, or pick a shortcut such as `1–13` or `Todas`. Questions stay inside that range. A position, and therefore its card, is never asked twice in a row. The range is at least two positions wide and is remembered in the browser.

**Practicar** keeps asking questions for ongoing practice, showing feedback after each answer. **Carrera** asks for every card and every position in the selected range exactly once, in random order, without per-answer feedback. At the end, it shows the elapsed time, score, and any mistakes with their correct answers. **Mazo** shows the full order, with the selected range highlighted.

## Run locally

Requires Node.js 22 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:5173.

```bash
npm test
npm run build
npm run preview
```

## Docker

```bash
docker build -t mnemónica .
docker run --rm -p 8080:80 mnemónica
```

Open http://localhost:8080.

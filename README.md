# Mnemónica

Trainer for Juan Tamariz’s Mnemónica stack. The app keeps the 52-card order and quizzes it in both directions: it shows a card and asks for its position, or shows a position and asks for the card. **Valor** shows a rank and asks for the position of that card in Clubs, Hearts, Spades, and Diamonds order. **Palo** selects a random suit and asks for the positions of all 13 cards in a shuffled order.

The interface is in Spanish.

## Practice

Set **Desde** and **Hasta**, or pick a shortcut such as `1–13` or **Todas**. Questions stay inside that range. In **Practicar**, **Carrera**, and **Repaso**, toggle the card-name and position icons on or off to choose what to be asked; both can be active, but at least one always stays on. Turning off the only active type automatically enables the other. A position, and therefore its card, is never asked twice in a row. The range is at least two positions wide and is remembered in the browser.

**Practicar** keeps asking questions for ongoing practice, showing feedback after each answer. **Carrera** asks each enabled question type for every position in the selected range exactly once, in random order, without per-answer feedback. Change the card-name or position selection during a race to restart it with the new selection, or choose **Salir** to leave. At the end, it shows the elapsed time, score, and any mistakes with their correct answers. **Repaso** offers continuous practice or a race with the 10 most-missed cards and the 10 cards with the slowest average correct-answer time, combined without duplicates and limited to the selected range. It displays each priority card’s misses, correct answers, and average response time. **Mazo** shows the full order, with the selected range highlighted.

Card statistics are saved in this browser. Practice and race answers contribute to each card’s miss count and average correct-answer time; the separate **Valor** and **Palo** exercises do not.

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

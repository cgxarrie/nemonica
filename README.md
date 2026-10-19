# Nemonica

Trainer for Juan Tamariz’s Mnemonica stack. The app keeps the 52-card order and quizzes it in both directions: it shows a card and asks for its position, or shows a position and asks for the card.

The interface is in Spanish.

## Practice

Set **Desde** and **Hasta**, or pick a shortcut such as `1–13` or `Todas`. Questions stay inside that range. A position, and therefore its card, is never asked twice in a row. The range is at least two positions wide and is remembered in the browser.

**Practicar** is the quiz. **Mazo** shows the full order, with the selected range highlighted.

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
docker build -t nemonica .
docker run --rm -p 8080:80 nemonica
```

Open http://localhost:8080.

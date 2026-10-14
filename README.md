# LET'S MAKE A SCENE — Event Calculator

Live at **calc.goofygoober.tech**. Model ticket tiers, venue terms, production costs and deposits, and see profit, break-even and what's owed on the night.

## What's in here

| File | Purpose |
|---|---|
| `index.html` | The page: V8 brand system (cream / midnight navy / hot pink, Berkshire Swash + Shrikhand + Nunito Sans), day and night themes, the Rabbit mascot |
| `calc.js` | Calculation engine. Pure functions, shared by the page and the tests |
| `server.js` | Tiny static server for Railway (uses `PORT`) |
| `server.test.js` | Engine maths and page checks (`npm test`) |

## How the maths works

- **People per ticket**: a couple pass admits 2. Attendance = every person on every ticket + comp guests. This drives per-person venue fees and capacity checks.
- **Venue models**: per person (greater of guarantee or attendance × rate), flat fee, % of net ticket sales, or base fee + %.
- **Deposits**: either paid *toward* the venue fee (reduces what's due on the night) or an *extra charge* (adds to venue cost).
- **Break-even**: smallest ticket count, in the current sales mix, where net retained ≥ 0.
- **Planning signal**: loss / tight (<10%) / workable (10–25%) / strong (25%+) / over capacity. The Rabbit's expression follows it.

Data is saved in the visitor's browser (`lmas-calc-v8`). Saved events from the previous version migrate automatically; pair or couple tickets default to 2 people and a notice asks the user to check.

## Run locally

```bash
npm start   # http://localhost:3000
npm test
```

## Brand notes

- The header uses a text lockup. When the approved wordmark SVG is ready, swap `.brand-word` for an `<img>` of it. Don't retype the logo in another font.
- The Rabbit is the only character on this tool. Print / PDF hides it so the document is venue-ready.
- Status is never colour-only: every state has a word label.

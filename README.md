# BGG Game Cards Generator

Generates printable poker-sized game cards from a BoardGameGeek user's owned collection.

## Usage

```bash
npm install
node generate-cards.js <bgg-username>
```

Optional flag to skip PDF generation and only produce HTML:

```bash
node generate-cards.js <bgg-username> --html-only
```

## Output

| File | Description |
|------|-------------|
| `cards.html` | Open in any browser → Ctrl+P → Save as PDF |
| `cards.pdf` | Auto-generated via headless Chromium |

## Card layout

Standard poker card size **63.5 × 88.9 mm**, 9 cards per A4 page, sorted by BGG rating.

Each card displays:
- Game thumbnail with rating badge (colour-coded) and BGG rank
- Title + year
- Weight indicator (5-dot scale, Light → Heavy)
- Player count range + Best/Recommended sweet spot
- Playtime range
- Play-mode tags: Solo / Coop / Semi-Coop / Versus
- Up to 3 theme categories
- 20 tick-circles to track plays physically

## Data sources

All data is fetched from the [BGG XML API v2](https://boardgamegeek.com/wiki/page/BGG_XML_API2):
- `GET /collection` — owned games with stats
- `GET /thing` — weight, categories, mechanics, player-count poll (batched, 20 per request)

The collection must be **public** on BGG.

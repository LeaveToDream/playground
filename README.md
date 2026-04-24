# BGG Game Cards Generator

Fetches a BoardGameGeek user's owned game collection and produces print-ready
poker-sized cards (63.5 × 88.9 mm, 9 per A4 page).

## Quick start with Docker

```bash
docker compose up --build
```

Then open **http://localhost:3000**, enter a BGG username, and download the PDF.

## Card layout

Each card shows:

| Section | Content |
|---|---|
| Image | Game thumbnail · BGG rating badge · Global rank |
| Title | Name + year |
| Weight | 5-dot scale (Light → Heavy) |
| Players | Min–Max range · Best/Recommended sweet spot |
| Playtime | Duration range |
| Tags | Solo / Coop / Semi-Coop / Versus |
| Categories | Up to 3 theme tags |
| Play tracker | 20 circles to tick off physically |

Cards are sorted by BGG rating (highest first).

## CLI usage (without Docker)

```bash
npm install
node generate-cards.js <bgg-username>          # generates cards.html + cards.pdf
node generate-cards.js <bgg-username> --html-only
```

## Architecture

```
browser ──SSE──► GET /api/generate?username=…  (progress events)
                  └─ fetchCollection()           BGG /collection
                  └─ fetchGameDetails()          BGG /thing (batched, 20/req)
                  └─ renderPage()                HTML card template
                  └─ puppeteer → PDF

browser ──GET──► /api/download/:token/pdf
browser ──GET──► /api/download/:token/html
```

Generated files are held in memory for **30 minutes** then discarded.
The BGG collection must be **public**.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `PUPPETEER_EXECUTABLE_PATH` | *(puppeteer bundled Chrome)* | Path to Chromium binary |

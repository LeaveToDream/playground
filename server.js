import express from 'express';
import { randomBytes } from 'crypto';
import { fetchCollection, fetchGameDetails } from './bgg-api.js';
import { renderCard, renderPage } from './card-template.js';

const app = express();
const PORT = process.env.PORT ?? 3000;

// In-memory store: token → { html, pdf, createdAt }
const store = new Map();
const STORE_TTL_MS = 30 * 60 * 1000; // 30 min

function pruneStore() {
  const cutoff = Date.now() - STORE_TTL_MS;
  for (const [token, entry] of store) {
    if (entry.createdAt < cutoff) store.delete(token);
  }
}
setInterval(pruneStore, 5 * 60 * 1000);

app.use(express.static('public'));

// ── SSE generation endpoint ──────────────────────────────────────
app.get('/api/generate', async (req, res) => {
  const username = (req.query.username ?? '').trim();
  if (!username) {
    res.status(400).json({ error: 'username is required' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (event, data) =>
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  try {
    send('progress', { message: `Fetching collection for "${username}"…` });
    const collection = await fetchCollection(username);

    if (collection.length === 0) {
      send('error', { message: 'No owned base games found. Make sure the collection is public.' });
      res.end();
      return;
    }

    send('progress', { message: `Found ${collection.length} games. Loading details…` });
    const details = await fetchGameDetails(collection.map(g => g.id));

    const games = collection
      .map(g => ({ ...g, ...(details[g.id] ?? {}) }))
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

    send('progress', { message: `Rendering ${games.length} cards…` });
    const html = renderPage(games.map(renderCard), username, games.length);

    send('progress', { message: 'Generating PDF via headless Chromium…' });
    let pdf = null;
    try {
      const { default: puppeteer } = await import('puppeteer');
      const browser = await puppeteer.launch({
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 1500)); // let images paint
      pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '6mm', right: '6mm', bottom: '6mm', left: '6mm' },
      });
      await browser.close();
    } catch (err) {
      send('progress', { message: `PDF unavailable (${err.message}); HTML only.` });
    }

    const token = randomBytes(16).toString('hex');
    store.set(token, { html, pdf, createdAt: Date.now(), username, count: games.length });

    send('done', { token, count: games.length, hasPdf: pdf !== null });
  } catch (err) {
    send('error', { message: err.message });
  }

  res.end();
});

// ── Download endpoints ───────────────────────────────────────────
app.get('/api/download/:token/html', (req, res) => {
  const entry = store.get(req.params.token);
  if (!entry) { res.status(404).json({ error: 'Not found or expired (30 min TTL)' }); return; }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="bgg-cards-${entry.username}.html"`);
  res.send(entry.html);
});

app.get('/api/download/:token/pdf', (req, res) => {
  const entry = store.get(req.params.token);
  if (!entry) { res.status(404).json({ error: 'Not found or expired (30 min TTL)' }); return; }
  if (!entry.pdf) { res.status(404).json({ error: 'PDF was not generated' }); return; }
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="bgg-cards-${entry.username}.pdf"`);
  res.send(entry.pdf);
});

app.listen(PORT, () => console.log(`BGG Cards server running on http://localhost:${PORT}`));

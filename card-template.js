const WEIGHT_LABELS = ['—', 'Light', 'Med-Light', 'Medium', 'Med-Heavy', 'Heavy'];
const WEIGHT_COLORS = ['#888', '#4caf50', '#8bc34a', '#ff9800', '#f44336', '#b71c1c'];

function weightLabel(w) {
  return WEIGHT_LABELS[Math.round(w)] ?? '—';
}

function weightColor(w) {
  return WEIGHT_COLORS[Math.round(w)] ?? '#888';
}

function ratingColor(r) {
  if (r >= 8) return '#2e7d32';
  if (r >= 7) return '#558b2f';
  if (r >= 6) return '#f57f17';
  if (r >= 5) return '#e65100';
  return '#b71c1c';
}

function playerCountDisplay(game) {
  const { minPlayers, maxPlayers, bestPlayers, recommendedPlayers } = game;
  const rangeStr = minPlayers === maxPlayers
    ? `${minPlayers}p`
    : `${minPlayers}–${maxPlayers}p`;

  const highlights = bestPlayers?.length ? bestPlayers : recommendedPlayers ?? [];
  const label = bestPlayers?.length ? 'Best' : 'Rec';

  return `
    <div class="player-count">
      <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
      </svg>
      <span class="player-range">${rangeStr}</span>
      ${highlights.length ? `<span class="player-best">${label}: ${highlights.join(', ')}</span>` : ''}
    </div>`;
}

function playtimeDisplay(game) {
  const { minPlaytime, maxPlaytime } = game;
  if (!maxPlaytime) return '';
  const str = minPlaytime && minPlaytime !== maxPlaytime
    ? `${minPlaytime}–${maxPlaytime} min`
    : `${maxPlaytime} min`;
  return `
    <div class="playtime">
      <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/>
      </svg>
      <span>${str}</span>
    </div>`;
}

function tagsHtml(tags) {
  if (!tags) return '';
  const tagDefs = [
    { key: 'solo',        label: 'Solo',      cls: 'tag-solo' },
    { key: 'coop',        label: 'Coop',      cls: 'tag-coop' },
    { key: 'semiCoop',    label: 'Semi-Coop', cls: 'tag-semi' },
    { key: 'competitive', label: 'Versus',    cls: 'tag-vs' },
  ];
  return tagDefs.filter(t => tags[t.key]).map(t =>
    `<span class="tag ${t.cls}">${t.label}</span>`
  ).join('');
}

function categoriesHtml(categories) {
  if (!categories?.length) return '';
  return categories.slice(0, 3).map(c =>
    `<span class="category">${c}</span>`
  ).join('');
}

function weightDots(w) {
  const level = Math.round(w || 0);
  const color = weightColor(w);
  return Array.from({ length: 5 }, (_, i) =>
    `<span class="dot ${i < level ? 'dot-filled' : ''}" style="${i < level ? `background:${color}` : ''}"></span>`
  ).join('');
}

function playTrackerHtml() {
  // 20 small circles to tick off
  return Array.from({ length: 20 }, () => '<span class="play-circle"></span>').join('');
}

export function renderCard(game) {
  const r = game.rating;
  const w = game.weight ?? 0;
  const imgSrc = game.thumbnail || game.image || '';

  return `
  <div class="card">
    <div class="card-image" style="${imgSrc ? `background-image:url('${imgSrc}')` : 'background:#1a1a2e'}">
      <div class="card-image-overlay"></div>
      ${r > 0 ? `<div class="rating-badge" style="background:${ratingColor(r)}">${r.toFixed(1)}</div>` : ''}
      ${game.rank && game.rank !== 'N/A' ? `<div class="rank-badge">#${game.rank}</div>` : ''}
    </div>

    <div class="card-body">
      <div class="card-title-row">
        <span class="card-title" title="${game.name.replace(/"/g, '&quot;')}">${game.name}</span>
        ${game.year ? `<span class="card-year">${game.year}</span>` : ''}
      </div>

      <div class="card-meta">
        <div class="weight-row">
          <div class="weight-dots">${weightDots(w)}</div>
          <span class="weight-label" style="color:${weightColor(w)}">${weightLabel(w)}</span>
        </div>
        <div class="meta-right">
          ${playerCountDisplay(game)}
          ${playtimeDisplay(game)}
        </div>
      </div>

      <div class="tags-row">
        ${tagsHtml(game.tags)}
      </div>

      <div class="categories-row">
        ${categoriesHtml(game.categories)}
      </div>

      <div class="play-tracker">
        <span class="play-label">Plays</span>
        <div class="play-circles">${playTrackerHtml()}</div>
      </div>
    </div>
  </div>`;
}

const CARDS_PER_PAGE = 9;

export function renderPage(cardHtmlArray, username, total) {
  // Split into pages of 9
  const pages = [];
  for (let i = 0; i < cardHtmlArray.length; i += CARDS_PER_PAGE) {
    const slice = cardHtmlArray.slice(i, i + CARDS_PER_PAGE);
    pages.push(`<div class="card-page">\n${slice.join('\n')}\n</div>`);
  }
  const cards = pages.join('\n');
  return renderPageHtml(cards, username, total);
}

function renderPageHtml(cards, username, total) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>BGG Cards – ${username}</title>
<style>
  /* ── Print setup ── */
  @page {
    size: A4;
    margin: 6mm;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    background: #f0f0f0;
    color: #1a1a1a;
  }

  /* Screen header (hidden when printing) */
  .screen-header {
    text-align: center;
    padding: 20px;
    background: #1a1a2e;
    color: #fff;
  }
  .screen-header h1 { font-size: 1.4rem; }
  .screen-header p  { font-size: 0.85rem; margin-top: 4px; color: #aaa; }
  .print-btn {
    display: inline-block;
    margin-top: 12px;
    padding: 8px 20px;
    background: #e67e22;
    color: #fff;
    border: none;
    border-radius: 4px;
    font-size: 0.9rem;
    cursor: pointer;
  }

  /* ── Card grid (one per printed page) ── */
  .card-page {
    display: grid;
    grid-template-columns: repeat(3, 63.5mm);
    grid-template-rows: repeat(3, 88.9mm);
    gap: 2mm;
    padding: 2mm;
    background: #f0f0f0;
    width: fit-content;
    margin: 16px auto;
    page-break-after: always;
  }
  .card-page:last-child { page-break-after: avoid; }

  /* ── Single card ── (standard poker 63.5 × 88.9 mm) */
  .card {
    width: 63.5mm;
    height: 88.9mm;
    border-radius: 2mm;
    overflow: hidden;
    background: #fff;
    display: flex;
    flex-direction: column;
    box-shadow: 0 1px 3px rgba(0,0,0,.25);
    page-break-inside: avoid;
    border: 0.3mm solid #ccc;
  }

  /* ── Image area ~32% of card ── */
  .card-image {
    position: relative;
    flex: 0 0 28mm;
    background-size: cover;
    background-position: center;
    background-color: #1a1a2e;
  }
  .card-image-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, transparent 50%, rgba(0,0,0,.55) 100%);
  }
  .rating-badge {
    position: absolute;
    top: 1.2mm;
    right: 1.2mm;
    background: #2e7d32;
    color: #fff;
    font-size: 3.8mm;
    font-weight: 700;
    padding: 0.5mm 1.2mm;
    border-radius: 1mm;
    line-height: 1;
  }
  .rank-badge {
    position: absolute;
    top: 1.2mm;
    left: 1.2mm;
    background: rgba(0,0,0,.6);
    color: #ffd700;
    font-size: 2.5mm;
    font-weight: 700;
    padding: 0.4mm 1mm;
    border-radius: 1mm;
    line-height: 1;
  }

  /* ── Card body ── */
  .card-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 1.5mm 2mm 1mm;
    gap: 1mm;
    overflow: hidden;
  }

  .card-title-row {
    display: flex;
    align-items: baseline;
    gap: 1mm;
    min-height: 6mm;
  }
  .card-title {
    font-size: 3.2mm;
    font-weight: 700;
    line-height: 1.2;
    flex: 1;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    color: #111;
  }
  .card-year {
    font-size: 2.5mm;
    color: #888;
    white-space: nowrap;
    flex-shrink: 0;
  }

  /* Weight + players row */
  .card-meta {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1mm;
  }
  .weight-row {
    display: flex;
    flex-direction: column;
    gap: 0.5mm;
  }
  .weight-dots {
    display: flex;
    gap: 0.7mm;
  }
  .dot {
    width: 2mm;
    height: 2mm;
    border-radius: 50%;
    background: #ddd;
    border: 0.2mm solid #bbb;
    display: inline-block;
  }
  .dot-filled { border-color: transparent; }
  .weight-label {
    font-size: 2.3mm;
    font-weight: 600;
  }

  .meta-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5mm;
  }
  .player-count, .playtime {
    display: flex;
    align-items: center;
    gap: 0.8mm;
    font-size: 2.5mm;
    color: #333;
  }
  .icon {
    width: 3mm;
    height: 3mm;
    color: #555;
    flex-shrink: 0;
  }
  .player-range { font-weight: 600; }
  .player-best  { color: #e67e22; font-size: 2.2mm; font-weight: 600; }

  /* Tags */
  .tags-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.8mm;
  }
  .tag {
    font-size: 2.2mm;
    font-weight: 700;
    padding: 0.3mm 1.2mm;
    border-radius: 0.8mm;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    color: #fff;
  }
  .tag-solo { background: #1565c0; }
  .tag-coop { background: #2e7d32; }
  .tag-semi { background: #6a1b9a; }
  .tag-vs   { background: #c62828; }

  /* Categories */
  .categories-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.8mm;
  }
  .category {
    font-size: 2mm;
    padding: 0.2mm 1mm;
    background: #eee;
    border-radius: 0.5mm;
    color: #444;
    border: 0.2mm solid #ccc;
    white-space: nowrap;
    overflow: hidden;
    max-width: 28mm;
    text-overflow: ellipsis;
  }

  /* Play tracker */
  .play-tracker {
    margin-top: auto;
    border-top: 0.3mm solid #eee;
    padding-top: 1mm;
    display: flex;
    align-items: center;
    gap: 1.5mm;
  }
  .play-label {
    font-size: 2.2mm;
    font-weight: 700;
    color: #888;
    white-space: nowrap;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .play-circles {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6mm;
  }
  .play-circle {
    width: 2.2mm;
    height: 2.2mm;
    border-radius: 50%;
    border: 0.3mm solid #bbb;
    display: inline-block;
  }

  /* ── Print overrides ── */
  @media print {
    body { background: #fff; }
    .screen-header { display: none; }
    .card-page { margin: 0; padding: 0; gap: 2mm; background: #fff; }
    .card { box-shadow: none; }
  }
</style>
</head>
<body>
<div class="screen-header">
  <h1>BGG Cards — ${username}</h1>
  <p>${total} games · Standard poker card size (63.5 × 88.9 mm) · 9 cards per A4 page</p>
  <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
</div>

<div class="card-grid">
${cards}
</div>
</body>
</html>`;
}

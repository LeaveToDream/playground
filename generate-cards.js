#!/usr/bin/env node
/**
 * BGG Game Cards Generator
 * Usage: node generate-cards.js <bgg-username> [--html-only]
 *
 * Fetches your BoardGameGeek owned games collection and produces:
 *   cards.html  – open in browser and Ctrl+P → Save as PDF
 *   cards.pdf   – generated automatically via headless Chromium (unless --html-only)
 */

import { writeFileSync } from 'fs';
import { fetchCollection, fetchGameDetails } from './bgg-api.js';
import { renderCard, renderPage } from './card-template.js';

const username = process.argv[2];
const htmlOnly = process.argv.includes('--html-only');

if (!username) {
  console.error('Usage: node generate-cards.js <bgg-username> [--html-only]');
  process.exit(1);
}

async function main() {
  console.log(`\nFetching collection for "${username}" from BoardGameGeek…`);

  let collection;
  try {
    collection = await fetchCollection(username);
  } catch (err) {
    console.error(`\nFailed to fetch collection: ${err.message}`);
    process.exit(1);
  }

  if (collection.length === 0) {
    console.error('No owned base games found. Check the username or make the collection public.');
    process.exit(1);
  }
  console.log(`\nFound ${collection.length} games. Fetching details…`);

  let details;
  try {
    details = await fetchGameDetails(collection.map(g => g.id));
  } catch (err) {
    console.warn(`Warning: could not fetch full details — ${err.message}`);
    details = {};
  }

  // Merge collection + details, sort by BGG rating descending
  const games = collection
    .map(g => ({ ...g, ...(details[g.id] ?? {}) }))
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

  // Build HTML (pass array — renderPage handles pagination)
  const html = renderPage(games.map(renderCard), username, games.length);

  const htmlPath = 'cards.html';
  writeFileSync(htmlPath, html, 'utf8');
  console.log(`\nHTML saved → ${htmlPath}`);

  if (htmlOnly) {
    console.log('Open cards.html in a browser and use Ctrl+P → Save as PDF.');
    return;
  }

  // Generate PDF via puppeteer
  console.log('Generating PDF via headless Chromium…');
  try {
    const { default: puppeteer } = await import('puppeteer');
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Wait a moment so background images can load
    await new Promise(r => setTimeout(r, 2000));

    await page.pdf({
      path: 'cards.pdf',
      format: 'A4',
      printBackground: true,
      margin: { top: '6mm', right: '6mm', bottom: '6mm', left: '6mm' },
    });

    await browser.close();
    console.log('PDF saved  → cards.pdf');
  } catch (err) {
    console.warn(`PDF generation failed (${err.message})`);
    console.log('Open cards.html in a browser and use Ctrl+P → Save as PDF instead.');
  }
}

main();

import { XMLParser } from 'fast-xml-parser';

const BGG_BASE = 'https://boardgamegeek.com/xmlapi2';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: name => ['item', 'link', 'result', 'results', 'rank', 'poll'].includes(name),
  parseAttributeValue: true,
});

function authHeaders() {
  const token = process.env.BGG_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchWithRetry(url, maxRetries = 8, delayMs = 2000) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, { headers: authHeaders() });
    if (res.status === 200) return res.text();
    if (res.status === 202) {
      process.stdout.write(attempt === 0 ? '  BGG is processing the request' : '.');
      await new Promise(r => setTimeout(r, delayMs));
      delayMs = Math.min(delayMs * 1.5, 10000);
      continue;
    }
    if (res.status === 401) throw new Error('BGG API returned 401 Unauthorized — check that BGG_TOKEN is set correctly');
    throw new Error(`BGG API returned HTTP ${res.status} for ${url}`);
  }
  throw new Error('BGG API timed out — collection may be private or username wrong');
}

export async function fetchCollection(username) {
  const url = `${BGG_BASE}/collection?username=${encodeURIComponent(username)}&own=1&stats=1&excludesubtype=boardgameexpansion`;
  const xml = await fetchWithRetry(url);
  if (xml.includes('<message>')) {
    const msg = xml.match(/<message>([\s\S]*?)<\/message>/)?.[1]?.trim();
    throw new Error(msg || 'BGG returned an error message');
  }
  const data = parser.parse(xml);
  const items = data?.items?.item ?? [];
  return items.map(item => ({
    id: String(item['@_objectid']),
    name: typeof item.name === 'string' ? item.name : item.name?.['#text'] ?? 'Unknown',
    year: item.yearpublished ?? '',
    thumbnail: (item.thumbnail ?? '').replace(/^\/\//, 'https://'),
    image: (item.image ?? '').replace(/^\/\//, 'https://'),
    minPlayers: item.stats?.['@_minplayers'] ?? 1,
    maxPlayers: item.stats?.['@_maxplayers'] ?? 1,
    minPlaytime: item.stats?.['@_minplaytime'] ?? 0,
    maxPlaytime: item.stats?.['@_maxplaytime'] ?? 0,
    rating: parseFloat(item.stats?.rating?.average?.['@_value'] ?? 0) || 0,
    numPlays: parseInt(item.numplays ?? 0, 10),
    rank: item.stats?.rating?.ranks?.rank?.find(r => r['@_name'] === 'boardgame')?.['@_value'] ?? 'N/A',
  }));
}

export async function fetchGameDetails(ids) {
  const results = {};
  const batchSize = 20;

  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const url = `${BGG_BASE}/thing?id=${batch.join(',')}&stats=1&type=boardgame`;
    const xml = await fetchWithRetry(url);
    const data = parser.parse(xml);
    const items = Array.isArray(data?.items?.item)
      ? data.items.item
      : data?.items?.item
        ? [data.items.item]
        : [];

    for (const item of items) {
      const id = String(item['@_id']);
      const links = item.link ?? [];
      const categories = links.filter(l => l['@_type'] === 'boardgamecategory').map(l => l['@_value']);
      const mechanics = links.filter(l => l['@_type'] === 'boardgamemechanic').map(l => l['@_value']);
      const weight = parseFloat(item.statistics?.ratings?.averageweight?.['@_value'] ?? 0) || 0;

      // Derive play mode tags from mechanics
      const mechStr = mechanics.join(' ').toLowerCase();
      const isCoop = mechStr.includes('cooperative');
      const isSemiCoop = mechStr.includes('semi-cooperative') || mechStr.includes('traitor');
      const isSolo = mechStr.includes('solitaire') || mechStr.includes('solo');

      // Parse suggested player count poll
      const polls = Array.isArray(item.poll) ? item.poll : item.poll ? [item.poll] : [];
      const playerPoll = polls.find(p => p['@_name'] === 'suggested_numplayers');
      const bestPlayers = [];
      const recommendedPlayers = [];

      if (playerPoll) {
        const resultGroups = Array.isArray(playerPoll.results) ? playerPoll.results : [];
        for (const group of resultGroups) {
          const numP = String(group['@_numplayers'] ?? '');
          if (numP.includes('+')) continue;
          const votes = Array.isArray(group.result) ? group.result : group.result ? [group.result] : [];
          const best = votes.find(v => v['@_value'] === 'Best')?.['@_numvotes'] ?? 0;
          const rec = votes.find(v => v['@_value'] === 'Recommended')?.['@_numvotes'] ?? 0;
          const notRec = votes.find(v => v['@_value'] === 'Not Recommended')?.['@_numvotes'] ?? 0;
          const n = parseInt(numP, 10);
          if (!isNaN(n)) {
            if (best > notRec && best > 0) bestPlayers.push(n);
            else if (best + rec > notRec) recommendedPlayers.push(n);
          }
        }
      }

      results[id] = {
        weight,
        categories,
        mechanics,
        tags: {
          solo: isSolo,
          coop: isCoop && !isSemiCoop,
          semiCoop: isSemiCoop,
          competitive: !isCoop && !isSemiCoop,
        },
        bestPlayers,
        recommendedPlayers,
      };
    }
  }

  return results;
}

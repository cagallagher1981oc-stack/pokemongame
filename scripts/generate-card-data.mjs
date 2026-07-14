// Generates data/cards.json from the pokemon-tcg-data GitHub repo so the game
// never has to call the (slow, flaky) api.pokemontcg.io at play time.
//
// Re-run whenever new sets come out:  node scripts/generate-card-data.mjs

import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'cards.json');

// Same era rule as the game: these series, plus anything released 2024+
const ALLOWED_SERIES = ['Sun & Moon', 'Sword & Shield', 'Scarlet & Violet'];
const MIN_YEAR_FOR_RECENT = 2024;

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return res.json();
}

console.log('Fetching set list…');
const allSets = await fetchJson(`${BASE}/sets/en.json`);

const wantedSets = allSets.filter((s) => {
  const year = parseInt(s.releaseDate?.split('/')[0] ?? '0', 10);
  return ALLOWED_SERIES.includes(s.series) || year >= MIN_YEAR_FOR_RECENT;
});
console.log(`${wantedSets.length} sets in the Decade Defender era (of ${allSets.length} total)`);

const sets = [];
let totalCards = 0;
let explicitImageUrls = 0;

for (const set of wantedSets) {
  let cards;
  try {
    cards = await fetchJson(`${BASE}/cards/en/${set.id}.json`);
  } catch (err) {
    console.warn(`  skipping ${set.id}: ${err.message}`);
    continue;
  }

  const pokemon = cards
    .filter((c) => c.supertype === 'Pokémon' && c.images?.small)
    .map((c) => {
      const record = {
        id: c.id,
        name: c.name,
        number: c.number,
      };
      if (c.types?.length) record.types = c.types;
      if (c.evolvesFrom) record.evolvesFrom = c.evolvesFrom;
      if (c.flavorText) record.flavorText = c.flavorText;
      // Keep only the first ability — it's the hint fallback when there's no flavor text
      if (!c.flavorText && c.abilities?.[0]?.text) {
        record.ability = { name: c.abilities[0].name, text: c.abilities[0].text, type: c.abilities[0].type };
      }
      if (c.artist) record.artist = c.artist;
      // Image URLs are derivable from set id + card number; store explicitly only when they aren't
      const derivedSmall = `https://images.pokemontcg.io/${set.id}/${c.number}.png`;
      if (c.images.small !== derivedSmall) {
        record.images = { small: c.images.small, large: c.images.large };
        explicitImageUrls++;
      }
      return record;
    });

  if (pokemon.length) {
    sets.push({ id: set.id, name: set.name, series: set.series, cards: pokemon });
    totalCards += pokemon.length;
  }
  process.stdout.write(`  ${set.id}: ${pokemon.length} Pokémon\n`);
}

await mkdir(path.dirname(OUT), { recursive: true });
const payload = { generatedAt: new Date().toISOString().slice(0, 10), sets };
await writeFile(OUT, JSON.stringify(payload));

const bytes = Buffer.byteLength(JSON.stringify(payload));
console.log(`\nWrote ${OUT}`);
console.log(`${sets.length} sets, ${totalCards} cards, ${(bytes / 1024 / 1024).toFixed(1)} MB (${explicitImageUrls} non-derivable image URLs)`);

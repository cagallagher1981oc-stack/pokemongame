// Pokémon TCG API utility — filters for Pokémon supertype, decade sets only

export interface PokemonCard {
  id: string;
  name: string;
  supertype: string;
  types?: string[];
  evolvesFrom?: string;
  flavorText?: string;
  abilities?: Array<{ name: string; text: string; type: string }>;
  attacks?: Array<{ name: string; text: string; cost: string[] }>;
  images: {
    small: string;
    large: string;
  };
  artist?: string;
  set: {
    id: string;
    name: string;
    series: string;
    releaseDate: string;
  };
}

// Only these series + any sets released 2024-2026
const ALLOWED_SERIES = ['Sun & Moon', 'Sword & Shield', 'Scarlet & Violet'];
const MIN_YEAR_FOR_RECENT = 2024;

const FETCH_TIMEOUT_MS = 8000;

/** Unbiased Fisher-Yates shuffle (returns a new array). */
export function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Fetch JSON with a timeout; returns null on network error, bad status, or non-JSON body. */
async function fetchJson<T>(url: string, revalidate: number): Promise<T | null> {
  try {
    const res = await fetch(url, {
      next: { revalidate },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

let cachedSetIds: string[] | null = null;

async function fetchDecadeSetIds(): Promise<string[]> {
  if (cachedSetIds) return cachedSetIds;

  const data = await fetchJson<{ data?: Array<{ id: string; series: string; releaseDate: string }> }>(
    'https://api.pokemontcg.io/v2/sets?pageSize=250&select=id,series,releaseDate',
    86400
  );
  const sets = data?.data || [];

  const ids = sets
    .filter((s) => {
      const year = parseInt(s.releaseDate?.split('/')[0] ?? '0', 10);
      return ALLOWED_SERIES.includes(s.series) || year >= MIN_YEAR_FOR_RECENT;
    })
    .map((s) => s.id);

  // Only cache a successful, non-empty result so a flaky response doesn't stick
  if (ids.length) cachedSetIds = ids;
  return ids;
}

const MAX_ATTEMPTS = 3;

export async function fetchRandomDecadeCard(): Promise<PokemonCard | null> {
  const setIds = await fetchDecadeSetIds();
  if (!setIds.length) return null;

  // The TCG API can be slow or flaky — try a few different sets before giving up
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const setId = setIds[Math.floor(Math.random() * setIds.length)];
    const card = await fetchRandomCardFromSet(setId);
    if (card) return card;
  }
  return null;
}

async function fetchRandomCardFromSet(setId: string): Promise<PokemonCard | null> {
  // Fetch page 1 to learn totalCount
  const probeData = await fetchJson<{ totalCount?: number }>(
    `https://api.pokemontcg.io/v2/cards?q=set.id:${setId}+supertype:Pokémon&pageSize=1&select=id`,
    3600
  );
  const totalCount = probeData?.totalCount ?? 0;
  if (!totalCount) return null;

  const pageSize = 20;
  const totalPages = Math.ceil(totalCount / pageSize);
  const page = Math.floor(Math.random() * totalPages) + 1;

  const data = await fetchJson<{ data?: PokemonCard[] }>(
    `https://api.pokemontcg.io/v2/cards?q=set.id:${setId}+supertype:Pokémon&pageSize=${pageSize}&page=${page}&select=id,name,supertype,types,evolvesFrom,flavorText,abilities,attacks,images,artist,set`,
    3600
  );
  const cards = data?.data || [];
  if (!cards.length) return null;

  return cards[Math.floor(Math.random() * cards.length)];
}

export async function fetchDistractorNames(
  correctName: string,
  setIds: string[],
  count = 3
): Promise<string[]> {
  // Fetch a batch of random cards to pull distractor names from
  const setId = setIds[Math.floor(Math.random() * setIds.length)];
  const data = await fetchJson<{ data?: Array<{ name: string }> }>(
    `https://api.pokemontcg.io/v2/cards?q=set.id:${setId}+supertype:Pokémon&pageSize=40&select=name`,
    3600
  );
  const names = [
    ...new Set((data?.data || []).map((c) => c.name).filter((n) => n !== correctName)),
  ];

  return shuffle(names).slice(0, count);
}

export async function getDecadeSetIds(): Promise<string[]> {
  return fetchDecadeSetIds();
}

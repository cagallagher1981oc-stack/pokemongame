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

let cachedSetIds: string[] | null = null;

async function fetchDecadeSetIds(): Promise<string[]> {
  if (cachedSetIds) return cachedSetIds;

  const res = await fetch(
    'https://api.pokemontcg.io/v2/sets?pageSize=250&select=id,series,releaseDate',
    { next: { revalidate: 86400 } }
  );
  const data = await res.json();
  const sets: Array<{ id: string; series: string; releaseDate: string }> = data.data || [];

  cachedSetIds = sets
    .filter((s) => {
      const year = parseInt(s.releaseDate?.split('/')[0] ?? '0', 10);
      return ALLOWED_SERIES.includes(s.series) || year >= MIN_YEAR_FOR_RECENT;
    })
    .map((s) => s.id);

  return cachedSetIds;
}

export async function fetchRandomDecadeCard(): Promise<PokemonCard | null> {
  const setIds = await fetchDecadeSetIds();
  if (!setIds.length) return null;

  // Pick a random set
  const setId = setIds[Math.floor(Math.random() * setIds.length)];

  // Fetch page 1 to learn totalCount
  const probe = await fetch(
    `https://api.pokemontcg.io/v2/cards?q=set.id:${setId}+supertype:Pokémon&pageSize=1&select=id`,
    { next: { revalidate: 3600 } }
  );
  const probeData = await probe.json();
  const totalCount: number = probeData.totalCount ?? 0;
  if (!totalCount) return null;

  const pageSize = 20;
  const totalPages = Math.ceil(totalCount / pageSize);
  const page = Math.floor(Math.random() * totalPages) + 1;

  const res = await fetch(
    `https://api.pokemontcg.io/v2/cards?q=set.id:${setId}+supertype:Pokémon&pageSize=${pageSize}&page=${page}&select=id,name,supertype,types,evolvesFrom,flavorText,abilities,attacks,images,artist,set`,
    { next: { revalidate: 3600 } }
  );
  const data = await res.json();
  const cards: PokemonCard[] = data.data || [];
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
  const res = await fetch(
    `https://api.pokemontcg.io/v2/cards?q=set.id:${setId}+supertype:Pokémon&pageSize=40&select=name`,
    { next: { revalidate: 3600 } }
  );
  const data = await res.json();
  const names: string[] = (data.data || [])
    .map((c: { name: string }) => c.name)
    .filter((n: string) => n !== correctName);

  const shuffled = names.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export async function getDecadeSetIds(): Promise<string[]> {
  return fetchDecadeSetIds();
}

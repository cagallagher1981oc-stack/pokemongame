import { NextResponse } from 'next/server';
import { fetchRandomDecadeCard, fetchDistractorNames, getDecadeSetIds, shuffle } from '@/lib/pokemon-api';

// Fallback pool used when the API can't supply enough unique distractor names
const FALLBACK_NAMES = [
  'Pikachu', 'Charizard', 'Eevee', 'Mewtwo', 'Gengar',
  'Snorlax', 'Bulbasaur', 'Squirtle', 'Jigglypuff', 'Meowth',
  'Lucario', 'Garchomp', 'Blaziken', 'Greninja', 'Sylveon',
  'Umbreon', 'Espeon', 'Dragonite', 'Raichu', 'Blastoise',
];

export async function GET() {
  try {
    const card = await fetchRandomDecadeCard();
    if (!card) {
      return NextResponse.json({ error: 'No card found' }, { status: 404 });
    }

    const setIds = await getDecadeSetIds();
    const distractors = await fetchDistractorNames(card.name, setIds, 3);

    // Build exactly 4 unique options — pad with fallbacks if the API was sparse
    const unique: string[] = [card.name];
    for (const name of distractors) {
      if (!unique.includes(name)) unique.push(name);
    }
    for (const fallback of FALLBACK_NAMES) {
      if (unique.length >= 4) break;
      if (!unique.includes(fallback)) unique.push(fallback);
    }

    const options = shuffle(unique.slice(0, 4));

    return NextResponse.json({
      card: {
        id: card.id,
        name: card.name,
        types: card.types,
        evolvesFrom: card.evolvesFrom,
        flavorText: card.flavorText,
        abilities: card.abilities,
        artist: card.artist,
        images: card.images,
        set: card.set.name,
      },
      options,
    });
  } catch (err) {
    console.error('Card fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch card' }, { status: 500 });
  }
}

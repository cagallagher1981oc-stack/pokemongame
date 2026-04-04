import { NextResponse } from 'next/server';
import { fetchRandomDecadeCard, fetchDistractorNames, getDecadeSetIds } from '@/lib/pokemon-api';

export async function GET() {
  try {
    const card = await fetchRandomDecadeCard();
    if (!card) {
      return NextResponse.json({ error: 'No card found' }, { status: 404 });
    }

    const setIds = await getDecadeSetIds();
    const distractors = await fetchDistractorNames(card.name, setIds, 3);

    // Build 4 options, shuffle them
    const options = [card.name, ...distractors].sort(() => Math.random() - 0.5);

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

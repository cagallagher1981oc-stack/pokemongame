import { NextResponse } from 'next/server';
import { getRandomRound, shuffle } from '@/lib/pokemon-api';

export async function GET() {
  const { card, distractors } = getRandomRound(3);

  const options = shuffle([card.name, ...distractors]);

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
}

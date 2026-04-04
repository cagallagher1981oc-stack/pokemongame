'use client';

const TYPE_COLORS: Record<string, { bg: string; text: string; emoji: string }> = {
  Fire: { bg: 'bg-red-500', text: 'text-white', emoji: '🔥' },
  Water: { bg: 'bg-blue-500', text: 'text-white', emoji: '💧' },
  Grass: { bg: 'bg-green-500', text: 'text-white', emoji: '🌿' },
  Lightning: { bg: 'bg-yellow-400', text: 'text-black', emoji: '⚡' },
  Psychic: { bg: 'bg-pink-500', text: 'text-white', emoji: '🔮' },
  Fighting: { bg: 'bg-orange-600', text: 'text-white', emoji: '🥊' },
  Darkness: { bg: 'bg-gray-800', text: 'text-white', emoji: '🌑' },
  Metal: { bg: 'bg-gray-400', text: 'text-white', emoji: '⚙️' },
  Fairy: { bg: 'bg-pink-300', text: 'text-white', emoji: '✨' },
  Dragon: { bg: 'bg-indigo-600', text: 'text-white', emoji: '🐉' },
  Colorless: { bg: 'bg-gray-200', text: 'text-gray-800', emoji: '⭕' },
};

export default function TypeBadge({ type }: { type: string }) {
  const style = TYPE_COLORS[type] ?? { bg: 'bg-gray-300', text: 'text-gray-800', emoji: '❓' };
  return (
    <span
      className={`inline-flex items-center gap-1 ${style.bg} ${style.text} font-bold text-sm px-3 py-1 rounded-full`}
    >
      {style.emoji} {type}
    </span>
  );
}

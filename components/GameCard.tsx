'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  GameState,
  loadGameState,
  addCapturedCard,
  recordMiss,
  useLifeline,
  MILESTONES,
  Lifelines,
  TARGET,
} from '@/lib/game-state';
import { fireCorrectConfetti, fireMilestoneConfetti } from '@/lib/confetti';
import ProgressBar from './ProgressBar';
import LifelineBar from './LifelineBar';
import TypeBadge from './TypeBadge';
import MilestonePopup from './MilestonePopup';

interface CardData {
  id: string;
  name: string;
  types?: string[];
  evolvesFrom?: string;
  flavorText?: string;
  abilities?: Array<{ name: string; text: string; type: string }>;
  artist?: string;
  images: { small: string; large: string };
  set: string;
}

interface RoundData {
  card: CardData;
  options: string[];
}

type GuessState = 'idle' | 'correct' | 'wrong' | 'revealed';

export default function GameCard() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [round, setRound] = useState<RoundData | null>(null);
  const [loading, setLoading] = useState(true);
  const [guessState, setGuessState] = useState<GuessState>('idle');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [visibleOptions, setVisibleOptions] = useState<string[]>([]);
  const [activeLifelines, setActiveLifelines] = useState<Set<keyof Lifelines>>(new Set());
  const [hintText, setHintText] = useState<string | null>(null);
  const [showTypes, setShowTypes] = useState(false);
  const [showEvo, setShowEvo] = useState(false);
  const [blurLevel, setBlurLevel] = useState<'blur-md' | 'blur-[2px]' | ''>('blur-md');
  const [secondChanceUsed, setSecondChanceUsed] = useState(false);
  const [hasSecondChanceActive, setHasSecondChanceActive] = useState(false);
  const [milestoneToShow, setMilestoneToShow] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load state from localStorage on mount
  useEffect(() => {
    setGameState(loadGameState());
  }, []);

  const fetchRound = useCallback(async () => {
    setLoading(true);
    setGuessState('idle');
    setSelectedOption(null);
    setActiveLifelines(new Set());
    setHintText(null);
    setShowTypes(false);
    setShowEvo(false);
    setBlurLevel('blur-md');
    setSecondChanceUsed(false);
    setHasSecondChanceActive(false);
    setError(null);

    try {
      const res = await fetch('/api/card');
      if (!res.ok) throw new Error('Failed to load card');
      const data: RoundData = await res.json();
      setRound(data);
      setVisibleOptions(data.options);
    } catch {
      setError('Could not load a card. Try again!');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (gameState !== null) fetchRound();
  }, [gameState === null]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGuess = (option: string) => {
    if (!round || !gameState || guessState === 'correct') return;

    setSelectedOption(option);

    if (option === round.card.name) {
      // Correct!
      setGuessState('correct');
      setBlurLevel('');
      fireCorrectConfetti();

      const newState = addCapturedCard(gameState, {
        id: round.card.id,
        name: round.card.name,
        imageSmall: round.card.images.small,
        imageLarge: round.card.images.large,
        types: round.card.types,
        set: round.card.set,
      });
      setGameState(newState);

      // Check for milestone
      const count = newState.totalGuessed;
      if (MILESTONES[count]) {
        fireMilestoneConfetti();
        setMilestoneToShow(count);
      }
    } else {
      // Wrong
      if (hasSecondChanceActive && !secondChanceUsed) {
        // Second chance — don't end turn, just let them pick again
        setSecondChanceUsed(true);
        setSelectedOption(null);
        setGuessState('idle');
        // Remove second chance from active set visually
        setActiveLifelines((prev) => {
          const next = new Set(prev);
          next.delete('secondChance');
          return next;
        });
        return;
      }
      setGuessState('wrong');
      const newState = recordMiss(gameState);
      setGameState(newState);
    }
  };

  const handleLifeline = (key: keyof Lifelines) => {
    if (!round || !gameState) return;

    const newState = useLifeline(gameState, key);
    setGameState(newState);
    setActiveLifelines((prev) => new Set([...prev, key]));

    switch (key) {
      case 'fiftyFifty': {
        const wrong = visibleOptions.filter((o) => o !== round.card.name);
        const toRemove = wrong.sort(() => Math.random() - 0.5).slice(0, 2);
        setVisibleOptions((prev) => prev.filter((o) => !toRemove.includes(o)));
        break;
      }
      case 'hint': {
        const card = round.card;
        const raw =
          card.flavorText ||
          card.abilities?.[0]?.text ||
          'No hint available.';
        // Redact the Pokémon name
        const safeRegex = new RegExp(card.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        setHintText(raw.replace(safeRegex, '[REDACTED]'));
        break;
      }
      case 'typeReveal':
        setShowTypes(true);
        break;
      case 'artistInsight':
        setBlurLevel('blur-[2px]');
        break;
      case 'evolutionChain':
        setShowEvo(true);
        break;
      case 'secondChance':
        setHasSecondChanceActive(true);
        break;
    }
  };

  const handleCloseMilestone = () => {
    const wasGrandChampion = milestoneToShow === TARGET;
    setMilestoneToShow(null);
    if (!wasGrandChampion) fetchRound();
  };

  if (!gameState) return null;

  if (gameState.totalGuessed >= TARGET && !milestoneToShow) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="text-6xl mb-4">🏆</div>
        <h2 className="text-3xl font-black text-indigo-900 mb-2">Grand Champion!</h2>
        <p className="text-lg text-indigo-700 mb-6">Oliver completed the Decade Defender challenge!</p>
        <Link
          href="/gallery"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-full text-lg transition-colors"
        >
          View Your Collection
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-lg mx-auto">
      {milestoneToShow && (
        <MilestonePopup count={milestoneToShow} onClose={handleCloseMilestone} />
      )}

      {/* Progress */}
      <ProgressBar
        captured={gameState.totalGuessed}
        score={gameState.score}
        streak={gameState.currentStreak}
      />

      {/* Card display */}
      <div className="relative bg-white rounded-3xl shadow-xl overflow-hidden border-4 border-indigo-200">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin text-4xl">⚙️</div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <p className="text-red-500 font-bold">{error}</p>
            <button
              onClick={fetchRound}
              className="bg-indigo-600 text-white font-bold py-2 px-6 rounded-full"
            >
              Retry
            </button>
          </div>
        ) : round ? (
          <>
            <div className="relative flex justify-center p-4 bg-gradient-to-b from-indigo-50 to-white">
              <div className="relative w-48 h-64">
                <Image
                  src={round.card.images.small}
                  alt={guessState === 'correct' ? round.card.name : 'Mystery Pokémon'}
                  fill
                  className={`object-contain rounded-xl transition-all duration-700 ${
                    guessState === 'correct' ? '' : blurLevel
                  }`}
                  sizes="192px"
                  priority
                />
              </div>
              {guessState === 'correct' && (
                <div className="absolute top-4 right-4 bg-green-500 text-white font-black text-sm px-3 py-1 rounded-full animate-bounce">
                  Correct! ✓
                </div>
              )}
              {guessState === 'wrong' && (
                <div className="absolute top-4 right-4 bg-red-500 text-white font-black text-sm px-3 py-1 rounded-full">
                  Wrong ✗
                </div>
              )}
            </div>

            {/* Lifeline info panels */}
            {(hintText || showTypes || showEvo) && (
              <div className="px-4 pb-2 flex flex-col gap-2">
                {hintText && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-3 text-sm text-yellow-800 italic">
                    💡 {hintText}
                  </div>
                )}
                {showTypes && round.card.types && (
                  <div className="flex gap-2 flex-wrap">
                    {round.card.types.map((t) => (
                      <TypeBadge key={t} type={t} />
                    ))}
                  </div>
                )}
                {showEvo && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3 text-sm font-semibold text-indigo-800">
                    🧬{' '}
                    {round.card.evolvesFrom
                      ? `Evolves from ${round.card.evolvesFrom}`
                      : 'Basic Pokémon'}
                  </div>
                )}
              </div>
            )}

            {/* Answer options */}
            <div className="p-4 grid grid-cols-2 gap-3">
              {round.options.map((option) => {
                const isVisible = visibleOptions.includes(option);
                if (!isVisible) return null;

                let style =
                  'bg-indigo-100 hover:bg-indigo-200 text-indigo-900 border-2 border-indigo-300 hover:border-indigo-500 active:scale-95';

                if (guessState !== 'idle') {
                  if (option === round.card.name) {
                    style = 'bg-green-500 text-white border-2 border-green-600';
                  } else if (option === selectedOption) {
                    style = 'bg-red-400 text-white border-2 border-red-500';
                  } else {
                    style = 'bg-gray-100 text-gray-400 border-2 border-gray-200 opacity-60';
                  }
                }

                return (
                  <button
                    key={option}
                    onClick={() => handleGuess(option)}
                    disabled={guessState !== 'idle'}
                    className={`font-bold text-sm py-3 px-2 rounded-2xl transition-all text-center ${style}`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            {/* Next card button */}
            {(guessState === 'correct' || guessState === 'wrong') && !milestoneToShow && (
              <div className="px-4 pb-4">
                <button
                  onClick={fetchRound}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-2xl transition-colors text-lg"
                >
                  Next Card →
                </button>
              </div>
            )}

            {/* Artist credit (shown after correct) */}
            {guessState === 'correct' && round.card.artist && (
              <div className="px-4 pb-4 text-center text-xs text-gray-400">
                Art by {round.card.artist} · {round.card.set}
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Lifeline bar */}
      {guessState === 'idle' && round && !loading && (
        <LifelineBar
          lifelines={gameState.lifelines}
          activeLifelines={activeLifelines}
          onUse={handleLifeline}
        />
      )}

      {/* Gallery link */}
      {gameState.capturedCards.length > 0 && (
        <Link
          href="/gallery"
          className="text-center text-indigo-600 underline font-semibold text-sm"
        >
          View Gallery ({gameState.capturedCards.length} cards) →
        </Link>
      )}
    </div>
  );
}

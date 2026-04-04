'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  GameState,
  loadGameState,
  resetGameState,
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
  const [blurLevel, setBlurLevel] = useState<'high' | 'low' | 'none'>('high');
  const [isRevealing, setIsRevealing] = useState(false);
  const [secondChanceUsed, setSecondChanceUsed] = useState(false);
  const [hasSecondChanceActive, setHasSecondChanceActive] = useState(false);
  const [milestoneToShow, setMilestoneToShow] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

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
    setBlurLevel('high');
    setIsRevealing(false);
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
      // Correct! — trigger cinematic reveal
      setGuessState('correct');
      setIsRevealing(true);
      setTimeout(() => setIsRevealing(false), 1000);
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
        setSecondChanceUsed(true);
        setSelectedOption(null);
        setGuessState('idle');
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
        const safeRegex = new RegExp(card.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        setHintText(raw.replace(safeRegex, '[REDACTED]'));
        break;
      }
      case 'typeReveal':
        setShowTypes(true);
        break;
      case 'artistInsight':
        setBlurLevel('low');
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

  const handleNewGame = () => {
    const fresh = resetGameState();
    setGameState(fresh);
    setConfirmReset(false);
    fetchRound();
  };

  if (!gameState) return null;

  if (gameState.totalGuessed >= TARGET && !milestoneToShow) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 rounded-3xl card-glow"
        style={{ background: '#111532', border: '1px solid rgba(157, 53, 255, 0.3)' }}
      >
        <div className="text-6xl mb-4">🏆</div>
        <h2
          className="text-3xl font-black mb-2"
          style={{ color: '#f0c040', textShadow: '0 0 20px rgba(240, 192, 64, 0.5)' }}
        >
          Grand Champion!
        </h2>
        <p className="text-lg mb-6" style={{ color: '#9d70cc' }}>
          Oliver completed the Decade Defender challenge!
        </p>
        <Link
          href="/gallery"
          className="font-bold py-3 px-8 rounded-full text-lg transition-all hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, #7b2fff, #c86fff)',
            color: '#fff',
            boxShadow: '0 0 20px rgba(157, 53, 255, 0.5)',
          }}
        >
          View Your Collection
        </Link>
      </div>
    );
  }

  // Image filter logic
  let imageFilter = '';
  if (guessState === 'correct') {
    imageFilter = 'none';
  } else if (blurLevel === 'high') {
    imageFilter = 'blur(8px)';
  } else if (blurLevel === 'low') {
    imageFilter = 'blur(2px)';
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-lg mx-auto">
      {milestoneToShow && (
        <MilestonePopup count={milestoneToShow} onClose={handleCloseMilestone} />
      )}

      {/* Progress / metrics dashboard */}
      <ProgressBar
        captured={gameState.totalGuessed}
        score={gameState.score}
        streak={gameState.currentStreak}
        incorrectGuesses={gameState.incorrectGuesses}
      />

      {/* Main exhibit card */}
      <div
        className="relative rounded-3xl overflow-hidden card-glow"
        style={{
          background: '#111532',
          border: '1px solid rgba(157, 53, 255, 0.35)',
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin text-4xl">⚙️</div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <p className="font-bold" style={{ color: '#ff356e' }}>{error}</p>
            <button
              onClick={fetchRound}
              className="font-bold py-2 px-6 rounded-full transition-all hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #7b2fff, #c86fff)',
                color: '#fff',
              }}
            >
              Retry
            </button>
          </div>
        ) : round ? (
          <>
            {/* Card image section */}
            <div
              className="relative flex justify-center p-6"
              style={{ background: 'linear-gradient(180deg, #0d1240 0%, #111532 100%)' }}
            >
              {/* Energy ring behind card */}
              <div
                className="ring-pulse absolute inset-0 m-auto rounded-2xl pointer-events-none"
                style={{
                  width: '200px',
                  height: '272px',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: 'radial-gradient(ellipse, rgba(157, 53, 255, 0.15) 0%, transparent 70%)',
                }}
              />

              <div className="relative w-48 h-64 z-10">
                <Image
                  src={round.card.images.small}
                  alt={guessState === 'correct' ? round.card.name : 'Mystery Pokémon'}
                  fill
                  className={`object-contain rounded-xl transition-all duration-700 ${
                    guessState === 'correct' && isRevealing ? 'shimmer-reveal' : ''
                  }`}
                  style={{ filter: imageFilter }}
                  sizes="192px"
                  priority
                />
              </div>

              {/* Result badge */}
              {guessState === 'correct' && (
                <div
                  className="absolute top-4 right-4 font-black text-sm px-3 py-1 rounded-full animate-bounce"
                  style={{
                    background: 'rgba(57, 235, 140, 0.2)',
                    border: '1px solid #39eb8c',
                    color: '#39eb8c',
                  }}
                >
                  ✓ Correct!
                </div>
              )}
              {guessState === 'wrong' && (
                <div
                  className="absolute top-4 right-4 font-black text-sm px-3 py-1 rounded-full"
                  style={{
                    background: 'rgba(255, 53, 110, 0.2)',
                    border: '1px solid #ff356e',
                    color: '#ff356e',
                  }}
                >
                  ✗ Wrong
                </div>
              )}
            </div>

            {/* Lifeline info panels */}
            {(hintText || showTypes || showEvo) && (
              <div className="px-4 pb-2 flex flex-col gap-2">
                {hintText && (
                  <div
                    className="rounded-2xl p-3 text-sm italic"
                    style={{
                      background: 'rgba(240, 192, 64, 0.08)',
                      border: '1px solid rgba(240, 192, 64, 0.25)',
                      color: '#d4aa60',
                    }}
                  >
                    💡 {hintText}
                  </div>
                )}
                {showTypes && round.card.types && (
                  <div className="flex gap-2 flex-wrap px-1">
                    {round.card.types.map((t) => (
                      <TypeBadge key={t} type={t} />
                    ))}
                  </div>
                )}
                {showEvo && (
                  <div
                    className="rounded-2xl p-3 text-sm font-semibold"
                    style={{
                      background: 'rgba(157, 53, 255, 0.08)',
                      border: '1px solid rgba(157, 53, 255, 0.25)',
                      color: '#c8a8ff',
                    }}
                  >
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

                const isCorrectOption = option === round.card.name;
                const isSelectedWrong = option === selectedOption && guessState === 'wrong';

                let glowClass = '';
                let inlineStyle: React.CSSProperties = {
                  background: '#0d1240',
                  border: '2px solid rgba(157, 53, 255, 0.3)',
                  color: '#c8a8ff',
                };

                if (guessState !== 'idle') {
                  if (isCorrectOption) {
                    glowClass = 'glow-correct';
                    inlineStyle = {
                      background: 'rgba(57, 235, 140, 0.1)',
                      border: '2px solid #39eb8c',
                      color: '#39eb8c',
                    };
                  } else if (isSelectedWrong) {
                    glowClass = 'glow-wrong';
                    inlineStyle = {
                      background: 'rgba(255, 53, 110, 0.1)',
                      border: '2px solid #ff356e',
                      color: '#ff356e',
                    };
                  } else {
                    inlineStyle = {
                      background: 'rgba(255,255,255,0.02)',
                      border: '2px solid rgba(255,255,255,0.07)',
                      color: 'rgba(200,168,255,0.25)',
                    };
                  }
                }

                return (
                  <button
                    key={option}
                    onClick={() => handleGuess(option)}
                    disabled={guessState !== 'idle'}
                    className={`font-bold text-sm py-3 px-2 rounded-2xl transition-all text-center active:scale-95 ${
                      guessState === 'idle' ? 'hover:border-purple-400 hover:bg-[#1a1d50]' : ''
                    } ${glowClass}`}
                    style={inlineStyle}
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
                  className="w-full font-black py-3 rounded-2xl transition-all text-lg hover:scale-[1.02] active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #7b2fff, #c86fff)',
                    color: '#fff',
                    boxShadow: '0 0 16px rgba(157, 53, 255, 0.45)',
                  }}
                >
                  Next Card →
                </button>
              </div>
            )}

            {/* Artist credit */}
            {guessState === 'correct' && round.card.artist && (
              <div className="px-4 pb-4 text-center text-xs" style={{ color: '#4a4070' }}>
                Art by {round.card.artist} · {round.card.set}
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Trainer Tools / Lifeline bar */}
      {guessState === 'idle' && round && !loading && (
        <LifelineBar
          lifelines={gameState.lifelines}
          activeLifelines={activeLifelines}
          onUse={handleLifeline}
        />
      )}

      {/* Footer: Gallery + New Game */}
      <div className="flex items-center justify-between gap-3 px-1 pb-2">
        {gameState.capturedCards.length > 0 ? (
          <Link
            href="/gallery"
            className="font-semibold text-sm flex items-center gap-1 transition-colors hover:opacity-80"
            style={{ color: '#9d35ff' }}
          >
            <span>🖼️</span>
            <span>Gallery ({gameState.capturedCards.length})</span>
            <span>→</span>
          </Link>
        ) : (
          <span />
        )}

        {confirmReset ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold" style={{ color: '#ff356e' }}>Reset everything?</span>
            <button
              onClick={handleNewGame}
              className="font-bold text-xs py-1.5 px-3 rounded-full transition-all hover:scale-105"
              style={{ background: 'rgba(255, 53, 110, 0.2)', border: '1px solid #ff356e', color: '#ff7a9a' }}
            >
              Yes, reset
            </button>
            <button
              onClick={() => setConfirmReset(false)}
              className="font-bold text-xs py-1.5 px-3 rounded-full transition-all hover:scale-105"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#7a5aaa' }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmReset(true)}
            className="font-semibold text-xs transition-colors"
            style={{ color: '#3a2a5a' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ff356e')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#3a2a5a')}
          >
            New Game
          </button>
        )}
      </div>
    </div>
  );
}

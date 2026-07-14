'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  GameState,
  loadGameState,
  resetGameState,
  softResetGameState,
  skipCard,
  addCapturedCard,
  recordDuplicateCatch,
  recordMiss,
  spendLifeline,
  MILESTONES,
  Lifelines,
  TARGET,
} from '@/lib/game-state';
import { fireCorrectConfetti, fireMilestoneConfetti } from '@/lib/confetti';
import {
  isMuted,
  setMuted,
  playClick,
  playCorrect,
  playWrong,
  playMilestone,
  playSkip,
} from '@/lib/sounds';
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
type BlurLevel = 'high' | 'partial' | 'none';

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
  const [blurLevel, setBlurLevel] = useState<BlurLevel>('high');
  const [isRevealing, setIsRevealing] = useState(false);
  const [secondChanceUsed, setSecondChanceUsed] = useState(false);
  const [hasSecondChanceActive, setHasSecondChanceActive] = useState(false);
  const [milestoneToShow, setMilestoneToShow] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [showSmoke, setShowSmoke] = useState(false);
  const [alreadyOwned, setAlreadyOwned] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  // Prefetch pipeline — keeps the next round ready so "Next Card" is instant
  const nextRoundRef = useRef<RoundData | null>(null);
  const prefetchingRef = useRef(false);
  const roundIdRef = useRef<string | null>(null);

  useEffect(() => {
    setGameState(loadGameState());
    setSoundOn(!isMuted());
  }, []);

  useEffect(() => {
    roundIdRef.current = round?.card.id ?? null;
  }, [round]);

  const prefetchNext = useCallback(async () => {
    if (prefetchingRef.current || nextRoundRef.current) return;
    prefetchingRef.current = true;
    try {
      const res = await fetch('/api/card');
      if (res.ok) {
        nextRoundRef.current = (await res.json()) as RoundData;
      }
    } catch {
      // Prefetch is best-effort; the next fetchRound will retry over the network
    } finally {
      prefetchingRef.current = false;
    }
  }, []);

  const fetchRound = useCallback(async () => {
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
    setShowSmoke(false);
    setAlreadyOwned(false);
    setError(null);

    // Use the prefetched round if we have one (and it isn't the card on screen)
    const queued = nextRoundRef.current;
    nextRoundRef.current = null;
    if (queued && queued.card.id !== roundIdRef.current) {
      setRound(queued);
      setVisibleOptions(queued.options);
      setLoading(false);
      prefetchNext();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/card');
      if (!res.ok) throw new Error('Failed to load card');
      const data: RoundData = await res.json();
      setRound(data);
      setVisibleOptions(data.options);
      prefetchNext();
    } catch {
      setError('Could not load a card. Try again!');
    } finally {
      setLoading(false);
    }
  }, [prefetchNext]);

  useEffect(() => {
    if (gameState !== null) fetchRound();
  }, [gameState === null]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGuess = useCallback(
    (option: string) => {
      if (!round || !gameState || guessState !== 'idle') return;

      setSelectedOption(option);

      if (option === round.card.name) {
        setGuessState('correct');
        setBlurLevel('none');
        setIsRevealing(true);
        setTimeout(() => setIsRevealing(false), 1000);
        fireCorrectConfetti();
        playCorrect();

        const isDuplicate = gameState.capturedCardIds.includes(round.card.id);
        if (isDuplicate) {
          setAlreadyOwned(true);
          setGameState(recordDuplicateCatch(gameState));
          return;
        }

        const newState = addCapturedCard(gameState, {
          id: round.card.id,
          name: round.card.name,
          imageSmall: round.card.images.small,
          imageLarge: round.card.images.large,
          types: round.card.types,
          set: round.card.set,
        });
        setGameState(newState);

        const count = newState.totalGuessed;
        if (MILESTONES[count]) {
          fireMilestoneConfetti();
          playMilestone();
          setMilestoneToShow(count);
        }
      } else {
        if (hasSecondChanceActive && !secondChanceUsed) {
          setSecondChanceUsed(true);
          setSelectedOption(null);
          playClick();
          setActiveLifelines((prev) => {
            const next = new Set(prev);
            next.delete('secondChance');
            return next;
          });
          return;
        }
        setGuessState('wrong');
        setBlurLevel('none'); // reveal the card so you learn what it was
        playWrong();
        const newState = recordMiss(gameState);
        setGameState(newState);
      }
    },
    [round, gameState, guessState, hasSecondChanceActive, secondChanceUsed]
  );

  // Keyboard shortcuts: 1-4 to guess, Enter / Space / N for next card
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (loading || !round || milestoneToShow || confirmReset) return;
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      if (guessState === 'idle') {
        const idx = parseInt(e.key, 10) - 1;
        if (idx >= 0 && idx < 4) {
          const rendered = round.options.filter((o) => visibleOptions.includes(o));
          if (rendered[idx]) {
            e.preventDefault();
            handleGuess(rendered[idx]);
          }
        }
      } else if (guessState === 'correct' || guessState === 'wrong') {
        if (e.key === 'Enter' || e.key === ' ' || e.key.toLowerCase() === 'n') {
          e.preventDefault();
          playClick();
          fetchRound();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [loading, round, milestoneToShow, confirmReset, guessState, visibleOptions, handleGuess, fetchRound]);

  const handleLifeline = (key: keyof Lifelines) => {
    if (!round || !gameState) return;

    // Smart Hint: check for content before consuming the charge
    if (key === 'hint') {
      const card = round.card;
      const raw = card.flavorText || card.abilities?.[0]?.text;
      if (!raw) {
        setHintText('🔮 This Pokémon is too mysterious for a hint!');
        return; // Do NOT mark active or decrement counter
      }
      const safeRegex = new RegExp(card.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      setHintText(raw.replace(safeRegex, '[REDACTED]'));
      playClick();
      const newState = spendLifeline(gameState, key);
      setGameState(newState);
      setActiveLifelines((prev) => new Set([...prev, key]));
      return;
    }

    const newState = spendLifeline(gameState, key);
    setGameState(newState);
    setActiveLifelines((prev) => new Set([...prev, key]));
    if (key !== 'skip') playClick();

    switch (key) {
      case 'fiftyFifty': {
        const wrong = visibleOptions.filter((o) => o !== round.card.name);
        const shuffled = [...wrong];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        const toRemove = shuffled.slice(0, 2);
        setVisibleOptions((prev) => prev.filter((o) => !toRemove.includes(o)));
        break;
      }
      case 'typeReveal':
        setShowTypes(true);
        break;
      case 'artistInsight':
        setBlurLevel('partial');
        break;
      case 'evolutionChain':
        setShowEvo(true);
        break;
      case 'secondChance':
        setHasSecondChanceActive(true);
        break;
      case 'skip':
        // Reset streak, no incorrectGuesses penalty, then fetch new card
        setGameState(skipCard(newState));
        setShowSmoke(true);
        playSkip();
        setTimeout(() => fetchRound(), 700);
        break;
    }
  };

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setMuted(!next);
    if (next) playClick();
  };

  const handleCloseMilestone = () => {
    const wasGrandChampion = milestoneToShow === TARGET;
    setMilestoneToShow(null);
    if (!wasGrandChampion) fetchRound();
  };

  const handleNewGame = (keepGallery: boolean) => {
    const fresh = keepGallery
      ? softResetGameState(gameState!)
      : resetGameState();
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
        <p className="text-lg mb-4" style={{ color: '#9d70cc' }}>
          Oliver completed the Decade Defender challenge!
        </p>

        {/* View collection */}
        <Link
          href="/gallery"
          className="font-bold py-3 px-8 rounded-full text-lg transition-all hover:scale-105 mb-6"
          style={{
            background: 'linear-gradient(135deg, #7b2fff, #c86fff)',
            color: '#fff',
            boxShadow: '0 0 20px rgba(157, 53, 255, 0.5)',
          }}
        >
          View Your Collection
        </Link>

        {/* New game options */}
        <p className="text-sm font-semibold mb-3" style={{ color: '#4a3a7a' }}>
          — or start a new run —
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          <button
            onClick={() => handleNewGame(true)}
            className="font-bold py-2 px-5 rounded-full text-sm transition-all hover:scale-105"
            style={{
              background: 'rgba(57, 235, 140, 0.15)',
              border: '1px solid #39eb8c',
              color: '#39eb8c',
            }}
            title="Reset score &amp; streak but keep your gallery"
          >
            Keep Gallery
          </button>
          <button
            onClick={() => handleNewGame(false)}
            className="font-bold py-2 px-5 rounded-full text-sm transition-all hover:scale-105"
            style={{
              background: 'rgba(255, 53, 110, 0.15)',
              border: '1px solid #ff356e',
              color: '#ff7a9a',
            }}
            title="Wipe everything and start fresh"
          >
            Reset All
          </button>
        </div>
      </div>
    );
  }

  // Image filter for the base (non-partial) layer
  const baseFilter = blurLevel === 'high' ? 'blur(8px)' : 'none';
  const answered = guessState === 'correct' || guessState === 'wrong';

  return (
    <div className="flex flex-col gap-4 w-full max-w-lg mx-auto">
      {milestoneToShow && (
        <MilestonePopup count={milestoneToShow} onClose={handleCloseMilestone} />
      )}

      <ProgressBar
        captured={gameState.totalGuessed}
        score={gameState.score}
        streak={gameState.currentStreak}
        bestStreak={gameState.bestStreak}
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
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="pokeball-spinner" aria-label="Loading" role="status" />
            <p className="text-sm font-bold" style={{ color: '#7a5aaa' }}>
              Searching tall grass…
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <p className="font-bold" style={{ color: '#ff356e' }}>{error}</p>
            <button
              onClick={fetchRound}
              className="font-bold py-2 px-6 rounded-full transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #7b2fff, #c86fff)', color: '#fff' }}
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
              {/* Energy ring */}
              <div
                className="ring-pulse absolute pointer-events-none"
                style={{
                  width: '200px',
                  height: '272px',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: 'radial-gradient(ellipse, rgba(157, 53, 255, 0.15) 0%, transparent 70%)',
                }}
              />

              {/* Smoke screen overlay — Tactical Skip */}
              {showSmoke && (
                <div
                  className="smoke-screen absolute inset-0 z-20 pointer-events-none rounded-2xl"
                />
              )}

              {/* Card image — handles all blur states */}
              <div key={round.card.id} className="relative w-48 h-64 z-10 card-deal">
                {blurLevel === 'partial' ? (
                  <>
                    {/* Top half: fully blurred */}
                    <Image
                      src={round.card.images.small}
                      alt="Mystery Pokémon"
                      fill
                      className="object-contain rounded-xl"
                      style={{ filter: 'blur(8px)' }}
                      sizes="192px"
                      preload
                    />
                    {/* Bottom half: revealed via mask */}
                    <div
                      className="absolute inset-0"
                      style={{
                        WebkitMaskImage:
                          'linear-gradient(to bottom, transparent 48%, black 54%)',
                        maskImage:
                          'linear-gradient(to bottom, transparent 48%, black 54%)',
                      }}
                    >
                      <Image
                        src={round.card.images.small}
                        alt="Mystery Pokémon bottom"
                        fill
                        className="object-contain rounded-xl"
                        style={{ filter: 'none' }}
                        sizes="192px"
                      />
                    </div>
                  </>
                ) : (
                  <Image
                    src={round.card.images.small}
                    alt={answered ? round.card.name : 'Mystery Pokémon'}
                    fill
                    className={`object-contain rounded-xl transition-all duration-700 ${
                      guessState === 'correct' && isRevealing ? 'shimmer-reveal' : ''
                    }`}
                    style={{ filter: baseFilter }}
                    sizes="192px"
                    preload
                  />
                )}
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

            {/* Reveal banner after a wrong guess — see what it actually was */}
            {guessState === 'wrong' && (
              <div className="px-4 pb-1 text-center">
                <p className="font-bold text-sm" style={{ color: '#c8a8ff' }}>
                  It was <span style={{ color: '#39eb8c' }}>{round.card.name}</span>!
                </p>
              </div>
            )}

            {/* Already-captured note — still counts for score & streak */}
            {alreadyOwned && guessState === 'correct' && (
              <div className="px-4 pb-1 text-center">
                <p className="font-bold text-sm" style={{ color: '#f0c040' }}>
                  ✨ Already in your gallery — still counts for score &amp; streak!
                </p>
              </div>
            )}

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

            {/* Answer options — fixed height for consistency */}
            <div className="p-4 grid grid-cols-2 gap-3">
              {round.options.map((option) => {
                const isVisible = visibleOptions.includes(option);
                if (!isVisible) return null;

                const keyNumber =
                  round.options.filter((o) => visibleOptions.includes(o)).indexOf(option) + 1;
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
                    className={`relative font-bold text-sm px-2 rounded-2xl transition-all text-center
                      flex items-center justify-center active:scale-95 ${
                      guessState === 'idle'
                        ? 'hover:border-purple-400 hover:bg-[#1a1d50]'
                        : ''
                    } ${glowClass}`}
                    style={{ ...inlineStyle, minHeight: '56px' }}
                  >
                    {guessState === 'idle' && (
                      <span
                        className="absolute top-1 left-2 hidden sm:inline text-[10px] font-black opacity-40"
                        aria-hidden="true"
                      >
                        {keyNumber}
                      </span>
                    )}
                    {option}
                  </button>
                );
              })}
            </div>

            {/* Next card button */}
            {answered && !milestoneToShow && (
              <div className="px-4 pb-4">
                <button
                  onClick={() => {
                    playClick();
                    fetchRound();
                  }}
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

            {/* Artist credit — shown once the card is revealed */}
            {answered && round.card.artist && (
              <div className="px-4 pb-4 text-center text-xs" style={{ color: '#4a4070' }}>
                Art by {round.card.artist} · {round.card.set}
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Trainer Tools */}
      {guessState === 'idle' && round && !loading && (
        <LifelineBar
          lifelines={gameState.lifelines}
          activeLifelines={activeLifelines}
          onUse={handleLifeline}
        />
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 px-1 pb-2">
        <div className="flex items-center gap-3">
          <Link
            href="/gallery"
            className="font-semibold text-sm flex items-center gap-1 transition-colors hover:opacity-80"
            style={{ color: '#9d35ff' }}
          >
            <span>🖼️</span>
            <span>
              Gallery
              {gameState.capturedCards.length > 0 && ` (${gameState.capturedCards.length})`}
            </span>
            <span>→</span>
          </Link>
          <button
            onClick={handleToggleSound}
            className="text-sm transition-all hover:scale-110 active:scale-95"
            style={{ opacity: soundOn ? 1 : 0.45 }}
            title={soundOn ? 'Mute sounds' : 'Unmute sounds'}
            aria-label={soundOn ? 'Mute sounds' : 'Unmute sounds'}
          >
            {soundOn ? '🔊' : '🔇'}
          </button>
        </div>

        {confirmReset ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold" style={{ color: '#c8a8ff' }}>New game?</span>
            <button
              onClick={() => handleNewGame(true)}
              className="font-bold text-xs py-1.5 px-3 rounded-full transition-all hover:scale-105"
              style={{
                background: 'rgba(57, 235, 140, 0.15)',
                border: '1px solid #39eb8c',
                color: '#39eb8c',
              }}
              title="Reset score &amp; streak but keep your gallery"
            >
              Keep Gallery
            </button>
            <button
              onClick={() => handleNewGame(false)}
              className="font-bold text-xs py-1.5 px-3 rounded-full transition-all hover:scale-105"
              style={{
                background: 'rgba(255, 53, 110, 0.2)',
                border: '1px solid #ff356e',
                color: '#ff7a9a',
              }}
              title="Wipe everything including gallery"
            >
              Reset All
            </button>
            <button
              onClick={() => setConfirmReset(false)}
              className="font-bold text-xs py-1.5 px-3 rounded-full transition-all hover:scale-105"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#7a5aaa',
              }}
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

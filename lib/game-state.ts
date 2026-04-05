// Game state management with localStorage persistence

export interface Lifelines {
  fiftyFifty: number;
  hint: number;
  typeReveal: number;
  artistInsight: number;
  evolutionChain: number;
  secondChance: number;
}

export interface CapturedCard {
  id: string;
  name: string;
  imageSmall: string;
  imageLarge: string;
  types?: string[];
  set: string;
  isFavorite?: boolean;
}

export interface GameState {
  totalGuessed: number; // cards in capturedCardIds
  score: number;
  currentStreak: number;
  incorrectGuesses: number;
  capturedCardIds: string[];
  capturedCards: CapturedCard[];
  lifelines: Lifelines;
}

const STORAGE_KEY = 'poke-guess-decade-defender';
const TARGET = 100;

export const MILESTONES: Record<number, { title: string; subtitle: string; refillLifelines?: boolean }> = {
  10: { title: 'Scout Rank!', subtitle: 'Oliver is now a Scout!' },
  20: { title: 'Trainer Rank!', subtitle: 'Oliver has become a real Trainer!' },
  50: { title: 'Ace Trainer!', subtitle: 'Halfway there — Ace Trainer status achieved!', refillLifelines: true },
  75: { title: 'Elite Rank Reached!', subtitle: 'Oliver is in the Elite Four territory!' },
  100: { title: 'GRAND CHAMPION!', subtitle: "Oliver is the Decade Defender — Pokémon TCG Grand Champion!" },
};

export const DEFAULT_LIFELINES: Lifelines = {
  fiftyFifty: 5,
  hint: 5,
  typeReveal: 5,
  artistInsight: 5,
  evolutionChain: 5,
  secondChance: 5,
};

export function loadGameState(): GameState {
  if (typeof window === 'undefined') return defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const state = JSON.parse(raw) as GameState;
    // Migrate: ensure new fields have defaults for existing save data
    if (state.incorrectGuesses === undefined) state.incorrectGuesses = 0;
    return state;
  } catch {
    return defaultState();
  }
}

function defaultState(): GameState {
  return {
    totalGuessed: 0,
    score: 0,
    currentStreak: 0,
    incorrectGuesses: 0,
    capturedCardIds: [],
    capturedCards: [],
    lifelines: { ...DEFAULT_LIFELINES },
  };
}

export function saveGameState(state: GameState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetGameState(): GameState {
  const state = defaultState();
  saveGameState(state);
  return state;
}

/** Reset stats and lifelines but keep the captured card collection. */
export function softResetGameState(current: GameState): GameState {
  const state: GameState = {
    ...defaultState(),
    capturedCardIds: current.capturedCardIds,
    capturedCards: current.capturedCards,
  };
  saveGameState(state);
  return state;
}

export function addCapturedCard(state: GameState, card: CapturedCard): GameState {
  if (state.capturedCardIds.includes(card.id)) return state;
  const newState: GameState = {
    ...state,
    totalGuessed: state.totalGuessed + 1,
    score: state.score + 1,
    currentStreak: state.currentStreak + 1,
    capturedCardIds: [...state.capturedCardIds, card.id],
    capturedCards: [...state.capturedCards, card],
  };

  // Check milestone 50 — refill all lifelines
  if (newState.totalGuessed === 50) {
    newState.lifelines = { ...DEFAULT_LIFELINES };
  }

  saveGameState(newState);
  return newState;
}

export function recordMiss(state: GameState): GameState {
  const newState: GameState = {
    ...state,
    currentStreak: 0,
    incorrectGuesses: state.incorrectGuesses + 1,
  };
  saveGameState(newState);
  return newState;
}

export function useLifeline(state: GameState, lifeline: keyof Lifelines): GameState {
  if (state.lifelines[lifeline] <= 0) return state;
  const newState: GameState = {
    ...state,
    lifelines: {
      ...state.lifelines,
      [lifeline]: state.lifelines[lifeline] - 1,
    },
  };
  saveGameState(newState);
  return newState;
}

/** Toggle isFavorite on a captured card. */
export function toggleFavorite(state: GameState, cardId: string): GameState {
  const newState: GameState = {
    ...state,
    capturedCards: state.capturedCards.map((c) =>
      c.id === cardId ? { ...c, isFavorite: !c.isFavorite } : c
    ),
  };
  saveGameState(newState);
  return newState;
}

/** Release (delete) a card from the collection. Does not affect score. */
export function releaseCard(state: GameState, cardId: string): GameState {
  const newState: GameState = {
    ...state,
    capturedCardIds: state.capturedCardIds.filter((id) => id !== cardId),
    capturedCards: state.capturedCards.filter((c) => c.id !== cardId),
  };
  saveGameState(newState);
  return newState;
}

export { TARGET };

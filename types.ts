export type Suit = 'man' | 'pin' | 'sou' | 'zihai';

export interface Tile {
  id: string;
  suit: Suit;
  value: number; // 1-9 for suits, 1-7 for zihai
  symbol?: string;
}

// Simplified analysis structure
export interface Suggestion {
  discard: string; // The tile to throw away
  score: number; // Internal ranking score (optional)
  waitingTiles: string[]; // Effective tiles (Jin Zhang)
  comment: string; // Brief math note (e.g., "Max tile acceptance")
}

export interface AnalysisResponse {
  suggestions: Suggestion[];
}

export interface GameRules {
  region: string;
  customInstructions: string;
}
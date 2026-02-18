import React from 'react';
import { Suit, Tile } from './types';

export const SUITS: { type: Suit; label: string }[] = [
  { type: 'man', label: '万' },
  { type: 'pin', label: '筒' },
  { type: 'sou', label: '条' },
  { type: 'zihai', label: '字' },
];

export const REGIONS = [
  { id: 'hubei', name: '湖北麻将 (红中癞子杠)' },
  { id: 'general', name: '通用麻将' }
];

// Helper to generate full deck
export const generateDeck = (): Tile[] => {
  const deck: Tile[] = [];

  // Man (Characters)
  for (let i = 1; i <= 9; i++) {
    deck.push({ id: `man-${i}`, suit: 'man', value: i, symbol: getManSymbol(i) });
  }
  // Pin (Dots)
  for (let i = 1; i <= 9; i++) {
    deck.push({ id: `pin-${i}`, suit: 'pin', value: i });
  }
  // Sou (Bamboo)
  for (let i = 1; i <= 9; i++) {
    deck.push({ id: `sou-${i}`, suit: 'sou', value: i });
  }
  // Zihai (Honors)
  // Order in logic: East, South, West, North, White, Green, Red
  const honors = ['东', '南', '西', '北', '白', '发', '中'];
  honors.forEach((h, i) => {
    deck.push({ id: `zihai-${i + 1}`, suit: 'zihai', value: i + 1, symbol: h });
  });

  return deck;
};

const getManSymbol = (num: number): string => {
  const map = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
  return map[num - 1];
};

// Use jsDelivr to serve optimized SVGs from the FluffyStuff repository
// This ensures all tiles are available without manual download
// Local assets served from public/tiles
const BASE_URL = "/tiles";

export const getTileImageSrc = (tile: Tile): string => {
  let filename = '';

  if (tile.suit === 'man') {
    filename = `Man${tile.value}.svg`;
  } else if (tile.suit === 'pin') {
    filename = `Pin${tile.value}.svg`;
  } else if (tile.suit === 'sou') {
    filename = `Sou${tile.value}.svg`;
  } else if (tile.suit === 'zihai') {
    switch (tile.value) {
      case 1: filename = 'Ton.svg'; break; // East
      case 2: filename = 'Nan.svg'; break; // South
      case 3: filename = 'Shaa.svg'; break; // West
      case 4: filename = 'Pei.svg'; break; // North
      case 5: filename = 'Haku.svg'; break; // White
      case 6: filename = 'Hatsu.svg'; break; // Green
      case 7: filename = 'Chun.svg'; break; // Red
      default: filename = 'Man1.svg'; // Fallback
    }
  }

  return `${BASE_URL}/${filename}`;
};

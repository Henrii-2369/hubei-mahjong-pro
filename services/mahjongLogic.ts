import { Tile, Suggestion, AnalysisResponse } from "../types";

// Map internal suit representation to array indices
// 0-8: Man, 9-17: Pin, 18-26: Sou, 27-33: Zihai (E, S, W, N, W, G, R)
const TILE_MAX = 34;

const getTileIndex = (tile: Tile): number => {
  if (tile.suit === 'man') return tile.value - 1;
  if (tile.suit === 'pin') return 9 + tile.value - 1;
  if (tile.suit === 'sou') return 18 + tile.value - 1;
  // Zihai: value 1-7 -> index 27-33
  return 27 + tile.value - 1;
};

const getTileName = (index: number): string => {
  if (index < 9) return `${index + 1}万`;
  if (index < 18) return `${index - 9 + 1}筒`;
  if (index < 27) return `${index - 18 + 1}条`;
  const honors = ['东', '南', '西', '北', '白', '发', '中'];
  return honors[index - 27];
};

// Hubei Rule: Eye must be 2, 5, or 8 of Man/Pin/Sou
const VALID_EYES = [
  1, 4, 7,        // 2, 5, 8 Man
  10, 13, 16,     // 2, 5, 8 Pin
  19, 22, 25      // 2, 5, 8 Sou
];

const RED_DRAGON_INDEX = 33; // 中 (Zihai 7)

// ----------------------------------------------------------------------
// Shanten Calculation Logic
// ----------------------------------------------------------------------

// Standard Shanten is: 8 - 2*Groups - Partials - Pair
// Hubei Special: Pair must be 2, 5, or 8.
// We need to return the minimum shanten number.
// -1 = Hu
// 0 = Ting (Ready)
// 1 = 1-Shanten
// ...

const calculateShanten = (counts: number[], wildcards: number): number => {
  let minShanten = 8;

  // 1. Try with a specific Valid Eye (2,5,8)
  for (const eye of VALID_EYES) {
    if (counts[eye] >= 2) {
      counts[eye] -= 2;
      // Eye Completed: hasEye=true
      minShanten = Math.min(minShanten, calculateSubShanten(counts, wildcards, true));
      counts[eye] += 2;
    } else if (counts[eye] === 1) {
      // Eye Partial (Tanki Wait): We have 1, need 1 more.
      // Treat this single as a Partial Pair. 
      // We recurse with hasEye=false (because eye is not complete), 
      // but we manually seed p=1 to represent the partial eye.
      // Note: We use wildcards if available to complete it? 
      // If wildcards >= 1, the original logic handled it:
      // } else if (counts[eye] === 1 && wildcards >= 1) { ... hasEye=true }
      // But if wildcards == 0, we can still say it's a Partial Eye (waiting for match).

      if (wildcards >= 1) {
        counts[eye] -= 1;
        minShanten = Math.min(minShanten, calculateSubShanten(counts, wildcards - 1, true));
        counts[eye] += 1;
      } else {
        // No wildcard. Use single as Partial Eye.
        // Effectively: counts[eye]-- (remove from general pool), search(..., p=1).
        counts[eye] -= 1;
        // Easiest is to modify calculateSubShanten to take initial P? 
        // Or just realize calculateSubShanten(counts, w, false) -> 8 - 2G - P.
        // If we remove the single eye, run search(..., false), we get 8 - 2G - P_rest.
        // Then we add back our Partial Eye (P=1).
        // So result = 8 - 2G - (P_rest + 1) = (8 - 2G - P_rest) - 1.
        // So result = calculateSubShanten(counts, wildcards, false) - 1.
        // FIX: If calculateSubShanten returns 0 (4 sets), result becomes -1 (Hu).
        // BUT a Single Eye means we are missing the second half of the pair.
        // So we are TENPAI (0), not HU (-1).
        // Therefore, we must clamp the result to at least 0.
        const subShanten = calculateSubShanten(counts, wildcards, false) - 1;
        minShanten = Math.min(minShanten, Math.max(0, subShanten));
        counts[eye] += 1;
      }
    } else if (wildcards >= 2) {
      minShanten = Math.min(minShanten, calculateSubShanten(counts, wildcards - 2, true));
    }
  }

  // 2. Try WITHOUT a predetermined eye
  // Normalized formula: 8 - 2*G - P - (Eye? 1:0)
  // If we don't pick an eye now, we effectively say Eye=0.
  // CRITICAL FIX FOR HUBEI: 
  // If we don't have a Valid Eye (Branch 2), we CANNOT be Tenpai (0) or Hu (-1),
  // unless we are waiting for a Single Valid Eye (Tanki), which is handled in Branch 1 above.
  // Therefore, the result of this branch must be capped at min 1 (1-Shanten).
  // Exception: If logic failure in Branch 1? No, Branch 1 covers all valid eyes.
  // So if we rely on Branch 2, it means we are building sets but ignoring the eye requirement.
  // Thus we are "Waiting for Eye" -> 1-Shanten.

  let noEyeShanten = calculateSubShanten(counts, wildcards, false);
  if (noEyeShanten < 1) noEyeShanten = 1;

  minShanten = Math.min(minShanten, noEyeShanten);

  return minShanten;
};

// Recursive function to max out Groups and Partials
// Returns shanten value for the given state: 8 - 2*G - P - (hasEye ? 1 : 0)
const calculateSubShanten = (counts: number[], wildcards: number, hasEye: boolean): number => {
  let currentMaxScore = 0;

  // DFS to maximize score = 2*G + P
  const search = (index: number, w: number, g: number, p: number) => {
    // Optimization: if g + p/2 is already not enough to beat currentMaxScore?
    // Max theoretical remaining: (34-index) tiles? No.
    // Basic bounding: Max G=4.

    if (g > 4) return;

    // Find next tile
    while (index < TILE_MAX && counts[index] === 0) {
      index++;
    }

    if (index === TILE_MAX) {
      // Analyze remaining wildcards
      let currentG = g;
      let currentP = p;
      let remW = w;

      // Heuristic for leftover wildcards:
      // Can form groups (3w) or partials (2w)?
      // Actually standard shanten only counts sets/partials.
      // If we have unused wildcards, we can use them to form groups/partials arbitrarily.

      if (remW >= 3) {
        const newG = Math.floor(remW / 3);
        currentG += newG;
        remW %= 3;
      }

      // If we have 2 wildcards left, we make a pair (partial)
      // If we have 1 wildcard left? It can potentially combine with stored single tiles (not tracked).
      // Standard algorithm usually tracks singles.
      // Simplify: 2 wildcards = 1 Partial.
      if (remW >= 2) {
        currentP += 1;
      }

      // Apply constraints
      if (currentG > 4) currentG = 4;
      if (currentG + currentP > 4) {
        currentP = 4 - currentG;
      }

      const score = 2 * currentG + currentP;
      if (score > currentMaxScore) currentMaxScore = score;
      return;
    }

    // 1. Try Triplet
    if (counts[index] >= 3) {
      counts[index] -= 3;
      search(index, w, g + 1, p);
      counts[index] += 3;
    } else if (counts[index] >= 2 && w >= 1) {
      counts[index] -= 2;
      search(index, w - 1, g + 1, p);
      counts[index] += 2;
    } else if (counts[index] >= 1 && w >= 2) {
      counts[index] -= 1;
      search(index, w - 2, g + 1, p);
      counts[index] += 1;
    }

    // 2. Try Sequence (only numbered suits)
    if (index < 27 && index % 9 < 7) {
      if (counts[index] > 0 && counts[index + 1] > 0 && counts[index + 2] > 0) {
        counts[index]--; counts[index + 1]--; counts[index + 2]--;
        search(index, w, g + 1, p);
        counts[index]++; counts[index + 1]++; counts[index + 2]++;
      }

      // Wildcard Support for Sequences (Kanchan, Penchan, Ryanmen)
      // Needs 1 Wildcard
      if (w >= 1) {
        // Case: X W Z (Missing Middle)
        if (counts[index] > 0 && counts[index + 1] == 0 && counts[index + 2] > 0) {
          counts[index]--; counts[index + 2]--;
          search(index, w - 1, g + 1, p);
          counts[index]++; counts[index + 2]++;
        }
        // Case: X Y W (Missing End)
        if (counts[index] > 0 && counts[index + 1] > 0 && counts[index + 2] == 0) {
          counts[index]--; counts[index + 1]--;
          search(index, w - 1, g + 1, p);
          counts[index]++; counts[index + 1]++;
        }
        // Case: W Y Z (Missing Start) - Not needed?
        // Since we iterate 'index', we assume we are at the start of the sequence.
        // IF we have Y and Z, then when we were at Y? No, we skip 0s.
        // If we are at index, we assume we use index as part of sequence.
        // Wait, if we use Wildcard as X? Then we must have Y and Z.
        // But our loop skips 0s. So if X is 0, we would be at Y.
        // So we don't need to handle "W Y Z" here unless we want to "create" a start from wildcard??
        // Using wildcard as start of sequence is equivalent to using it as missing end of previous.

        // Actually: If we are at index, we MUST use index.
        // Possibilities:
        // 1. Index is Start (X). Need Y+Z.
        //    - Have Y, Z -> Handled above.
        //    - Have Y, miss Z -> Need 1W. (X, Y, W)
        //    - Miss Y, have Z -> Need 1W. (X, W, Z)
        //    - Miss Y, Miss Z -> Need 2W. (X, W, W)
      }

      // Needs 2 Wildcards (index + 2W)
      if (w >= 2) {
        if (counts[index] > 0 && counts[index + 1] == 0 && counts[index + 2] == 0) {
          counts[index]--;
          search(index, w - 2, g + 1, p);
          counts[index]++;
        }
      }
    }

    // 3. Try Pair (Partial)
    if (counts[index] >= 2) {
      counts[index] -= 2;
      search(index, w, g, p + 1);
      counts[index] += 2;
    } else if (counts[index] === 1 && w >= 1) {
      counts[index] -= 1;
      search(index, w - 1, g, p + 1);
      counts[index] += 1;
    }

    // 4. Try Taatsu (Partial Sequence)
    if (index < 27 && index % 9 < 8) { // Kanchan or Penchan or Ryanmen
      // i, i+1
      if (counts[index] > 0 && counts[index + 1] > 0) {
        counts[index]--; counts[index + 1]--;
        search(index, w, g, p + 1);
        counts[index]++; counts[index + 1]++;
      }
    }
    if (index < 27 && index % 9 < 7) { // Kankan (i, i+2)
      if (counts[index] > 0 && counts[index + 2] > 0) {
        counts[index]--; counts[index + 2]--;
        search(index, w, g, p + 1);
        counts[index]++; counts[index + 2]++;
      }
    }

    // 5. Skip (treat as single tile)
    search(index + 1, w, g, p);
  };

  search(0, wildcards, 0, 0);

  // Shanten = 8 - MaxScore - (hasEye ? 1 : 0)
  const finalShanten = 8 - currentMaxScore - (hasEye ? 1 : 0);
  return finalShanten;
};


// ----------------------------------------------------------------------
// Main Analysis
// ----------------------------------------------------------------------

export const analyzeHand = async (hand: Tile[], laiziTile: Tile | null): Promise<AnalysisResponse> => {
  const handIndices = hand.map(getTileIndex);
  const laiziIndex = laiziTile ? getTileIndex(laiziTile) : -1;
  const suggestions: Suggestion[] = [];

  // Helper to get Counts/Wildcards
  const getCountsAndWildcards = (indices: number[]) => {
    const c = new Array(TILE_MAX).fill(0);
    let w = 0;
    for (const idx of indices) {
      if (idx === laiziIndex) w++;
      else if (idx === RED_DRAGON_INDEX) { /* Ignore Red Dragon as it must be gang */ }
      else c[idx]++;
    }
    return { c, w };
  };

  // 1. Initial State Check
  const initialData = getCountsAndWildcards(handIndices);

  // Hubei Rule: Red Dragon (Hong Zhong) CAN be Gang-ed to get money.
  // User request: Prioritize it highest (first).
  if (handIndices.includes(RED_DRAGON_INDEX)) {
    suggestions.push({
      discard: "杠红中",
      score: 20000, // High priority
      waitingTiles: ["杠上开花"],
      comment: "建议杠红中 (翻倍收益)"
    });
    // Do NOT return here. Continue to analyze other discards.
  }

  // Note: calculateShanten generally returns -1 for Hu if standard standard is 8.
  // But let's verify: 4 sets (4*2=8) + 1 pair (+1) = 9 score?
  // Formula: 8 - 2*G - P - 1
  // If 4G, 1P, 1Eye => 8 - 8 - 0 - 1 = -1. Correct.

  const initialShanten = calculateShanten(initialData.c, initialData.w);

  if (initialShanten <= -1) {
    suggestions.push({
      discard: "已胡牌",
      score: 9999,
      waitingTiles: ["自摸"],
      comment: "当前手牌已满足胡牌条件！"
    });
    return { suggestions };
  }

  // 2. Iterate all discards to find which ones minimize Shanten or maximize Ukeire
  const distinctDiscards = [...new Set(handIndices)];

  for (const discardIdx of distinctDiscards) {
    if (discardIdx === RED_DRAGON_INDEX) continue; // Cannot discard Red Dragon

    const nextHandIndices = [...handIndices];
    const idxToRemove = nextHandIndices.indexOf(discardIdx);
    if (idxToRemove > -1) nextHandIndices.splice(idxToRemove, 1);

    // We want to find draws that improve the hand state.
    // Ideally minShantenAfterDraw should be `initialShanten - 1`.

    const ukeire: number[] = [];
    let minShantenAfterDraw = 8;

    for (let draw = 0; draw < TILE_MAX; draw++) {
      if (draw === RED_DRAGON_INDEX) continue;

      const testHand = [...nextHandIndices, draw];
      const data = getCountsAndWildcards(testHand);
      const s = calculateShanten(data.c, data.w);

      // Strict Improvement Check:
      // We only care about draws that IMPROVE our shanten state.
      // e.g. If initial is 0 (Tenpai), we only want -1 (Win).
      // If initial is 1 (1-Shanten), we only want 0 (Tenpai).
      if (s >= initialShanten) continue;

      if (s < minShantenAfterDraw) {
        minShantenAfterDraw = s;
        ukeire.length = 0;
        ukeire.push(draw);
      } else if (s === minShantenAfterDraw) {
        ukeire.push(draw);
      }
    }

    // Formatting the Result
    const tileNames = ukeire.map(getTileName);
    let label = "";

    // Logic: 
    // If minShantenAfterDraw is -1, we become Hu -> We were Tenpai (Shanten 0).
    // If minShantenAfterDraw is 0, we become Tenpai -> We were 1-Shanten.
    // General: "N-Shanten" means we need N+1 moves to Win? 
    // Standard Japanese:
    // 0-Shanten = Tenpai.
    // 1-Shanten = Needs 1 tile to be Tenpai.

    // Our calculated value `minShantenAfterDraw`:
    // -1: Win
    // 0: Tenpai
    // 1: 1-Shanten

    // So if we achieve -1, we are just waiting to win.
    if (minShantenAfterDraw === -1) {
      label = `听牌：进 ${ukeire.length} 门`;
    } else if (minShantenAfterDraw === 0) {
      label = `一向听：进 ${ukeire.length} 门`;
    } else {
      label = `${minShantenAfterDraw}向听：进 ${ukeire.length} 门`;
    }

    suggestions.push({
      discard: getTileName(discardIdx),
      // Scoring: Lower Shanten is vastly better. Then breadth.
      // (10 - s) * 1000 ensures s=-1 (score 11000) > s=0 (score 10000) > s=1 (score 9000).
      score: (10 - minShantenAfterDraw) * 1000 + ukeire.length,
      waitingTiles: tileNames,
      comment: label
    });
  }

  suggestions.sort((a, b) => b.score - a.score);

  return {
    suggestions: suggestions.slice(0, 5)
  };
};

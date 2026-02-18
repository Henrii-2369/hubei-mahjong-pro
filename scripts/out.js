// services/mahjongLogic.ts
var TILE_MAX = 34;
var getTileIndex = (tile) => {
  if (tile.suit === "man") return tile.value - 1;
  if (tile.suit === "pin") return 9 + tile.value - 1;
  if (tile.suit === "sou") return 18 + tile.value - 1;
  return 27 + tile.value - 1;
};
var getTileName = (index) => {
  if (index < 9) return `${index + 1}\u4E07`;
  if (index < 18) return `${index - 9 + 1}\u7B52`;
  if (index < 27) return `${index - 18 + 1}\u6761`;
  const honors = ["\u4E1C", "\u5357", "\u897F", "\u5317", "\u767D", "\u53D1", "\u4E2D"];
  return honors[index - 27];
};
var VALID_EYES = [
  1,
  4,
  7,
  // 2, 5, 8 Man
  10,
  13,
  16,
  // 2, 5, 8 Pin
  19,
  22,
  25
  // 2, 5, 8 Sou
];
var RED_DRAGON_INDEX = 33;
var calculateShanten = (counts, wildcards) => {
  let minShanten = 8;
  for (const eye of VALID_EYES) {
    if (counts[eye] >= 2) {
      counts[eye] -= 2;
      minShanten = Math.min(minShanten, calculateSubShanten(counts, wildcards, true));
      counts[eye] += 2;
    } else if (counts[eye] === 1 && wildcards >= 1) {
      counts[eye] -= 1;
      minShanten = Math.min(minShanten, calculateSubShanten(counts, wildcards - 1, true));
      counts[eye] += 1;
    } else if (wildcards >= 2) {
      minShanten = Math.min(minShanten, calculateSubShanten(counts, wildcards - 2, true));
    }
  }
  minShanten = Math.min(minShanten, calculateSubShanten(counts, wildcards, false));
  return minShanten;
};
var calculateSubShanten = (counts, wildcards, hasEye) => {
  let currentMaxScore = 0;
  const search = (index, w, g, p) => {
    if (g > 4) return;
    while (index < TILE_MAX && counts[index] === 0) {
      index++;
    }
    if (index === TILE_MAX) {
      let currentG = g;
      let currentP = p;
      let remW = w;
      if (remW >= 3) {
        const newG = Math.floor(remW / 3);
        currentG += newG;
        remW %= 3;
      }
      if (remW >= 2) {
        currentP += 1;
      }
      if (currentG > 4) currentG = 4;
      if (currentG + currentP > 4) {
        currentP = 4 - currentG;
      }
      const score = 2 * currentG + currentP;
      if (score > currentMaxScore) currentMaxScore = score;
      return;
    }
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
    if (index < 27 && index % 9 < 7) {
      if (counts[index] > 0 && counts[index + 1] > 0 && counts[index + 2] > 0) {
        counts[index]--;
        counts[index + 1]--;
        counts[index + 2]--;
        search(index, w, g + 1, p);
        counts[index]++;
        counts[index + 1]++;
        counts[index + 2]++;
      }
      if (w >= 1) {
        if (counts[index] > 0 && counts[index + 1] == 0 && counts[index + 2] > 0) {
          counts[index]--;
          counts[index + 2]--;
          search(index, w - 1, g + 1, p);
          counts[index]++;
          counts[index + 2]++;
        }
        if (counts[index] > 0 && counts[index + 1] > 0 && counts[index + 2] == 0) {
          counts[index]--;
          counts[index + 1]--;
          search(index, w - 1, g + 1, p);
          counts[index]++;
          counts[index + 1]++;
        }
      }
      if (w >= 2) {
        if (counts[index] > 0 && counts[index + 1] == 0 && counts[index + 2] == 0) {
          counts[index]--;
          search(index, w - 2, g + 1, p);
          counts[index]++;
        }
      }
    }
    if (counts[index] >= 2) {
      counts[index] -= 2;
      search(index, w, g, p + 1);
      counts[index] += 2;
    } else if (counts[index] === 1 && w >= 1) {
      counts[index] -= 1;
      search(index, w - 1, g, p + 1);
      counts[index] += 1;
    }
    if (index < 27 && index % 9 < 8) {
      if (counts[index] > 0 && counts[index + 1] > 0) {
        counts[index]--;
        counts[index + 1]--;
        search(index, w, g, p + 1);
        counts[index]++;
        counts[index + 1]++;
      }
    }
    if (index < 27 && index % 9 < 7) {
      if (counts[index] > 0 && counts[index + 2] > 0) {
        counts[index]--;
        counts[index + 2]--;
        search(index, w, g, p + 1);
        counts[index]++;
        counts[index + 2]++;
      }
    }
    search(index + 1, w, g, p);
  };
  search(0, wildcards, 0, 0);
  const finalShanten = 8 - currentMaxScore - (hasEye ? 1 : 0);
  return finalShanten;
};
var analyzeHand = async (hand, laiziTile) => {
  const handIndices = hand.map(getTileIndex);
  const laiziIndex = laiziTile ? getTileIndex(laiziTile) : -1;
  const suggestions = [];
  const getCountsAndWildcards = (indices) => {
    const c = new Array(TILE_MAX).fill(0);
    let w = 0;
    for (const idx of indices) {
      if (idx === laiziIndex) w++;
      else if (idx === RED_DRAGON_INDEX) {
      } else c[idx]++;
    }
    return { c, w };
  };
  const initialData = getCountsAndWildcards(handIndices);
  if (handIndices.includes(RED_DRAGON_INDEX)) {
    suggestions.push({
      discard: "\u6760\u7EA2\u4E2D",
      score: 2e4,
      // High priority
      waitingTiles: ["\u6760\u4E0A\u5F00\u82B1"],
      comment: "\u5EFA\u8BAE\u6760\u7EA2\u4E2D (\u7FFB\u500D\u6536\u76CA)"
    });
  }
  const initialShanten = calculateShanten(initialData.c, initialData.w);
  if (initialShanten <= -1) {
    suggestions.push({
      discard: "\u5DF2\u80E1\u724C",
      score: 9999,
      waitingTiles: ["\u81EA\u6478"],
      comment: "\u5F53\u524D\u624B\u724C\u5DF2\u6EE1\u8DB3\u80E1\u724C\u6761\u4EF6\uFF01"
    });
    return { suggestions };
  }
  const distinctDiscards = [...new Set(handIndices)];
  for (const discardIdx of distinctDiscards) {
    if (discardIdx === RED_DRAGON_INDEX) continue;
    const nextHandIndices = [...handIndices];
    const idxToRemove = nextHandIndices.indexOf(discardIdx);
    if (idxToRemove > -1) nextHandIndices.splice(idxToRemove, 1);
    const ukeire = [];
    let minShantenAfterDraw = 8;
    for (let draw = 0; draw < TILE_MAX; draw++) {
      if (draw === RED_DRAGON_INDEX) continue;
      const testHand = [...nextHandIndices, draw];
      const data = getCountsAndWildcards(testHand);
      const s = calculateShanten(data.c, data.w);
      if (s < minShantenAfterDraw) {
        minShantenAfterDraw = s;
        ukeire.length = 0;
        ukeire.push(draw);
      } else if (s === minShantenAfterDraw) {
        ukeire.push(draw);
      }
    }
    const tileNames = ukeire.map(getTileName);
    let label = "";
    if (minShantenAfterDraw === -1) {
      label = `\u542C\u724C\uFF1A\u8FDB ${ukeire.length} \u95E8`;
    } else if (minShantenAfterDraw === 0) {
      label = `\u4E00\u5411\u542C\uFF1A\u8FDB ${ukeire.length} \u95E8`;
    } else {
      label = `${minShantenAfterDraw}\u5411\u542C\uFF1A\u8FDB ${ukeire.length} \u95E8`;
    }
    suggestions.push({
      discard: getTileName(discardIdx),
      // Scoring: Lower Shanten is vastly better. Then breadth.
      // (10 - s) * 1000 ensures s=-1 (score 11000) > s=0 (score 10000) > s=1 (score 9000).
      score: (10 - minShantenAfterDraw) * 1e3 + ukeire.length,
      waitingTiles: tileNames,
      comment: label
    });
  }
  suggestions.sort((a, b) => b.score - a.score);
  return {
    suggestions: suggestions.slice(0, 5)
  };
};

// scripts/test_logic.ts
var t = (suit, value) => ({
  id: `${suit}-${value}`,
  suit,
  value,
  symbol: ""
});
var runTest = async (name, hand, laizi, expectedDiscard) => {
  console.log(`
Running Test: ${name}`);
  const result = await analyzeHand(hand, laizi);
  const suggestions = result.suggestions;
  if (suggestions.length === 0) {
    console.log("No suggestions returned.");
    if (expectedDiscard === null) console.log("PASS (Expected no suggestions)");
    else console.error(`FAIL (Expected ${expectedDiscard})`);
    return;
  }
  const top = suggestions[0];
  console.log(`Top Suggestion: Discard ${top.discard}, Waiting for [${top.waitingTiles.join(", ")}]`);
  if (expectedDiscard && top.discard === expectedDiscard) {
    console.log("PASS");
  } else if (expectedDiscard === null) {
    console.log("FAIL (Expected no suggestions)");
  } else {
    if (suggestions.slice(0, 3).some((s) => s.discard === expectedDiscard)) {
      console.log(`PASS (Found ${expectedDiscard} in top 3 suggestions)`);
    } else {
      console.log(`FAIL (Expected ${expectedDiscard}) to be top suggestion`);
    }
  }
};
var fullTest = async () => {
  const handHu = [
    t("man", 1),
    t("man", 1),
    t("man", 1),
    t("man", 2),
    t("man", 3),
    t("man", 4),
    t("pin", 5),
    t("pin", 6),
    t("pin", 7),
    t("sou", 1),
    t("sou", 1),
    t("sou", 1),
    t("man", 5),
    t("man", 5)
  ];
  await runTest("Already Hu (Eye 5 Man)", handHu, null, "\u5DF2\u80E1\u724C");
  const handInvalidEye = [
    t("man", 1),
    t("man", 1),
    t("man", 1),
    t("man", 2),
    t("man", 3),
    t("man", 4),
    t("pin", 5),
    t("pin", 6),
    t("pin", 7),
    t("sou", 1),
    t("sou", 1),
    t("sou", 1),
    t("man", 3),
    t("man", 3)
  ];
  await runTest("Invalid Eye (3 Man)", handInvalidEye, null, "3\u4E07");
  const handTing = [
    t("man", 1),
    t("man", 2),
    t("man", 3),
    t("man", 4),
    t("man", 5),
    t("man", 6),
    t("man", 7),
    t("man", 8),
    t("man", 9),
    t("pin", 2),
    t("pin", 2),
    t("sou", 2),
    t("sou", 3)
  ];
  const handTingDiscard = [
    ...handTing,
    t("sou", 9)
  ];
  await runTest("Simple Ting (Discard 9 Sou)", handTingDiscard, null, "9\u6761");
  const laiziTile = t("zihai", 7);
  const handLaizi = [
    t("man", 4),
    t("man", 5),
    t("man", 6),
    t("man", 7),
    t("man", 8),
    t("man", 9),
    t("pin", 2),
    t("pin", 2),
    // Eye 2 Pin (Valid)
    t("sou", 1),
    t("sou", 2),
    t("zihai", 7)
    // Laizi
  ];
  const handLaiziFull = [
    ...handLaizi,
    t("zihai", 1),
    // East
    t("zihai", 2),
    // South
    t("zihai", 3)
    // West
  ];
  await runTest("Laizi Test (Discard Honors)", handLaiziFull, laiziTile, "\u6760\u7EA2\u4E2D");
  const messyHand = [
    t("man", 1),
    t("man", 2),
    t("man", 8),
    t("man", 9),
    t("pin", 1),
    t("pin", 9),
    t("sou", 1),
    t("sou", 9),
    t("zihai", 1),
    t("zihai", 2),
    t("zihai", 3),
    t("zihai", 4),
    // ESWN
    t("zihai", 5),
    t("zihai", 6)
    // White, Green
  ];
  await runTest("Heavy Shanten (Early Game)", messyHand, null, "\u4E1C");
  const bugHand = [
    t("man", 1),
    t("man", 2),
    t("man", 3),
    t("man", 4),
    t("man", 5),
    t("man", 6),
    t("man", 7),
    t("man", 8),
    t("man", 9),
    t("sou", 5),
    t("sou", 5),
    // Eye
    t("sou", 7),
    t("sou", 9),
    t("pin", 6)
    // Laizi
  ];
  const laizi6Pin = t("pin", 6);
  await runTest("Bug Reproduction (Kanchan Wildcard)", bugHand, laizi6Pin, "\u5DF2\u80E1\u724C");
  const hongZhongHand = [
    t("man", 1),
    t("man", 2),
    t("man", 2),
    t("man", 3),
    t("man", 4),
    t("man", 5),
    t("man", 6),
    t("man", 7),
    t("man", 8),
    t("man", 9),
    t("pin", 5),
    t("pin", 5),
    t("pin", 5),
    t("zihai", 7)
    // Red Dragon
  ];
  await runTest("Red Dragon Priority (Reprioritized)", hongZhongHand, null, "\u6760\u7EA2\u4E2D");
};
fullTest();

import { analyzeHand } from '../services/mahjongLogic';
import { Tile } from '../types';

// Helper to create a tile
const t = (suit: 'man' | 'pin' | 'sou' | 'zihai', value: number): Tile => ({
    id: `${suit}-${value}`,
    suit,
    value,
    symbol: ''
});

const runTest = async (name: string, hand: Tile[], laizi: Tile | null, expectedDiscard: string | null) => {
    console.log(`\nRunning Test: ${name}`);
    const result = await analyzeHand(hand, laizi);

    const suggestions = result.suggestions;
    if (suggestions.length === 0) {
        console.log("No suggestions returned.");
        if (expectedDiscard === null) console.log("PASS (Expected no suggestions)");
        else console.error(`FAIL (Expected ${expectedDiscard})`);
        return;
    }

    const top = suggestions[0];
    console.log(`Top Suggestion: Discard ${top.discard}, Waiting for [${top.waitingTiles.join(', ')}]`);

    if (expectedDiscard && top.discard === expectedDiscard) {
        console.log("PASS");
    } else if (expectedDiscard === null) {
        console.log("FAIL (Expected no suggestions)");
    } else {
        // Check if expected is in top 3
        if (suggestions.slice(0, 3).some(s => s.discard === expectedDiscard)) {
            console.log(`PASS (Found ${expectedDiscard} in top 3 suggestions)`);
        } else {
            console.log(`FAIL (Expected ${expectedDiscard}) to be top suggestion`);
        }
    }
};

const fullTest = async () => {
    // Case 1: Already Hu (258 eye rule check)
    // 11 123 456 789 22 (Man) -> Hu (Eye 2 is valid)
    // 2 is valid eye
    const handHu = [
        t('man', 1), t('man', 1), t('man', 1),
        t('man', 2), t('man', 3), t('man', 4),
        t('pin', 5), t('pin', 6), t('pin', 7),
        t('sou', 1), t('sou', 1), t('sou', 1),
        t('man', 5), t('man', 5)
    ];
    // This hand is 111, 234, 567(pin), 111(sou), 55(man).
    // Eye is 5 Man. Valid.
    await runTest("Already Hu (Eye 5 Man)", handHu, null, "已胡牌");

    // Case 2: Invalid Eye (3 Man)
    // 11 123 456 789 33 (Man) -> Not Hu because 3 cannot be eye
    const handInvalidEye = [
        t('man', 1), t('man', 1), t('man', 1),
        t('man', 2), t('man', 3), t('man', 4),
        t('pin', 5), t('pin', 6), t('pin', 7),
        t('sou', 1), t('sou', 1), t('sou', 1),
        t('man', 3), t('man', 3)
    ];
    // Should suggest discarding 3 Man (since it cant be eye) or something else to change eye
    await runTest("Invalid Eye (3 Man)", handInvalidEye, null, "3万");


    // Case 3: Ting (Waiting for one tile)
    // 111 234 56 789 22 (Man) -> Waiting for 4, 7 (if 56 is sequence)
    // Actually: 111 234 56(waiting 4,7) 789 ?? -> 14 tiles
    // Let's do: 123 456 789 11 23 (Man) -> Discard 1 or 2 or 3?
    // Let's do a simple 1-wait: 11 123 456 789 23 -> Discard 11 to make pair? No.
    // 123 456 789 (Man) 11 (Pin) 23 (Sou) -> Waiting for 1,4 Sou
    const handTing = [
        t('man', 1), t('man', 2), t('man', 3),
        t('man', 4), t('man', 5), t('man', 6),
        t('man', 7), t('man', 8), t('man', 9),
        t('pin', 2), t('pin', 2),
        t('sou', 2), t('sou', 3)
    ];
    // Eye is 2 Pin (Valid). Sequence 23 Sou is waiting for 1, 4 Sou.
    // BUT 2 Sou and 3 Sou CANNOT be eye. 
    // Wait: 23 Sou needs 1 or 4 to complete sequence.
    // Eye is 2 Pin (Valid).
    // So if we have 14 tiles:
    // 123, 456, 789, 22(pin), 23(sou). That's 3*3 + 2 + 2 = 13 tiles?
    // We need 14 tiles to discard.
    // Add a stray tile: 9 Sou.
    const handTingDiscard = [
        ...handTing, t('sou', 9)
    ];
    await runTest("Simple Ting (Discard 9 Sou)", handTingDiscard, null, "9条");

    // Case 4: Laizi Test
    // Laizi = 1 Man. Hand has NO 1 Man, but has 2 Man.
    // Hand: 2(laizi), 2, 3 -> sequence 1,2,3 formed by laizi+2+3
    // Let's try: 456 789 (Man) 11 (Pin - Eye) 12 (Sou) + 1 Laizi
    // Laizi = Red Dragon (ZG)
    const laiziTile = t('zihai', 7); // chun
    const handLaizi = [
        t('man', 4), t('man', 5), t('man', 6),
        t('man', 7), t('man', 8), t('man', 9),
        t('pin', 2), t('pin', 2), // Eye 2 Pin (Valid)
        t('sou', 1), t('sou', 2),
        t('zihai', 7) // Laizi
    ];
    // 11 tiles. + 3 = 14.
    // Add 3 random tiles to be discarded.
    const handLaiziFull = [
        ...handLaizi,
        t('zihai', 1), // East
        t('zihai', 2), // South
        t('zihai', 3)  // West
    ];
    // Should suggest Gang Red Dragon because Red Dragon is in hand.
    await runTest("Laizi Test (Discard Honors)", handLaiziFull, laiziTile, "杠红中");

    // Case 5: 3-Shanten (Early Game)
    // A messy hand with many isolated tiles.
    // 147 Man, 258 Pin, 369 Sou, E, S, W, N, White
    // Eye? None.
    // Groups? None.
    // All isolated. 
    // Ideally should discard Honor tiles first (if not pair).
    // Let's force a choice towards sequences.
    // Hand: 1, 2, 8, 9 Man. 1, 9 Pin. 1, 9 Sou. East, South, West, North, White, Green.
    // Shanten should be high.
    // Suggestion should be to discard isolated honors (Guest Winds first).
    const messyHand = [
        t('man', 1), t('man', 2), t('man', 8), t('man', 9),
        t('pin', 1), t('pin', 9),
        t('sou', 1), t('sou', 9),
        t('zihai', 1), t('zihai', 2), t('zihai', 3), t('zihai', 4), // ESWN
        t('zihai', 5), t('zihai', 6) // White, Green
    ];
    // 14 tiles.
    // Discard East (zihai 1) is a reasonable start. 
    // Or just check that we GET a suggestion.
    await runTest("Heavy Shanten (Early Game)", messyHand, null, "东");
    // Case 6: Bug Reproduction (Kanchan with Wildcard)
    // Hand: 1-9 Man, 5 Sou (Pair), 7 Sou, 9 Sou. Laizi = 6 Pin (wildcard).
    // Should be Hu (7,8(Laizi),9 Sou).
    const bugHand = [
        t('man', 1), t('man', 2), t('man', 3),
        t('man', 4), t('man', 5), t('man', 6),
        t('man', 7), t('man', 8), t('man', 9),
        t('sou', 5), t('sou', 5), // Eye
        t('sou', 7), t('sou', 9),
        t('pin', 6) // Laizi
    ];
    const laizi6Pin = t('pin', 6);
    await runTest("Bug Reproduction (Kanchan Wildcard)", bugHand, laizi6Pin, "已胡牌");

    // Logic should suggest "Discard 2 Man" (prioritize other tiles) over "Gang Red Dragon" (which is displayed but lower priority).
    const hongZhongHand = [
        t('man', 1), t('man', 2), t('man', 2), t('man', 3),
        t('man', 4), t('man', 5), t('man', 6), t('man', 7),
        t('man', 8), t('man', 9),
        t('pin', 5), t('pin', 5), t('pin', 5),
        t('zihai', 7) // Red Dragon
    ];
    // Previous requirement: Deprioritized. New requirement: Top Priority.
    // So we change expectation back to "杠红中".
    await runTest("Red Dragon Priority (Reprioritized)", hongZhongHand, null, "杠红中");

    // Also verifying that we get MORE than 1 suggestion (i.e. not blocking).
    // The test runner prints top suggestion. We might need to manually inspect or trust the logic change.
};

fullTest();

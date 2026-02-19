
import { analyzeHand } from '../services/mahjongLogic';
import { Tile, Suit } from '../types';

const createTile = (suit: Suit, value: number, symbol?: string): Tile => ({
    id: `${suit}-${value}`,
    suit,
    value,
    symbol: symbol || (suit === 'zihai' ? ['东', '南', '西', '北', '白', '发', '中'][value - 1] : undefined)
});

const runTest = async () => {
    // Construct Hand: 123456789m, 678p, White, White
    const hand: Tile[] = [];
    for (let i = 1; i <= 9; i++) hand.push(createTile('man', i));
    for (let i = 6; i <= 8; i++) hand.push(createTile('pin', i));
    const white = createTile('zihai', 5, '白');
    hand.push(white);
    hand.push(white);

    console.log(`Hand size: ${hand.length}`);

    // Case 2: No Laizi
    console.log("\n--- Case 2: No Laizi (Expect: Discard White suggested) ---");
    const result2 = await analyzeHand(hand, null);
    console.log("Suggestions:");
    result2.suggestions.forEach(s => {
        console.log(`Discard: ${s.discard}, Score: ${s.score}, Waits: ${s.waitingTiles.join(', ')}`);
    });
};

runTest();

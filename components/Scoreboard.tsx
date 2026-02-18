import React, { useState } from 'react';

interface Player {
    id: number;
    name: string;
    totalScore: number;
}

interface Round {
    id: number;
    scores: { [playerId: number]: number };
}

interface Transaction {
    from: string;
    to: string;
    amount: number;
}

const Scoreboard: React.FC = () => {
    // Setup State
    const [playerCount, setPlayerCount] = useState<3 | 4>(4);
    const [playerNames, setPlayerNames] = useState<string[]>(['', '', '', '']);
    const [isSetup, setIsSetup] = useState(false);

    // Game State
    const [players, setPlayers] = useState<Player[]>([]);
    const [rounds, setRounds] = useState<Round[]>([]);
    const [currentRoundScores, setCurrentRoundScores] = useState<{ [key: number]: string }>({});
    const [roundWinStatus, setRoundWinStatus] = useState<{ [key: number]: 'win' | 'loss' }>({});

    // Settlement State
    const [showSettlement, setShowSettlement] = useState(false);
    const [settlementPlan, setSettlementPlan] = useState<Transaction[]>([]);

    // 1. Setup Phase
    const handleSetup = () => {
        const newPlayers: Player[] = [];
        for (let i = 0; i < playerCount; i++) {
            newPlayers.push({
                id: i,
                name: playerNames[i] || `玩家${i + 1}`,
                totalScore: 0
            });
            // Initialize win status
            setRoundWinStatus(prev => ({ ...prev, [i]: 'win' }));
        }
        setPlayers(newPlayers);
        setIsSetup(true);
    };

    const handleNameChange = (index: number, val: string) => {
        const newNames = [...playerNames];
        newNames[index] = val;
        setPlayerNames(newNames);
    };

    // 2. Scoring Phase
    const handleScoreInput = (playerId: number, val: string) => {
        // Only allow positive integers
        const validVal = val.replace(/[^0-9]/g, '');
        setCurrentRoundScores(prev => ({ ...prev, [playerId]: validVal }));
    };

    const toggleWinStatus = (playerId: number) => {
        setRoundWinStatus(prev => ({
            ...prev,
            [playerId]: prev[playerId] === 'loss' ? 'win' : 'loss'
        }));
    };

    const submitRound = () => {
        const scores: { [key: number]: number } = {};
        let roundSum = 0;

        // Parse inputs
        players.forEach(p => {
            let val = parseInt(currentRoundScores[p.id] || '0', 10);
            if (isNaN(val)) val = 0;

            // Apply sign based on win status
            if (roundWinStatus[p.id] === 'loss') {
                val = -val;
            }

            scores[p.id] = val;
            roundSum += scores[p.id];
        });

        if (roundSum !== 0) {
            alert(`本局分数总和不为0 (当前总和: ${roundSum})，请检查输入！\n赢分和输分总合必须相等。`);
            return;
        }

        const newRound: Round = {
            id: Date.now(),
            scores
        };

        // Update Players
        const updatedPlayers = players.map(p => ({
            ...p,
            totalScore: p.totalScore + scores[p.id]
        }));

        setPlayers(updatedPlayers);
        setRounds([...rounds, newRound]);
        setCurrentRoundScores({}); // Reset inputs
        // Reset win status? Maybe keep it or reset to 'win'.
        // Let's reset to 'win' for consistency, or maybe 'loss' is more common?
        // Usually 3 losers 1 winner. Let's keep previous state? No, reset is cleaner.
        const resetStatus: { [key: number]: 'win' | 'loss' } = {};
        players.forEach(p => resetStatus[p.id] = 'win');
        setRoundWinStatus(resetStatus);
    };

    // 3. Settlement Logic
    const calculateSettlement = () => {
        // Deep copy players to not mutate state during calculation
        let debtors = players.filter(p => p.totalScore < 0).map(p => ({ ...p, totalScore: p.totalScore }));
        let creditors = players.filter(p => p.totalScore > 0).map(p => ({ ...p, totalScore: p.totalScore }));

        // Sort by magnitude (descending) to optimize mostly
        debtors.sort((a, b) => a.totalScore - b.totalScore); // Most negative first
        creditors.sort((a, b) => b.totalScore - a.totalScore); // Most positive first

        const transactions: Transaction[] = [];

        let i = 0; // creditor index
        let j = 0; // debtor index

        while (i < creditors.length && j < debtors.length) {
            const creditor = creditors[i];
            const debtor = debtors[j];

            // Creditor needs to interpret debtor's negative score as positive debt
            const debtAmount = Math.abs(debtor.totalScore);
            const creditAmount = creditor.totalScore;

            const amount = Math.min(debtAmount, creditAmount);

            transactions.push({
                from: debtor.name,
                to: creditor.name,
                amount: amount
            });

            // Update remaining amounts
            debtor.totalScore += amount;
            creditor.totalScore -= amount;

            // Move indices if settled
            if (Math.abs(debtor.totalScore) < 0.01) j++;
            if (Math.abs(creditor.totalScore) < 0.01) i++;
        }

        setSettlementPlan(transactions);
        setShowSettlement(true);
    };

    const resetGame = () => {
        if (confirm("确定要结束当前计分并重置吗？所有数据将丢失。")) {
            setIsSetup(false);
            setPlayers([]);
            setRounds([]);
            setShowSettlement(false);
            setPlayerNames(['', '', '', '']);
        }
    };

    // --- RENDER ---

    if (!isSetup) {
        return (
            <div className="flex flex-col items-center p-6 space-y-6">
                <h2 className="text-xl font-bold text-yellow-500">创建房间</h2>

                {/* Player Count Toggle */}
                <div className="flex bg-gray-800 rounded-lg p-1">
                    <button
                        onClick={() => setPlayerCount(3)}
                        className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${playerCount === 3 ? 'bg-yellow-600 text-white' : 'text-gray-400'}`}
                    >
                        三人房
                    </button>
                    <button
                        onClick={() => setPlayerCount(4)}
                        className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${playerCount === 4 ? 'bg-yellow-600 text-white' : 'text-gray-400'}`}
                    >
                        四人房
                    </button>
                </div>

                {/* Name Inputs */}
                <div className="w-full max-w-xs space-y-3">
                    {Array.from({ length: playerCount }).map((_, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <span className="w-12 text-right text-gray-400 text-sm">玩家{i + 1}:</span>
                            <input
                                type="text"
                                maxLength={8}
                                placeholder={`输入昵称 (默认: 玩家${i + 1})`}
                                value={playerNames[i] || ''}
                                onChange={(e) => handleNameChange(i, e.target.value)}
                                className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:border-yellow-500 outline-none"
                            />
                        </div>
                    ))}
                </div>

                <button
                    onClick={handleSetup}
                    className="w-full max-w-xs py-3 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-lg font-bold text-white shadow-lg active:scale-95 transition-transform"
                >
                    开始计分
                </button>
            </div>
        );
    }

    if (showSettlement) {
        return (
            <div className="p-6 flex flex-col items-center space-y-6 min-h-[50vh]">
                <h2 className="text-2xl font-bold text-green-400 border-b border-green-500/30 pb-2 px-8">💰 最终结算单</h2>

                <div className="w-full max-w-md bg-gray-800/50 rounded-xl p-6 space-y-4 border border-white/5">
                    {settlementPlan.length === 0 ? (
                        <div className="text-center text-gray-400">大家都不输不赢，和平散场！</div>
                    ) : (
                        settlementPlan.map((t, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-black/20 p-3 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-red-400">{t.from}</span>
                                    <span className="text-xs text-gray-500">给</span>
                                    <span className="font-bold text-green-400">{t.to}</span>
                                </div>
                                <div className="text-xl font-mono font-bold text-yellow-400">
                                    {t.amount}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="text-xs text-gray-600 mt-8 border-t border-gray-800 pt-4 w-full text-center">
                    ⚠️ 严正声明：本工具仅供娱乐积分统计，禁止用于赌博。赌博违法，请洁身自好。
                </div>

                <button
                    onClick={resetGame}
                    className="mt-8 px-8 py-2 border border-gray-600 rounded-full text-gray-400 hover:text-white hover:border-white transition-colors"
                >
                    结束并返回
                </button>
            </div>
        );
    }

    // Scoring Board Main View
    return (
        <div className="p-4 pb-20 space-y-6">
            {/* 1. Total Scores Header */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {players.map(p => (
                    <div key={p.id} className={`p-3 rounded-lg border border-white/5 flex flex-col items-center ${p.totalScore >= 0 ? 'bg-red-900/20' : 'bg-green-900/20'}`}>
                        <span className="text-xs text-gray-400 mb-1">{p.name}</span>
                        <span className={`text-xl font-mono font-bold ${p.totalScore >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {p.totalScore > 0 ? `+${p.totalScore}` : p.totalScore}
                        </span>
                    </div>
                ))}
            </div>

            {/* 2. Round Input */}
            <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
                <h3 className="text-sm font-bold text-gray-400 mb-4 flex items-center gap-2">
                    <span>📝</span> 录入本局分数 (第 {rounds.length + 1} 局)
                </h3>
                <div className="space-y-3">
                    {players.map(p => (
                        <div key={p.id} className="flex items-center gap-3 bg-white/5 p-2 rounded-lg">
                            <span className="w-16 text-right text-sm text-gray-300 truncate font-bold">{p.name}</span>

                            {/* Win/Loss Toggle */}
                            <button
                                onClick={() => toggleWinStatus(p.id)}
                                className={`
                        flex-none w-10 h-9 rounded flex items-center justify-center font-bold text-sm transition-colors
                        ${roundWinStatus[p.id] === 'loss'
                                        ? 'bg-green-600 text-white shadow-[0_0_10px_rgba(22,163,74,0.4)]'
                                        : 'bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.4)]'}
                    `}
                            >
                                {roundWinStatus[p.id] === 'loss' ? '输' : '赢'}
                            </button>

                            <input
                                type="number"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                placeholder="0"
                                value={currentRoundScores[p.id] || ''}
                                onChange={(e) => handleScoreInput(p.id, e.target.value)}
                                className={`
                        flex-1 bg-black/40 border rounded px-3 py-2 text-white font-mono text-center outline-none transition-colors
                        ${roundWinStatus[p.id] === 'loss'
                                        ? 'border-green-800 focus:border-green-500 text-green-300'
                                        : 'border-red-800 focus:border-red-500 text-red-300'}
                   `}
                            />
                        </div>
                    ))}            </div>
                <button
                    onClick={submitRound}
                    className="w-full mt-4 py-3 bg-blue-600 rounded-lg font-bold text-white shadow hover:bg-blue-500 active:scale-95 transition-all"
                >
                    确认录入
                </button>
            </div>

            {/* 3. History List (Optional/Collapsed?) - For now just concise list */}
            {rounds.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-xs text-gray-500 uppercase font-bold ml-2">对局记录</h4>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-gray-300">
                            <thead className="text-gray-500 border-b border-gray-700">
                                <tr>
                                    <th className="py-2 text-left pl-2">局数</th>
                                    {players.map(p => <th key={p.id} className="py-2">{p.name}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {[...rounds].reverse().map((r, i) => (
                                    <tr key={r.id} className="border-b border-white/5">
                                        <td className="py-2 pl-2 text-gray-500">#{rounds.length - i}</td>
                                        {players.map(p => (
                                            <td key={p.id} className={`text-center font-mono ${r.scores[p.id] > 0 ? 'text-red-400' : r.scores[p.id] < 0 ? 'text-green-400' : 'text-gray-600'}`}>
                                                {r.scores[p.id] > 0 ? `+${r.scores[p.id]}` : r.scores[p.id]}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 4. Action Buttons */}
            <div className="grid grid-cols-2 gap-4 mt-8">
                <button
                    onClick={resetGame}
                    className="py-3 items-center justify-center border border-red-900/50 text-red-400 rounded-lg hover:bg-red-900/20"
                >
                    重置/结束
                </button>
                <button
                    onClick={calculateSettlement}
                    className="py-3 bg-green-600 text-white rounded-lg font-bold shadow-lg hover:bg-green-500"
                >
                    💰 结算
                </button>
            </div>
        </div>
    );
};

export default Scoreboard;

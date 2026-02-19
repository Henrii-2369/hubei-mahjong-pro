import React, { useState, useEffect, useRef } from 'react';
import { Tile, Suit, AnalysisResponse } from './types';
import { generateDeck, getTileImageSrc } from './constants';
import TileComponent from './components/TileComponent';
import { analyzeHand } from './services/mahjongLogic';
import Scoreboard from './components/Scoreboard';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'calc' | 'score'>('calc');
  const [hand, setHand] = useState<Tile[]>([]);
  const [laizi, setLaizi] = useState<Tile | null>(null);
  const [isSelectingLaizi, setIsSelectingLaizi] = useState(false);

  const [calculating, setCalculating] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);

  // Static deck for input
  const [deck] = useState<Tile[]>(generateDeck());

  const handContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (handContainerRef.current) {
      handContainerRef.current.scrollLeft = handContainerRef.current.scrollWidth;
    }
  }, [hand]);

  // Auto-calculation Effect
  useEffect(() => {
    const performAnalysis = async () => {
      // Logic: Must have Laizi AND 14 tiles
      if (!laizi || hand.length !== 14) {
        setAnalysis(null);
        return;
      }

      setCalculating(true);
      try {
        const result = await analyzeHand(hand, laizi);
        setAnalysis(result);
      } catch (e) {
        console.error(e);
      } finally {
        setCalculating(false);
      }
    };

    // Debounce slightly to avoid flicker on rapid input
    const timer = setTimeout(() => {
      performAnalysis();
    }, 100);

    return () => clearTimeout(timer);
  }, [hand, laizi]);

  const addToHand = (tileTemplate: Tile) => {
    if (isSelectingLaizi) {
      setLaizi(tileTemplate);
      setIsSelectingLaizi(false);
      return;
    }

    if (hand.length >= 14) {
      return;
    }
    const newTile = { ...tileTemplate, id: `${tileTemplate.id}-${Date.now()}` };
    const newHand = [...hand, newTile].sort(sortTiles);
    setHand(newHand);
  };

  const sortTiles = (a: Tile, b: Tile) => {
    const suitOrder = { 'man': 1, 'pin': 2, 'sou': 3, 'zihai': 4 };
    if (suitOrder[a.suit] !== suitOrder[b.suit]) {
      return suitOrder[a.suit] - suitOrder[b.suit];
    }
    return a.value - b.value;
  };

  const removeFromHand = (index: number) => {
    const newHand = [...hand];
    newHand.splice(index, 1);
    setHand(newHand);
  };

  const clearHand = () => {
    setHand([]);
    setAnalysis(null);
  };

  // Render a row of tiles for the input grid
  const renderInputRow = (suit: Suit) => {
    const tiles = deck.filter(t => t.suit === suit);
    return (
      <div className="flex justify-center gap-[1.5vw] px-2 mb-2">
        {tiles.map((t) => (
          <TileComponent
            key={t.id}
            tile={t}
            size="xs"
            onClick={() => addToHand(t)}
          />
        ))}
      </div>
    );
  };

  const renderAnalysisResults = () => {
    if (hand.length < 14) {
      if (!laizi) return null;
      return (
        <div className="flex flex-col items-center justify-center py-10 opacity-70">
          <div className="text-4xl mb-3 grayscale">🤔</div>
          <p className="text-lg font-bold text-red-300">
            相公了撒
          </p>
          <p className="text-xs text-gray-400 mt-1">
            还差 {14 - hand.length} 张牌
          </p>
        </div>
      );
    }

    if (calculating) {
      return (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      );
    }

    if (!analysis) return null;

    return (
      <div className="space-y-4 pb-12">
        <h3 className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest text-center border-b border-white/10 pb-2 mx-8">
          建议出牌
        </h3>
        {analysis.suggestions.length > 0 ? (
          analysis.suggestions.map((s, idx) => {
            const isHu = s.discard === "已胡牌";
            const discardTile = deck.find(t =>
              (t.suit === 'man' && s.discard === `${t.value}万`) ||
              (t.suit === 'pin' && s.discard === `${t.value}筒`) ||
              (t.suit === 'sou' && s.discard === `${t.value}条`) ||
              (t.suit === 'zihai' && t.symbol === s.discard)
            );

            return (
              <div
                key={idx}
                className={`
                  mx-4 p-4 rounded-xl flex items-center gap-4 shadow-lg
                  ${isHu
                    ? 'bg-gradient-to-r from-red-900/40 to-yellow-900/40 border border-red-500/50'
                    : 'bg-[#1a1a1a] border border-white/5'}
                `}
              >
                {/* Left: Discard Tile */}
                <div className="flex-none flex flex-col items-center gap-1">
                  <span className={`text-[10px] px-1.5 rounded font-bold ${isHu ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>
                    {isHu ? '恭喜' : '打'}
                  </span>
                  {discardTile && !isHu ? (
                    <TileComponent tile={discardTile} size="md" />
                  ) : isHu ? (
                    <div className="w-[48px] h-[64px] flex items-center justify-center bg-red-600 text-white rounded font-bold text-2xl shadow-lg border-2 border-red-400">
                      胡
                    </div>
                  ) : null}
                </div>

                {/* Right: Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between mb-1">
                    <h4 className="font-bold text-lg text-gray-200">{s.discard}</h4>
                    <span className="text-xs text-gray-500">{s.comment}</span>
                  </div>

                  {/* Waiting Tiles */}
                  <div className="flex flex-wrap gap-1">
                    {s.waitingTiles.map((t, i) => (
                      <span
                        key={i}
                        className={`
                            px-1.5 py-0.5 rounded text-xs font-mono font-bold
                            ${isHu ? 'bg-red-900/50 text-red-200 border border-red-800' : 'bg-gray-800 text-blue-200 border border-gray-700'}
                          `}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="mx-4 p-4 text-center text-gray-500 bg-white/5 rounded-xl border border-white/10 text-sm">
            暂无有效进张 (死牌)
          </div>
        )}
      </div>
    );
  };

  // Window scroll reset for iOS keyboard
  useEffect(() => {
    const handleBlur = () => {
      // Small timeout to allow keyboard to close
      setTimeout(() => {
        window.scrollTo(0, 0);
      }, 100);
    };

    // Attach to all inputs dynamically or just rely on global window/document events if possible?
    // React's onBlur on inputs is safer. We will add specific handlers in components.
    // But for global safety, we can listener to focusout?
    document.addEventListener('focusout', handleBlur);
    return () => document.removeEventListener('focusout', handleBlur);
  }, []);

  return (
    <div className="flex flex-col fixed inset-0 w-full bg-[#121212] text-white font-sans overflow-hidden">

      {/* 1. Header */}
      <header className="flex-none pt-[env(safe-area-inset-top)] h-[calc(3rem+env(safe-area-inset-top))] flex items-center justify-between px-4 bg-[#0a1f12] border-b border-[#1f402a] z-20 transition-all">
        <div className="flex items-center gap-2">
          <span className="text-lg">🀄️</span>
          <h1 className="text-sm font-bold tracking-wide">个板麻将助手Pro</h1>
        </div>
        {activeTab === 'calc' && (
          <button
            onClick={clearHand}
            className="text-xs px-3 py-1 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
          >
            重置
          </button>
        )}
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden pb-20">

        {/* Calculator View Wrapper */}
        <div style={{ display: activeTab === 'calc' ? 'block' : 'none' }}>
          {/* 2. Top Input Grid */}
          <div className={`
              py-4 bg-[#080808] border-b border-white/5 transition-all duration-300
              ${isSelectingLaizi ? 'ring-2 ring-yellow-500/50 relative z-10' : ''}
            `}>
            {isSelectingLaizi && (
              <div className="absolute top-0 left-0 right-0 bg-yellow-600/90 text-white text-center text-xs py-1 font-bold z-20 animate-pulse">
                请点击上方牌张选择癞子
              </div>
            )}
            {renderInputRow('man')}
            {renderInputRow('pin')}
            {renderInputRow('sou')}
            {renderInputRow('zihai')}
          </div>

          {/* 3. Status Bar & Hand Display */}
          <div className="sticky top-0 z-10 bg-[#121212]/95 backdrop-blur shadow-xl border-b border-white/5">
            {/* Laizi Controller */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
              <span className="text-xs text-gray-500 font-bold uppercase">手牌 ({hand.length}/14)</span>

              <button
                onClick={() => setIsSelectingLaizi(!isSelectingLaizi)}
                className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold transition-all ${isSelectingLaizi || !laizi
                  ? 'bg-yellow-500 text-black border-yellow-400 animate-pulse'
                  : 'bg-gray-800 text-gray-300 border-gray-600'
                  }`}
              >
                {laizi ? (
                  <>
                    <span className="opacity-70">癞子:</span>
                    <span className="text-sm">{laizi.suit === 'zihai' ? laizi.symbol : `${laizi.value}${laizi.suit === 'man' ? '万' : laizi.suit === 'pin' ? '筒' : '条'}`}</span>
                  </>
                ) : (
                  "点击设置癞子"
                )}
              </button>
            </div>

            {/* Hand Tiles Horizontal Scroll */}
            <div
              ref={handContainerRef}
              className="flex overflow-x-auto px-4 py-3 gap-1 no-scrollbar items-center bg-[#1a1a1a]"
            >
              {hand.length === 0 && (
                <div className="w-full text-center text-xs text-gray-600 py-4 border-2 border-dashed border-gray-700 rounded">
                  点击上方牌墙输入手牌
                </div>
              )}
              {hand.map((tile, idx) => (
                <div key={idx} className="flex-none animate-[scaleIn_0.1s_ease-out]">
                  <TileComponent
                    tile={tile}
                    size="md"
                    removable
                    onClick={() => removeFromHand(idx)}
                  />
                  {laizi && tile.suit === laizi.suit && tile.value === laizi.value && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full z-20 shadow border border-black/50" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 4. Analysis Results (Scrollable Content) */}
          <div className="pt-6 min-h-[300px]">
            {renderAnalysisResults()}
          </div>

          {/* Footer Padding */}
          <div className="h-10 text-center text-[10px] text-gray-700">
            -- 个板麻将助手Pro --
          </div>
        </div>

        {/* Scoreboard View Wrapper */}
        <div style={{ display: activeTab === 'score' ? 'block' : 'none' }}>
          <Scoreboard />
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="flex-none h-16 bg-[#0a1f12] border-t border-white/10 flex items-center justify-around z-30 pb-[env(safe-area-inset-bottom)]">
        <button
          onClick={() => setActiveTab('calc')}
          className={`flex flex-col items-center gap-1 w-full h-full justify-center ${activeTab === 'calc' ? 'text-yellow-400' : 'text-gray-500'}`}
        >
          <span className="text-xl">🧮</span>
          <span className="text-[10px] font-bold">牌效计算</span>
        </button>
        <button
          onClick={() => setActiveTab('score')}
          className={`flex flex-col items-center gap-1 w-full h-full justify-center ${activeTab === 'score' ? 'text-yellow-400' : 'text-gray-500'}`}
        >
          <span className="text-xl">📊</span>
          <span className="text-[10px] font-bold">记分板</span>
        </button>
      </div>

    </div>
  );
};

export default App;

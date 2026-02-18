// This file is deprecated in favor of local logic in mahjongLogic.ts
// Re-exporting for compatibility if needed, but App.tsx will act as the source of truth.
import { analyzeHand as localAnalyze } from './mahjongLogic';
export const analyzeHand = localAnalyze;

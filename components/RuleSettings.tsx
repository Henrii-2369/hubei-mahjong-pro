import React from 'react';
import { GameRules } from '../types';
import { REGIONS } from '../constants';

interface RuleSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  rules: GameRules;
  setRules: (rules: GameRules) => void;
}

const RuleSettings: React.FC<RuleSettingsProps> = ({ isOpen, onClose, rules, setRules }) => {
  if (!isOpen) return null;

  const handleChange = (key: keyof GameRules, value: any) => {
    setRules({ ...rules, [key]: value });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-felt-light w-full max-w-md rounded-xl shadow-2xl border border-felt-light p-6 text-white overflow-y-auto max-h-[90vh]">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span>⚙️</span> 规则设置 (Settings)
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">麻将地区 / 规则 (Region)</label>
            <div className="grid grid-cols-1 gap-2">
              {REGIONS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleChange('region', r.id)}
                  className={`p-3 rounded-lg text-left border transition-all ${
                    rules.region === r.id 
                      ? 'bg-green-600 border-green-400 text-white shadow-lg' 
                      : 'bg-felt-dark border-transparent text-gray-400 hover:bg-black/20'
                  }`}
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">特殊规则说明 (Custom Rules)</label>
            <textarea
              value={rules.customInstructions}
              onChange={(e) => handleChange('customInstructions', e.target.value)}
              placeholder="例如：自摸加底，不带风牌，断幺九..."
              className="w-full h-24 p-3 rounded-lg bg-felt-dark border border-gray-600 focus:border-green-400 focus:outline-none text-white text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">AI将根据此处的补充说明调整策略。</p>
          </div>
        </div>

        <div className="mt-8">
          <button 
            onClick={onClose}
            className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg shadow-lg active:scale-95 transition-transform"
          >
            保存并开始
          </button>
        </div>
      </div>
    </div>
  );
};

export default RuleSettings;

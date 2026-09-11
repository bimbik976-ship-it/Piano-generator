import React from 'react';
import { Music2, ListMusic, KeyRound } from 'lucide-react';

export type TabId = 'peta' | 'tracklist' | 'api';

interface NavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  trackCount: number;
  hasActiveKey: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  trackCount,
  hasActiveKey,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0d0f12]/95 backdrop-blur-lg border-t border-[#222634] px-4 py-2">
      <div className="max-w-md mx-auto grid grid-cols-3 gap-2">
        {/* Tab 1: PETA */}
        <button
          onClick={() => onTabChange('peta')}
          className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all relative ${
            activeTab === 'peta'
              ? 'text-amber-400 bg-amber-500/10 shadow-[0_0_12px_rgba(245,158,11,0.15)] font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#161922]'
          }`}
        >
          <Music2 className="w-5 h-5 mb-1" />
          <span className="text-[11px] tracking-wider uppercase font-semibold">PETA</span>
          {activeTab === 'peta' && (
            <span className="absolute bottom-1 w-1 h-1 rounded-full bg-amber-400" />
          )}
        </button>

        {/* Tab 2: TRACKLIST */}
        <button
          onClick={() => onTabChange('tracklist')}
          className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all relative ${
            activeTab === 'tracklist'
              ? 'text-amber-400 bg-amber-500/10 shadow-[0_0_12px_rgba(245,158,11,0.15)] font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#161922]'
          }`}
        >
          <div className="relative">
            <ListMusic className="w-5 h-5 mb-1" />
            {trackCount > 0 && (
              <span className="absolute -top-1 -right-2.5 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-amber-500 text-black">
                {trackCount}
              </span>
            )}
          </div>
          <span className="text-[11px] tracking-wider uppercase font-semibold">TRACKLIST</span>
          {activeTab === 'tracklist' && (
            <span className="absolute bottom-1 w-1 h-1 rounded-full bg-amber-400" />
          )}
        </button>

        {/* Tab 3: API */}
        <button
          onClick={() => onTabChange('api')}
          className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all relative ${
            activeTab === 'api'
              ? 'text-amber-400 bg-amber-500/10 shadow-[0_0_12px_rgba(245,158,11,0.15)] font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#161922]'
          }`}
        >
          <div className="relative">
            <KeyRound className="w-5 h-5 mb-1" />
            <span
              className={`absolute top-0 right-0 w-2 h-2 rounded-full border-2 border-[#0d0f12] ${
                hasActiveKey ? 'bg-emerald-400' : 'bg-rose-500'
              }`}
            />
          </div>
          <span className="text-[11px] tracking-wider uppercase font-semibold">API</span>
          {activeTab === 'api' && (
            <span className="absolute bottom-1 w-1 h-1 rounded-full bg-amber-400" />
          )}
        </button>
      </div>
    </nav>
  );
};

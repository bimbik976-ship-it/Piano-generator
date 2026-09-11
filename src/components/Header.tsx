import React, { useState } from 'react';
import { Music, CheckCircle2, AlertCircle, Sparkles, Download, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWA';

interface HeaderProps {
  activeKeysCount: number;
  routingMode: string;
  completedCount: number;
  batchNumber: number;
  onOpenQC: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeKeysCount,
  routingMode,
  completedCount,
  batchNumber,
  onOpenQC,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const isApiReady = activeKeysCount > 0;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#222634] bg-[#0d0f12]/95 backdrop-blur-md">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
            <Music className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                PETA PIANO AI
              </h1>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/25">
                AI V1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Suno Instrumental Piano Prompt Architect
            </p>
          </div>
        </div>

        {/* Status Badges & Controls */}
        <div className="flex items-center gap-2">
          {/* API Status Badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              isApiReady
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isApiReady ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
              }`}
            />
            <span className="font-semibold">{isApiReady ? 'API SIAP' : 'API BELUM SIAP'}</span>
            <span className="text-[10px] text-slate-400 hidden md:inline">
              ({activeKeysCount} Kunci | {routingMode})
            </span>
          </div>

          {/* Batch Progress Mini-badge */}
          <div className="hidden xs:flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono bg-[#181b24] border border-[#2b3040] text-slate-300">
            <span className="text-amber-400 font-bold">#{completedCount}</span>
            <span className="text-slate-500">/25</span>
          </div>

          {/* Diagnostics / QC Quick Button */}
          <button
            onClick={onOpenQC}
            title="Quality Control & System Diagnostics"
            className="p-1.5 rounded-lg bg-[#181b24] border border-[#2b3040] text-slate-300 hover:text-amber-400 hover:border-amber-500/30 transition text-xs flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline text-[11px]">QC</span>
          </button>

          {/* PWA Install Button */}
          {isInstallable && (
            <button
              onClick={install}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition shadow-[0_0_15px_rgba(245,158,11,0.3)]"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Install App</span>
            </button>
          )}

          {isIOS && !isInstalled && (
            <button
              onClick={() => setShowIOSPrompt(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg border border-[#2b3040] text-[11px] text-slate-400 hover:text-slate-200"
            >
              <Smartphone className="w-3 h-3" />
              <span>iOS App</span>
            </button>
          )}
        </div>
      </div>

      {/* iOS Install Instructions Modal */}
      {showIOSPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[#161922] border border-[#2b3040] p-5 shadow-2xl text-slate-200">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-amber-400" />
              Pasang di iPhone / iPad
            </h3>
            <p className="text-xs text-slate-300 mb-3 leading-relaxed">
              1. Buka halaman ini di browser <strong>Safari</strong>.<br />
              2. Tekan tombol <strong>Share</strong> (ikon kotak bertanda panah ke atas).<br />
              3. Gulir ke bawah lalu pilih <strong>Add to Home Screen</strong> (Tambah ke Layar Utama).
            </p>
            <button
              onClick={() => setShowIOSPrompt(false)}
              className="w-full py-2 rounded-xl bg-amber-500 text-black font-semibold text-xs hover:bg-amber-400 transition"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

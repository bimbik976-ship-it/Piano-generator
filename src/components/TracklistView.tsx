import React, { useState } from 'react';
import {
  ListMusic,
  Copy,
  Check,
  Trash2,
  Download,
  FileText,
  Clock,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { GeneratedTrackResult } from '../types';
import { StyleIntensityVisualizer } from './StyleIntensityVisualizer';

interface TracklistViewProps {
  tracks: GeneratedTrackResult[];
  onDeleteTrack: (id: string) => void;
  onClearBatch: () => void;
  onRequestNewBatch: () => void;
  onExportText: () => void;
  onExportJSON: () => void;
}

export const TracklistView: React.FC<TracklistViewProps> = ({
  tracks,
  onDeleteTrack,
  onClearBatch,
  onRequestNewBatch,
  onExportText,
  onExportJSON,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [expandedTrackId, setExpandedTrackId] = useState<string | null>(null);

  const handleCopySingle = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAll = () => {
    if (tracks.length === 0) return;
    const allText = tracks
      .map(
        (t) =>
          `[Track #${t.batchNumber}] ${t.metadata.pianoType} (${t.bpm} BPM)\n${t.stylePrompt}`
      )
      .join('\n\n');
    navigator.clipboard.writeText(allText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="space-y-6 pb-28 max-w-4xl mx-auto">
      {/* Top Header & Actions */}
      <div className="rounded-2xl bg-gradient-to-r from-[#171a24] to-[#14161f] border border-[#272d3e] p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/25">
              TRACKLIST RESMI
            </span>
            <span className="text-xs text-slate-400">Hanya Menyimpan Prompt Berhasil</span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-white">
            Koleksi Track Terverifikasi ({tracks.length} / 25)
          </h2>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {tracks.length > 0 && (
            <>
              <button
                onClick={handleCopyAll}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition shadow-[0_0_15px_rgba(245,158,11,0.2)]"
              >
                {copiedAll ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedAll ? 'Semua Tersalin!' : 'Copy All Prompts'}</span>
              </button>

              <button
                onClick={onExportText}
                title="Export as Text (.txt)"
                className="p-2 rounded-xl bg-[#202534] hover:bg-[#2c3347] border border-[#343b52] text-slate-300 hover:text-white transition"
              >
                <FileText className="w-4 h-4" />
              </button>

              <button
                onClick={onExportJSON}
                title="Export as JSON (.json)"
                className="p-2 rounded-xl bg-[#202534] hover:bg-[#2c3347] border border-[#343b52] text-slate-300 hover:text-white transition"
              >
                <Download className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  if (confirm('Apakah Anda yakin ingin mengosongkan tracklist batch ini?')) {
                    onClearBatch();
                  }
                }}
                title="Clear Batch Tracklist"
                className="p-2 rounded-xl bg-[#202534] hover:bg-rose-950/50 hover:border-rose-500/40 border border-[#343b52] text-slate-400 hover:text-rose-400 transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Empty State */}
      {tracks.length === 0 ? (
        <div className="rounded-2xl border border-[#232736] bg-[#141720] p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 mx-auto">
            <ListMusic className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-white">Tracklist Masih Kosong</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            Belum ada style prompt yang dihasilkan. Masuk ke tab <strong>PETA</strong> dan tekan tombol Generate untuk membuat prompt #1.
          </p>
        </div>
      ) : (
        /* Track Items List */
        <div className="space-y-4">
          {tracks.map((track) => {
            const isExpanded = expandedTrackId === track.id;
            const isCopied = copiedId === track.id;

            return (
              <div
                key={track.id}
                className="rounded-2xl bg-[#141720] border border-[#252a3a] p-4 sm:p-5 space-y-4 transition hover:border-[#353c52]"
              >
                {/* Track Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222736] pb-3">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-amber-500 text-black font-extrabold flex items-center justify-center text-xs">
                      #{track.batchNumber}
                    </span>
                    <div>
                      <h4 className="font-bold text-sm text-white">
                        {track.metadata.pianoType} — {track.metadata.genre}
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                        <span className="text-amber-400">{track.bpm} BPM</span>
                        <span>•</span>
                        <span>{track.modelUsed}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopySingle(track.id, track.stylePrompt)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        isCopied
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#1e2330] hover:bg-[#282f42] text-slate-200 border border-[#30374a]'
                      }`}
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopied ? 'Tersalin' : 'Copy Prompt'}</span>
                    </button>

                    <button
                      onClick={() => setExpandedTrackId(isExpanded ? null : track.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#1e2330] hover:bg-[#282f42] text-slate-300 text-xs border border-[#30374a]"
                    >
                      {isExpanded ? 'Tutup Detail' : 'Detail'}
                    </button>

                    <button
                      onClick={() => onDeleteTrack(track.id)}
                      title="Hapus track ini"
                      className="p-1.5 rounded-lg hover:bg-rose-950/60 hover:text-rose-400 text-slate-500 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Style Prompt Box */}
                <div>
                  <div className="p-3.5 rounded-xl bg-[#0c0e14] border border-[#202534] font-mono text-xs text-slate-200 leading-relaxed select-all">
                    {track.stylePrompt}
                  </div>
                </div>

                {/* Instruments & Tags */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold mr-1">
                    Instrumen:
                  </span>
                  {track.instruments.map((inst, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-[#1a1e2a] border border-[#272e40] text-[11px] text-slate-300"
                    >
                      {inst}
                    </span>
                  ))}
                </div>

                {/* Expanded Details: Style Intensity & Full Metadata */}
                {isExpanded && (
                  <div className="pt-3 border-t border-[#222736] space-y-3 animate-in fade-in duration-200">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      <div className="p-2 rounded bg-[#0f1118] border border-[#202534]">
                        <span className="text-slate-500 block text-[10px]">Mood:</span>
                        <span className="text-slate-200 font-medium">{track.metadata.mood}</span>
                      </div>
                      <div className="p-2 rounded bg-[#0f1118] border border-[#202534]">
                        <span className="text-slate-500 block text-[10px]">Kategori:</span>
                        <span className="text-slate-200 font-medium">{track.metadata.category}</span>
                      </div>
                      <div className="p-2 rounded bg-[#0f1118] border border-[#202534]">
                        <span className="text-slate-500 block text-[10px]">Country:</span>
                        <span className="text-slate-200 font-medium">{track.metadata.country}</span>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-slate-400 mb-2">
                        Style Intensity Profile:
                      </div>
                      <StyleIntensityVisualizer intensity={track.styleIntensity} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

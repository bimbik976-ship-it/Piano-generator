import React, { useState } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  Sliders,
  Globe,
  Music,
  Heart,
  Layers,
  AlertCircle,
  Cpu,
  Flame,
  Activity,
  Video,
  Copy as CopyIcon
} from 'lucide-react';
import {
  BatchState,
  YouTubeSEOContent,
  GatewayModelId,
  GeneratedTrackResult,
  GeneratorSettings,
  SafeDebugInfo,
  RoutingMode
} from '../types';
import {
  PIANO_TYPES,
  CATEGORIES,
  GENRES,
  MOODS,
  COUNTRIES
} from '../config/options';
import { MODEL_CONFIG, getModelUIName } from '../config/models';
import { StyleIntensityVisualizer } from './StyleIntensityVisualizer';
import { SafeDebugCard } from './SafeDebugCard';

interface PetaGeneratorViewProps {
  batchState: BatchState;
  settings: GeneratorSettings;
  onUpdateSettings: (settings: GeneratorSettings) => void;
  selectedModelId: GatewayModelId;
  onSelectModelId: (modelId: GatewayModelId) => void;
  routingMode: RoutingMode;
  activeKeysCount: number;
  latestTrack: GeneratedTrackResult | null;
  isGenerating: boolean;
  statusMessage: string;
  debugInfo: SafeDebugInfo | null;
  onGenerate: () => void;
  onRequestNewBatch: () => void;
  onSwitchToAPI: () => void;
  youtubeTitle: string;
  isGeneratingTitle: boolean;
  titleError: string | null;
  onGenerateYouTubeTitle: () => void;
  youtubeSEO: YouTubeSEOContent | null;
  isRegeneratingSEO: boolean;
  seoError: string | null;
  onRegenerateSEO: () => void;
  isRegeneratingThumbnail: boolean;
  thumbnailError: string | null;
  onRegenerateThumbnail: () => void;
}

export const PetaGeneratorView: React.FC<PetaGeneratorViewProps> = ({
  batchState,
  settings,
  onUpdateSettings,
  selectedModelId,
  onSelectModelId,
  routingMode,
  activeKeysCount,
  latestTrack,
  isGenerating,
  statusMessage,
  debugInfo,
  onGenerate,
  onRequestNewBatch,
  onSwitchToAPI,
  youtubeTitle,
  isGeneratingTitle,
  titleError,
  onGenerateYouTubeTitle,
  youtubeSEO,
  isRegeneratingSEO,
  seoError,
  onRegenerateSEO,
  isRegeneratingThumbnail,
  thumbnailError,
  onRegenerateThumbnail,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [copiedDescription, setCopiedDescription] = useState(false);
  const [copiedHashtags, setCopiedHashtags] = useState(false);
  const [copiedTags, setCopiedTags] = useState(false);
  const [copiedThumbnail, setCopiedThumbnail] = useState(false);
  const [expandedSection, setExpandedSection] = useState<'options' | 'result' | 'all'>('all');

  const nextNumber = batchState.completedCount + 1;
  const isBatchComplete = batchState.completedCount >= 25 || batchState.isComplete;
  const hasKey = activeKeysCount > 0;

  const handleCopyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyText = (text: string, setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  // Toggle multi-select category
  const toggleCategory = (cat: string) => {
    const exists = settings.categories.includes(cat);
    if (exists) {
      if (settings.categories.length > 1) {
        onUpdateSettings({
          ...settings,
          categories: settings.categories.filter((c) => c !== cat),
        });
      }
    } else {
      onUpdateSettings({
        ...settings,
        categories: [...settings.categories, cat],
      });
    }
  };

  // Toggle multi-select mood
  const toggleMood = (mood: string) => {
    const exists = settings.moods.includes(mood);
    if (exists) {
      if (settings.moods.length > 1) {
        onUpdateSettings({
          ...settings,
          moods: settings.moods.filter((m) => m !== mood),
        });
      }
    } else {
      onUpdateSettings({
        ...settings,
        moods: [...settings.moods, mood],
      });
    }
  };

  return (
    <div className="space-y-6 pb-28 max-w-4xl mx-auto">
      {/* Batch Header Bar */}
      <div className="rounded-2xl bg-gradient-to-r from-[#171a24] to-[#14161f] border border-[#272d3e] p-4 sm:p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/25">
                BATCH #{batchState.batchNumber}
              </span>
              <span className="text-xs text-slate-400">
                1 Batch = 25 Prompts = 1 Video YouTube
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
              {isBatchComplete ? (
                <span className="text-amber-400 flex items-center gap-2">
                  BATCH COMPLETE — 25/25 STYLE PROMPTS COMPLETED
                </span>
              ) : (
                <span>
                  Suno Style Prompt Generator{' '}
                  <span className="text-amber-400">#{nextNumber}</span> dari 25
                </span>
              )}
            </h2>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <div className="text-right sm:mr-2">
              <div className="text-xs text-slate-400">Progress Batch</div>
              <div className="font-mono font-bold text-amber-400 text-sm">
                {batchState.completedCount} / 25
              </div>
            </div>
            <button
              onClick={onRequestNewBatch}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#202534] hover:bg-[#2c3347] border border-[#343b52] text-xs font-semibold text-slate-200 transition"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>NEW BATCH</span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 w-full h-2 bg-[#0e1017] rounded-full overflow-hidden border border-[#242938]">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
            style={{ width: `${(batchState.completedCount / 25) * 100}%` }}
          />
        </div>
      </div>

      {/* No API Key Warning Banner */}
      {!hasKey && (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-950/20 p-4 flex items-start sm:items-center justify-between gap-3 text-rose-200">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <div>
              <h4 className="font-bold text-sm text-white">API BELUM SIAP</h4>
              <p className="text-xs text-rose-300/80">
                Tidak ada Kunci KIE Aktif di dalam sistem. Masukkan kunci API KIE Anda untuk memulai generation.
              </p>
            </div>
          </div>
          <button
            onClick={onSwitchToAPI}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs whitespace-nowrap transition"
          >
            Buka Tab API
          </button>
        </div>
      )}

      {/* Model & Routing Selector */}
      <div className="rounded-2xl bg-[#141720] border border-[#252a3a] p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Centralized AI Engine Config
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Routing Mode:</span>
            <span
              className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                routingMode === 'AUTO'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
              }`}
            >
              {routingMode} (Auto-Fallback {routingMode === 'AUTO' ? 'Aktif' : 'Nonaktif'})
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {(Object.keys(MODEL_CONFIG) as GatewayModelId[]).map((mId) => {
            const cfg = MODEL_CONFIG[mId];
            const isSelected = selectedModelId === mId;
            return (
              <button
                key={mId}
                onClick={() => onSelectModelId(mId)}
                className={`p-3 rounded-xl text-left border transition relative flex flex-col justify-between ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                    : 'bg-[#0f1118] border-[#222736] hover:border-[#32394a]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-white">{cfg.uiName}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                  </div>
                  <div className="text-[10px] font-mono text-amber-400/80 mb-1.5">
                    Gateway ID: {cfg.gatewayId}
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 line-clamp-2">{cfg.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Input Parameters Section */}
      <div className="rounded-2xl bg-[#141720] border border-[#252a3a] p-4 sm:p-5 space-y-5">
        <div className="flex items-center justify-between border-b border-[#222736] pb-3">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>Parameter Musikal & Konteks Estetika</span>
          </div>
          <span className="text-[11px] text-slate-400">Khusus Piano Instrumental</span>
        </div>

        {/* 1. Jenis Piano Instrumental (Single-select, 15 options) */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
            <span>1. JENIS PIANO INSTRUMENTAL (Single-select)</span>
            <span className="text-[11px] text-amber-400 font-mono font-normal">
              Terpilih: {settings.pianoType}
            </span>
          </label>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
            {PIANO_TYPES.map((pt) => {
              const active = settings.pianoType === pt;
              return (
                <button
                  key={pt}
                  onClick={() => onUpdateSettings({ ...settings, pianoType: pt })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    active
                      ? 'bg-amber-500 text-black font-bold shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                      : 'bg-[#1a1e29] hover:bg-[#252b3b] text-slate-300 border border-[#272d3e]'
                  }`}
                >
                  {pt}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Genre (Single-select, 13 options) */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
            <span>2. GENRE MUSIK (Single-select)</span>
            <span className="text-[11px] text-amber-400 font-mono font-normal">
              Terpilih: {settings.genre}
            </span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {GENRES.map((g) => {
              const active = settings.genre === g;
              return (
                <button
                  key={g}
                  onClick={() => onUpdateSettings({ ...settings, genre: g })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    active
                      ? 'bg-amber-500 text-black font-bold shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                      : 'bg-[#1a1e29] hover:bg-[#252b3b] text-slate-300 border border-[#272d3e]'
                  }`}
                >
                  {g}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Kategori Penggunaan (Multi-select, 23 options) */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
            <span>3. KATEGORI PENGGUNAAN (Multi-select)</span>
            <span className="text-[11px] text-slate-400">
              {settings.categories.length} kategori dipilih
            </span>
          </label>
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
            {CATEGORIES.map((cat) => {
              const active = settings.categories.includes(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition flex items-center gap-1 ${
                    active
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                      : 'bg-[#171a24] text-slate-400 hover:text-slate-200 border border-[#222736]'
                  }`}
                >
                  {active && <Check className="w-3 h-3 text-amber-400" />}
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Mood & Suasana Emosional (Multi-select, 20 options) */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
            <span>4. MOOD & SUASANA EMOSIONAL (Multi-select)</span>
            <span className="text-[11px] text-slate-400">{settings.moods.length} suasana dipilih</span>
          </label>
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
            {MOODS.map((mood) => {
              const active = settings.moods.includes(mood);
              return (
                <button
                  key={mood}
                  onClick={() => toggleMood(mood)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition flex items-center gap-1 ${
                    active
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                      : 'bg-[#171a24] text-slate-400 hover:text-slate-200 border border-[#222736]'
                  }`}
                >
                  {active && <Check className="w-3 h-3 text-amber-400" />}
                  <span>{mood}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Country Context (Dropdown) */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            <span>5. COUNTRY / AESTHETIC CONTEXT</span>
          </label>
          <select
            value={settings.country}
            onChange={(e) => onUpdateSettings({ ...settings, country: e.target.value })}
            className="w-full sm:w-72 bg-[#12151d] border border-[#262c3d] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
          >
            {COUNTRIES.map((c) => (
              <option key={c} value={c} className="bg-[#12151d] text-white">
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* YouTube Content: after 25/25, first create the title from all 25 Style Prompts. */}
      {isBatchComplete && (
        <div className="rounded-2xl bg-[#12151e] border border-red-500/30 p-5 sm:p-6 shadow-2xl space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#242a3a] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-extrabold text-white text-base tracking-wide uppercase">YOUTUBE CONTENT</h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-bold text-emerald-300 flex items-center gap-1">
                    <Check className="w-3 h-3" /> 25 Track Selesai
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Judul dibuat dengan menganalisis Style Prompt #1–#25.</p>
              </div>
            </div>

            {/* REGENERATE SEO is the complete package: new title + SEO description + hashtags + YouTube tags. */}
            {youtubeTitle && (
              <button
                onClick={onRegenerateSEO}
                disabled={isRegeneratingSEO || !hasKey}
                className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition border ${isRegeneratingSEO ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 cursor-wait animate-pulse' : 'bg-[#1b202c] hover:bg-[#252c3d] text-amber-400 border-amber-500/30 hover:border-amber-500/60 shadow-sm active:scale-[0.98]'} disabled:opacity-50`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRegeneratingSEO ? 'animate-spin' : ''}`} />
                {isRegeneratingSEO ? 'REGENERATING SEO...' : 'REGENERATE SEO'}
              </button>
            )}
          </div>

          {!youtubeTitle ? (
            <div className="pt-1">
              <p className="text-xs text-slate-400 mb-3">Semua 25 Style Prompt sudah selesai. Tekan tombol di bawah untuk membuat 1 judul YouTube berdasarkan analisis Style Prompt #1–#25.</p>
              <button onClick={onGenerateYouTubeTitle} disabled={isGeneratingTitle || !hasKey} className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold text-xs uppercase disabled:opacity-50 flex items-center justify-center gap-2">
                {isGeneratingTitle ? 'MEMBUAT JUDUL...' : 'BUAT JUDUL'}
              </button>
              {titleError && <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-950/20 px-3 py-2 text-xs text-rose-300">{titleError}</div>}
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-300 tracking-wider uppercase"><span className="text-red-400 font-mono">TITLE</span></label>
                  <button onClick={() => handleCopyText(youtubeTitle, setCopiedTitle)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40">{copiedTitle ? 'COPIED TITLE' : 'COPY TITLE'}</button>
                </div>
                <div className="p-3.5 rounded-xl bg-[#0a0c12] border border-[#222838] text-white font-medium text-sm sm:text-base leading-snug select-all">{youtubeTitle}</div>
              </div>

              {!youtubeSEO ? (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-slate-300">
                  Judul sudah dibuat. <span className="text-amber-300 font-semibold">REGENERATE SEO</span> akan membuat paket lengkap baru: judul + SEO Description + Hashtags + YouTube Tags.
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-bold text-slate-300 tracking-wider uppercase"><span className="text-amber-400 font-mono">SEO DESCRIPTION</span> <span className="text-[10px] text-slate-400 font-normal">({youtubeSEO.description.split(/\s+/).filter(Boolean).length} kata • target 500–1.000 kata)</span></label>
                      <button onClick={() => handleCopyText(youtubeSEO.description, setCopiedDescription)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40">{copiedDescription ? 'COPIED DESCRIPTION' : 'COPY DESCRIPTION'}</button>
                    </div>
                    <div className="p-4 rounded-xl bg-[#0a0c12] border border-[#222838] text-slate-200 text-xs sm:text-sm leading-relaxed whitespace-pre-line select-all max-h-80 overflow-y-auto">{youtubeSEO.description}</div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-bold text-slate-300 tracking-wider uppercase"><span className="text-sky-400 font-mono">HASHTAGS</span> <span className="text-[10px] text-slate-400 font-normal">({youtubeSEO.hashtags.length} hashtags • 5–15)</span></label>
                      <button onClick={() => handleCopyText(youtubeSEO.hashtags.join(' '), setCopiedHashtags)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40">{copiedHashtags ? 'COPIED HASHTAGS' : 'COPY HASHTAGS'}</button>
                    </div>
                    <div className="p-3 rounded-xl bg-[#0a0c12] border border-[#222838] flex flex-wrap gap-2 select-all">{youtubeSEO.hashtags.map((h, i) => <span key={`${h}-${i}`} className="px-2.5 py-1 rounded-lg bg-sky-950/40 border border-sky-500/30 text-sky-300 font-mono text-xs font-semibold">{h}</span>)}</div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-bold text-slate-300 tracking-wider uppercase"><span className="text-emerald-400 font-mono">YOUTUBE TAGS</span> <span className="text-[10px] text-slate-500 font-normal">({youtubeSEO.tags.length} tags • format koma)</span></label>
                      <button onClick={() => handleCopyText(youtubeSEO.tags.join(', '), setCopiedTags)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40">{copiedTags ? 'COPIED TAGS' : 'COPY TAGS'}</button>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#0a0c12] border border-[#222838] text-xs font-mono text-slate-300 leading-relaxed select-all">{youtubeSEO.tags.join(', ')}</div>
                  </div>

                  {/* Text on Thumbnail remains an addition only, after the complete SEO package. */}
                  <div className="space-y-2 pt-1 border-t border-[#1e2330]">
                    <div className="flex items-center justify-between gap-2 pt-3">
                      <label className="text-xs font-bold text-slate-300 tracking-wider uppercase"><span className="text-violet-400 font-mono">TEXT ON THUMBNAIL</span></label>
                      <button onClick={() => handleCopyText(youtubeSEO.thumbnailText || '', setCopiedThumbnail)} disabled={!youtubeSEO.thumbnailText} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 border border-violet-500/40 disabled:opacity-50">{copiedThumbnail ? 'COPIED THUMBNAIL TEXT' : 'COPY THUMBNAIL TEXT'}</button>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#0a0c12] border border-[#222838] text-white text-sm sm:text-base font-bold whitespace-pre-line select-all">{youtubeSEO.thumbnailText || 'Belum tersedia'}</div>
                    <button onClick={onRegenerateThumbnail} disabled={isRegeneratingThumbnail || !hasKey || !youtubeSEO.title} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1b202c] hover:bg-[#252c3d] border border-[#343b52] text-xs font-bold text-slate-200 disabled:opacity-50">
                      <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isRegeneratingThumbnail ? 'animate-spin' : ''}`} />
                      {isRegeneratingThumbnail ? 'REGENERATING THUMBNAIL TEXT...' : 'REGENERATE THUMBNAIL TEXT'}
                    </button>
                    {thumbnailError && <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 px-3 py-2 text-xs text-rose-300">{thumbnailError}</div>}
                  </div>
                </>
              )}

              {titleError && <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 px-3 py-2 text-xs text-rose-300">{titleError}</div>}
              {seoError && <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 px-3 py-2 text-xs text-rose-300">SEO REGENERATION FAILED: {seoError}</div>}
            </>
          )}
        </div>
      )}

      {/* Primary Generation Button */}
      <div className="space-y-3">
        <button
          onClick={onGenerate}
          disabled={isGenerating || !hasKey || isBatchComplete}
          className={`w-full py-4 px-6 rounded-2xl font-extrabold text-sm sm:text-base tracking-wide uppercase transition-all duration-300 flex items-center justify-center gap-3 relative ${
            isGenerating
              ? 'bg-amber-500/70 text-black cursor-wait animate-pulse'
              : !hasKey || isBatchComplete
              ? 'bg-[#1c202a] text-slate-500 border border-[#272d3e] cursor-not-allowed'
              : 'bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 text-black hover:scale-[1.01] active:scale-[0.99] shadow-[0_0_30px_rgba(245,158,11,0.35)]'
          }`}
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>{statusMessage || 'VALIDATING MUSICAL OUTPUT...'}</span>
            </>
          ) : isBatchComplete ? (
            <>
              <Check className="w-5 h-5 text-emerald-400" />
              <span>BATCH COMPLETE (25/25 STYLE PROMPTS) — KLIK NEW BATCH</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>GENERATE STYLE PROMPT #{nextNumber}</span>
            </>
          )}
        </button>

        {/* Informative text below button */}
        <p className="text-center text-[11px] text-slate-400">
          Setiap klik menghasilkan <strong>SATU</strong> prompt musikal instrumental unik. Anti-repetition & forbidden term validation aktif.
        </p>
      </div>

      {/* Safe Debug Information (Diagnostic Error or Non-blocking Advisory) */}
      {debugInfo && (
        <SafeDebugCard
          debugInfo={debugInfo}
          onRetry={debugInfo.errorType === 'ADVISORY' || debugInfo.isBlocking === false ? undefined : onGenerate}
        />
      )}

      {/* Latest Successful Track Result Display */}
      {latestTrack && (
        <div className="rounded-2xl bg-[#141720] border border-[#2a3042] p-5 sm:p-6 shadow-2xl space-y-5 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222736] pb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-amber-500 text-black font-extrabold flex items-center justify-center text-sm">
                #{latestTrack.batchNumber}
              </span>
              <div>
                <h3 className="font-bold text-white text-base">
                  {latestTrack.metadata.pianoType} — {latestTrack.metadata.genre}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>Model: {latestTrack.modelUsed}</span>
                  <span>•</span>
                  <span>{new Date(latestTrack.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleCopyPrompt(latestTrack.stylePrompt)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.25)]'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Tersalin ke Clipboard!' : 'Copy Style Prompt'}</span>
            </button>
          </div>

          {/* Style Prompt Box */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              SUNO STYLE PROMPT (Siap Digunakan di Suno):
            </label>
            <div className="p-4 rounded-xl bg-[#0c0e14] border border-[#222736] text-slate-100 font-mono text-xs sm:text-sm leading-relaxed select-all">
              {latestTrack.stylePrompt}
            </div>
          </div>

          {/* Musical Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-[#0f1118] border border-[#202534]">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">TEMPO / BPM</div>
              <div className="text-base font-bold text-amber-400 font-mono">{latestTrack.bpm} BPM</div>
            </div>
            <div className="p-3 rounded-xl bg-[#0f1118] border border-[#202534]">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">MOOD</div>
              <div className="text-xs font-bold text-slate-200 mt-1">{latestTrack.metadata.mood}</div>
            </div>
            <div className="p-3 rounded-xl bg-[#0f1118] border border-[#202534]">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">CATEGORY</div>
              <div className="text-xs font-bold text-slate-200 mt-1">{latestTrack.metadata.category}</div>
            </div>
          </div>

          {/* Instruments */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              INSTRUMENTS:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {latestTrack.instruments.map((inst, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-md bg-[#191d29] border border-[#282f42] text-xs text-amber-300 font-mono"
                >
                  {inst}
                </span>
              ))}
            </div>
          </div>

          {/* Style Intensity Visualizer */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              STYLE INTENSITY (0 - 100):
            </label>
            <StyleIntensityVisualizer intensity={latestTrack.styleIntensity} />
          </div>
        </div>
      )}
    </div>
  );
};

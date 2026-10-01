import React, { useState } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  FileText,
  Hash,
  Tag,
  KeyRound,
  ExternalLink
} from 'lucide-react';
import { GatewayModelId, RoutingMode } from '../types';
import { getModelUIName } from '../config/models';
import { generateSeoFromTitle, SeoFromTitleResult } from '../services/titleSeoGenerator';

interface CreateSeoFromTitleViewProps {
  selectedModelId: GatewayModelId;
  routingMode: RoutingMode;
  hasActiveKey: boolean;
  onSwitchToAPI: () => void;
}

export const CreateSeoFromTitleView: React.FC<CreateSeoFromTitleViewProps> = ({
  selectedModelId,
  routingMode,
  hasActiveKey,
  onSwitchToAPI,
}) => {
  const [inputTitle, setInputTitle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('MENYIAPKAN GENERASI SEO...');
  const [error, setError] = useState<string | null>(null);
  const [seoResult, setSeoResult] = useState<SeoFromTitleResult | null>(null);

  // Copy states
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [copiedDescription, setCopiedDescription] = useState(false);
  const [copiedHashtags, setCopiedHashtags] = useState(false);
  const [copiedTags, setCopiedTags] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  const handleCopy = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyAll = () => {
    if (!seoResult) return;
    const allText = [
      `TITLE:\n${seoResult.title}`,
      `\nDESCRIPTION:\n${seoResult.description}`,
      `\nHASHTAGS:\n${seoResult.hashtags.join(' ')}`,
      `\nYOUTUBE TAGS:\n${seoResult.tags.join(', ')}`
    ].join('\n\n');
    handleCopy(allText, setCopiedAll);
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanTitle = inputTitle.trim();
    if (!cleanTitle) {
      setError('Silakan masukkan judul YouTube terlebih dahulu.');
      return;
    }
    if (!hasActiveKey) {
      setError('Kunci KIE Aktif diperlukan untuk melakukan generasi.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setStatusMessage('MENGANALISIS JUDUL...');

    try {
      const response = await generateSeoFromTitle(
        cleanTitle,
        selectedModelId,
        routingMode,
        (msg) => setStatusMessage(msg)
      );

      if (response.success) {
        setSeoResult(response.data);
      } else {
        setError(response.errorMessage || 'Gagal membuat paket SEO dari judul.');
      }
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan sistem saat generasi.');
    } finally {
      setIsGenerating(false);
      setStatusMessage('SELESAI');
    }
  };

  const descriptionWordCount = seoResult
    ? seoResult.description.split(/\s+/).filter(Boolean).length
    : 0;

  return (
    <div className="space-y-6 pb-24">
      {/* Top Banner & Header */}
      <div className="flex items-center justify-between gap-3 border-b border-[#242a3a] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-white text-base sm:text-lg tracking-wide uppercase">
              CREATE SEO FROM TITLE
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Buat SEO Description (dengan emoticon), Hashtags, dan YouTube Tags instan berdasarkan judul YouTube Anda.
            </p>
          </div>
        </div>

        {/* Model Indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#141824] border border-[#23293d] text-xs text-slate-300">
          <span className="text-[10px] text-slate-400 uppercase">MODEL:</span>
          <span className="font-mono font-bold text-amber-400">{getModelUIName(selectedModelId)}</span>
        </div>
      </div>

      {/* No Key Warning */}
      {!hasActiveKey && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-amber-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Tidak ada Kunci KIE Aktif. Silakan aktifkan atau tambahkan kunci API terlebih dahulu.</span>
          </div>
          <button
            onClick={onSwitchToAPI}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500 text-black text-xs font-bold shrink-0 hover:bg-amber-400 transition"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>BUKA API</span>
          </button>
        </div>
      )}

      {/* Main Card: Input & Generate */}
      <div className="rounded-2xl bg-[#12151e] border border-[#242a3a] p-5 sm:p-6 shadow-2xl space-y-4">
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 tracking-wider uppercase flex items-center justify-between">
              <span className="text-amber-400 font-mono flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                INPUT YOUTUBE TITLE
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                {inputTitle.length} karakter
              </span>
            </label>
            <textarea
              value={inputTitle}
              onChange={(e) => setInputTitle(e.target.value)}
              disabled={isGenerating}
              placeholder="Masukkan judul YouTube di sini (contoh: Relaxing Piano Music with Calming Rain for Deep Sleep, Stress Relief & Meditation)..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-[#0a0c12] border border-[#222838] focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/40 text-slate-100 text-sm font-medium placeholder:text-slate-600 outline-none transition resize-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <div className="text-[11px] text-slate-400">
              * Judul Anda akan tetap utuh 100% tanpa perubahan. Deskripsi akan dilengkapi emoticon relevan.
            </div>
            <button
              type="submit"
              disabled={isGenerating || !inputTitle.trim() || !hasActiveKey}
              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-extrabold text-xs uppercase tracking-wider transition ${
                isGenerating
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-wait animate-pulse'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black shadow-lg shadow-amber-500/20 active:scale-[0.98]'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? statusMessage : 'GENERATE SEO'}</span>
            </button>
          </div>
        </form>

        {/* Error message */}
        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-3.5 text-xs text-rose-300 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold">Gagal Generasi:</span> {error}
            </div>
          </div>
        )}
      </div>

      {/* Generated SEO Output Card */}
      {seoResult && (
        <div className="rounded-2xl bg-[#12151e] border border-amber-500/30 p-5 sm:p-6 shadow-2xl space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#242a3a] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="font-extrabold text-white text-base tracking-wide uppercase">
                HASIL SEO DARI JUDUL
              </h3>
            </div>

            <button
              onClick={handleCopyAll}
              className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition border ${
                copiedAll
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-[#1b202c] hover:bg-[#252c3d] text-amber-400 border-amber-500/30 hover:border-amber-500/60'
              }`}
            >
              {copiedAll ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedAll ? 'TERSALIN SEMUA!' : 'COPY ALL SEO'}</span>
            </button>
          </div>

          {/* 1. TITLE (Exact user title, untouched) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-300 tracking-wider uppercase">
                <span className="text-red-400 font-mono">TITLE</span>
                <span className="text-[10px] text-slate-500 font-normal ml-2">(Sesuai judul yang dimasukkan)</span>
              </label>
              <button
                onClick={() => handleCopy(seoResult.title, setCopiedTitle)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  copiedTitle
                    ? 'bg-emerald-600 text-white'
                    : 'bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40'
                }`}
              >
                {copiedTitle ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedTitle ? 'COPIED TITLE' : 'COPY TITLE'}</span>
              </button>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0a0c12] border border-[#222838] text-white font-medium text-sm sm:text-base leading-snug select-all">
              {seoResult.title}
            </div>
          </div>

          {/* 2. SEO DESCRIPTION */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-300 tracking-wider uppercase">
                <span className="text-amber-400 font-mono">SEO DESCRIPTION</span>
                <span className="text-[10px] text-slate-400 font-normal ml-2">
                  ({descriptionWordCount} kata • target sekitar 600–750 kata • dengan emoticon)
                </span>
              </label>
              <button
                onClick={() => handleCopy(seoResult.description, setCopiedDescription)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  copiedDescription
                    ? 'bg-emerald-600 text-white'
                    : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                }`}
              >
                {copiedDescription ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedDescription ? 'COPIED DESCRIPTION' : 'COPY DESCRIPTION'}</span>
              </button>
            </div>
            <div className="p-4 rounded-xl bg-[#0a0c12] border border-[#222838] text-slate-200 text-xs sm:text-sm leading-relaxed whitespace-pre-line select-all max-h-96 overflow-y-auto pr-2">
              {seoResult.description}
            </div>
          </div>

          {/* 3. HASHTAGS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-300 tracking-wider uppercase">
                <span className="text-sky-400 font-mono">HASHTAGS</span>
                <span className="text-[10px] text-slate-400 font-normal ml-2">
                  ({seoResult.hashtags.length} hashtags)
                </span>
              </label>
              <button
                onClick={() => handleCopy(seoResult.hashtags.join(' '), setCopiedHashtags)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  copiedHashtags
                    ? 'bg-emerald-600 text-white'
                    : 'bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40'
                }`}
              >
                {copiedHashtags ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedHashtags ? 'COPIED HASHTAGS' : 'COPY HASHTAGS'}</span>
              </button>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0a0c12] border border-[#222838] flex flex-wrap gap-2 select-all">
              {seoResult.hashtags.map((h, i) => (
                <span
                  key={`${h}-${i}`}
                  className="px-2.5 py-1 rounded-lg bg-sky-950/40 border border-sky-500/30 text-sky-300 font-mono text-xs font-semibold"
                >
                  {h}
                </span>
              ))}
            </div>
          </div>

          {/* 4. YOUTUBE TAGS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-300 tracking-wider uppercase">
                <span className="text-emerald-400 font-mono">YOUTUBE TAGS</span>
                <span className="text-[10px] text-slate-500 font-normal ml-2">
                  ({seoResult.tags.length} tags • format koma)
                </span>
              </label>
              <button
                onClick={() => handleCopy(seoResult.tags.join(', '), setCopiedTags)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  copiedTags
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                }`}
              >
                {copiedTags ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedTags ? 'COPIED TAGS' : 'COPY TAGS'}</span>
              </button>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0a0c12] border border-[#222838] text-xs font-mono text-slate-300 leading-relaxed select-all">
              {seoResult.tags.join(', ')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

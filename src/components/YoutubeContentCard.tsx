import React, { useState } from 'react';
import { YoutubeContent, SafeDebugInfo } from '../types';
import {
  Youtube,
  Copy,
  Check,
  RefreshCw,
  Hash,
  Tag,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface YoutubeContentCardProps {
  content: YoutubeContent;
  isGenerating?: boolean;
  statusMessage?: string;
  seoError?: SafeDebugInfo | null;
  onRegenerate: () => void;
}

export const YoutubeContentCard: React.FC<YoutubeContentCardProps> = ({
  content,
  isGenerating = false,
  statusMessage,
  seoError,
  onRegenerate,
}) => {
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [copiedDescription, setCopiedDescription] = useState(false);
  const [copiedHashtags, setCopiedHashtags] = useState(false);
  const [copiedTags, setCopiedTags] = useState(false);

  const handleCopy = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hashtagsString = content.hashtags.join(' ');
  const tagsCommaSeparated = content.tags.join(', ');
  const descriptionWordCount = content.description.split(/\s+/).filter(Boolean).length;
  const paragraphCount = content.description.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length;

  return (
    <div
      id="youtube-content-card"
      className="rounded-2xl bg-[#12151e] border border-red-500/30 p-5 sm:p-6 shadow-2xl space-y-6 animate-in fade-in duration-300"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#242a3a] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
            <Youtube className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-white text-base tracking-wide uppercase">
                YOUTUBE CONTENT
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-bold text-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                25 Track Dianalisis
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Dioptimalkan untuk algoritma YouTube berdasarkan identitas musikal seluruh Style Prompt.
            </p>
          </div>
        </div>

        {/* Regenerate SEO Button */}
        <button
          id="btn-regenerate-seo"
          onClick={onRegenerate}
          disabled={isGenerating}
          className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition border ${
            isGenerating
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 cursor-wait animate-pulse'
              : 'bg-[#1b202c] hover:bg-[#252c3d] text-amber-400 border-amber-500/30 hover:border-amber-500/60 shadow-sm active:scale-[0.98]'
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
          <span>{isGenerating ? 'REGENERATING SEO...' : 'REGENERATE SEO'}</span>
        </button>
      </div>

      {/* Safe Diagnostic Banner if Regeneration Failed */}
      {seoError && (
        <div className="rounded-xl bg-rose-950/30 border border-rose-500/40 p-3.5 text-xs text-rose-200 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold uppercase tracking-wider text-rose-300">
                SEO REGENERATION FAILED
              </span>
              <span className="px-2 py-0.5 rounded bg-rose-900/60 text-[10px] font-mono font-bold text-rose-200 border border-rose-700/50">
                {seoError.errorType}
              </span>
            </div>
            <p className="text-rose-200/90 text-[11px]">{seoError.errorMessage}</p>
            <p className="text-slate-400 text-[10px]">
              Hasil SEO sebelumnya tetap dipertahankan. Anda dapat mencoba lagi setelah memeriksa koneksi atau API Key.
            </p>
          </div>
        </div>
      )}

      {/* Status banner while generating */}
      {isGenerating && statusMessage && (
        <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 flex items-center gap-2 text-xs text-amber-300 font-medium">
          <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* 1. TITLE SECTION */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-300 tracking-wider uppercase flex items-center gap-1.5">
            <span className="text-red-400 font-mono">TITLE</span>
            <span className="text-[10px] text-slate-500 font-normal">
              (Suffix otomatis: + Bamboo Water Sound)
            </span>
          </label>
          <button
            onClick={() => handleCopy(content.title, setCopiedTitle)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              copiedTitle
                ? 'bg-emerald-600 text-white'
                : 'bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40'
            }`}
          >
            {copiedTitle ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedTitle ? 'Tersalin!' : 'COPY TITLE'}</span>
          </button>
        </div>
        <div className="p-3.5 rounded-xl bg-[#0a0c12] border border-[#222838] text-white font-medium text-sm sm:text-base leading-snug select-all">
          {content.title}
        </div>
      </div>

      {/* 2. SEO DESCRIPTION SECTION */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-300 tracking-wider uppercase flex items-center gap-1.5">
            <span className="text-amber-400 font-mono">SEO DESCRIPTION</span>
            <span className="text-[10px] text-slate-400 font-normal">
              ({descriptionWordCount} kata • {paragraphCount} paragraf • Target 500–1.000 kata)
            </span>
          </label>
          <button
            onClick={() => handleCopy(content.description, setCopiedDescription)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              copiedDescription
                ? 'bg-emerald-600 text-white'
                : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
            }`}
          >
            {copiedDescription ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedDescription ? 'Tersalin!' : 'COPY DESCRIPTION'}</span>
          </button>
        </div>
        <div className="p-4 rounded-xl bg-[#0a0c12] border border-[#222838] text-slate-200 text-xs sm:text-sm leading-relaxed whitespace-pre-line select-all max-h-80 overflow-y-auto pr-2">
          {content.description}
        </div>
      </div>

      {/* 3. HASHTAGS SECTION */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-300 tracking-wider uppercase flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-sky-400 font-mono">HASHTAGS</span>
            <span className="text-[10px] text-slate-400 font-normal">
              ({content.hashtags.length} hashtags • 5–15 High-Volume / Niche)
            </span>
          </label>
          <button
            onClick={() => handleCopy(hashtagsString, setCopiedHashtags)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              copiedHashtags
                ? 'bg-emerald-600 text-white'
                : 'bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40'
            }`}
          >
            {copiedHashtags ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedHashtags ? 'Tersalin!' : 'COPY HASHTAGS'}</span>
          </button>
        </div>
        <div className="p-3 rounded-xl bg-[#0a0c12] border border-[#222838] flex flex-wrap gap-2 select-all">
          {content.hashtags.map((ht, idx) => (
            <span
              key={idx}
              className="px-2.5 py-1 rounded-lg bg-sky-950/40 border border-sky-500/30 text-sky-300 font-mono text-xs font-semibold"
            >
              {ht}
            </span>
          ))}
        </div>
      </div>

      {/* 4. YOUTUBE TAGS SECTION */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-300 tracking-wider uppercase flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-400 font-mono">YOUTUBE TAGS</span>
            <span className="text-[10px] text-slate-500 font-normal">
              ({content.tags.length} tags • format koma)
            </span>
          </label>
          <button
            onClick={() => handleCopy(tagsCommaSeparated, setCopiedTags)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              copiedTags
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
            }`}
          >
            {copiedTags ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedTags ? 'Tersalin!' : 'COPY TAGS'}</span>
          </button>
        </div>
        <div className="p-3.5 rounded-xl bg-[#0a0c12] border border-[#222838] text-xs font-mono text-slate-300 leading-relaxed select-all">
          {tagsCommaSeparated}
        </div>
      </div>

      <div className="pt-2 border-t border-[#1e2330] flex items-center justify-between text-[11px] text-slate-500">
        <span>Tahap Content Generation • Style Prompt #1–#25 Tidak Terpengaruh</span>
        <span>{new Date(content.generatedAt).toLocaleTimeString()}</span>
      </div>
    </div>
  );
};

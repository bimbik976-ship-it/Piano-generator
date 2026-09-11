import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, XCircle, RefreshCw, X } from 'lucide-react';
import { runQualityControlTests } from '../services/qualityControl';
import { QCTestResult } from '../types';

interface QCModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QCModal: React.FC<QCModalProps> = ({ isOpen, onClose }) => {
  const [tests, setTests] = useState<QCTestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const executeTests = async () => {
    setIsRunning(true);
    const results = await runQualityControlTests();
    setTests(results);
    setIsRunning(false);
  };

  useEffect(() => {
    if (isOpen) {
      executeTests();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const passedCount = tests.filter((t) => t.status === 'passed').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-[#13161f] border border-[#2b3144] shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-4 border-b border-[#222736] flex items-center justify-between bg-[#0e1017]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">System Diagnostics & Quality Control</h3>
              <p className="text-[11px] text-slate-400">
                14 Standar Verifikasi Sesuai Section 26 Quality Control
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={executeTests}
              disabled={isRunning}
              className="p-1.5 rounded-lg bg-[#1a1e29] hover:bg-[#252b3b] text-slate-300 text-xs flex items-center gap-1 border border-[#2b3040] transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin text-amber-400' : ''}`} />
              <span className="text-[11px] hidden sm:inline">Ulangi Tes</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[#1f2433] text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Score Summary */}
        <div className="px-5 py-3 bg-[#171a24] border-b border-[#222736] flex items-center justify-between text-xs">
          <span className="text-slate-300">
            Hasil Evaluasi: <strong className="text-amber-400">{passedCount} / {tests.length}</strong> Tes Lulus
          </span>
          <span
            className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
              passedCount === tests.length
                ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-400'
                : 'bg-amber-950/60 border border-amber-500/40 text-amber-400'
            }`}
          >
            {passedCount === tests.length ? 'ALL SYSTEMS COMPLIANT' : 'CHECK PENDING'}
          </span>
        </div>

        {/* Test List */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
          {tests.map((test) => (
            <div
              key={test.id}
              className="p-3 rounded-xl bg-[#0f1118] border border-[#202534] flex items-start gap-3"
            >
              {test.status === 'passed' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-semibold text-xs text-white">{test.id}: {test.title}</span>
                  <span
                    className={`text-[10px] font-mono uppercase font-bold px-1.5 py-0.2 rounded ${
                      test.status === 'passed' ? 'text-emerald-400 bg-emerald-950/50' : 'text-rose-400 bg-rose-950/50'
                    }`}
                  >
                    {test.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono leading-relaxed break-words">
                  {test.details}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#222736] bg-[#0e1017] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#1d222e] hover:bg-[#282e3e] text-xs font-semibold text-slate-200 transition"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};

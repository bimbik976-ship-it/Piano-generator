import React, { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RefreshCw,
  Terminal,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';
import {
  KieConnectionTestResult,
  ConnectionTestSummary,
  MODEL_TEST_ORDER
} from '../services/kieConnectionTester';

interface KieConnectionTestCardProps {
  summary: ConnectionTestSummary | null;
  isRunning: boolean;
  testingStep?: { currentModel: string; step: number; total: number } | null;
  onRunTest: () => void;
  activeKeyPresent: boolean;
}

export const KieConnectionTestCard: React.FC<KieConnectionTestCardProps> = ({
  summary,
  isRunning,
  testingStep,
  onRunTest,
  activeKeyPresent,
}) => {
  const [showSafeBody, setShowSafeBody] = useState<Record<string, boolean>>({});

  const toggleSafeBody = (modelId: string) => {
    setShowSafeBody(prev => ({ ...prev, [modelId]: !prev[modelId] }));
  };

  return (
    <div className="rounded-2xl bg-[#131620] border border-[#262c3e] overflow-hidden shadow-xl">
      {/* Card Header */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-[#171a25] to-[#14161f] border-b border-[#24293a] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm text-white tracking-wide">
                KIE CONNECTION TEST
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold tracking-wider bg-[#1f2434] text-slate-300 border border-[#2f374e]">
                DIAGNOSTIC (ALL 3 MODELS)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              POST https://api.kie.ai/codex/v1/responses
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {summary && (
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full border ${
                summary.overallStatus === 'ALL PASSED'
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
                  : summary.overallStatus === 'PARTIAL SUCCESS'
                  ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                  : 'bg-rose-950/60 border-rose-500/40 text-rose-400'
              }`}
            >
              {summary.overallStatus === 'ALL PASSED' && `✅ ALL PASSED (3/3)`}
              {summary.overallStatus === 'PARTIAL SUCCESS' && `⚠️ PARTIAL SUCCESS (${summary.passedCount}/${summary.totalCount} PASSED)`}
              {summary.overallStatus === 'ALL FAILED' && `❌ ALL FAILED (0/3)`}
            </span>
          )}

          <button
            onClick={onRunTest}
            disabled={isRunning || !activeKeyPresent}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-[#202534] text-black disabled:text-slate-500 font-bold text-xs transition shadow-[0_0_15px_rgba(245,158,11,0.2)]"
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>
                  {testingStep ? `Menguji ${testingStep.step}/${testingStep.total}...` : 'Running Test...'}
                </span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{summary ? 'Ulangi KIE Test (3 Model)' : 'Run Connection Test'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 sm:p-5 space-y-4">
        {!activeKeyPresent && (
          <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold mb-0.5">API Key Belum Tersedia</div>
              <div>Masukkan minimal satu KIE API key aktif pada tab <strong>API KEY</strong> untuk menjalankan internal connection test.</div>
            </div>
          </div>
        )}

        {/* Progress indicator when running */}
        {isRunning && (
          <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300 animate-pulse">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
              <span>
                Sedang menguji minimal payload secara berurutan: <strong>{testingStep?.currentModel || 'KIE Models'}</strong> ({testingStep?.step || 1}/3)...
              </span>
            </div>
            <span className="font-mono text-[11px] text-amber-400">DO NOT ROTATE KEY ON 500</span>
          </div>
        )}

        {/* Summary diagnosis banner */}
        {summary && (
          <div
            className={`p-3.5 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
              summary.overallStatus === 'ALL PASSED'
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                : summary.overallStatus === 'PARTIAL SUCCESS'
                ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                : 'bg-rose-950/20 border-rose-500/30 text-rose-200'
            }`}
          >
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold">
                HASIL DIAGNOSTIK:{' '}
                <span className="font-mono">
                  {summary.overallStatus} ({summary.passedCount} dari {summary.totalCount} Model Merespons OK)
                </span>
              </div>
              <div>
                {summary.overallStatus === 'ALL PASSED' && (
                  <span>Semua 3 model (GPT-6 Astra, GPT-5.6 Luna, GPT-5.5) berhasil terhubung ke KIE Gateway dengan HTTP 200.</span>
                )}
                {summary.overallStatus === 'PARTIAL SUCCESS' && (
                  <span>
                    Ditemukan model yang merespons <strong>HTTP 200 (PASSED)</strong>. Model yang mengembalikan <strong>HTTP 500</strong> adalah masalah server/gateway pada model tersebut, <strong>bukan API key habis</strong>. API key Anda valid dan aktif.
                  </span>
                )}
                {summary.overallStatus === 'ALL FAILED' && (
                  <span>
                    Semua 3 model mengembalikan error. Periksa kode status masing-masing di bawah (apakah 401 Invalid Key, 429 Rate Limit, atau 500 Gateway Server Error).
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Not run yet message */}
        {!summary && !isRunning && activeKeyPresent && (
          <div className="p-4 rounded-xl bg-[#0e1017] border border-[#202534] text-center space-y-2">
            <div className="text-xs text-slate-300 font-medium">
              Uji ketiga model (GPT-6 Astra, GPT-5.6 Luna, GPT-5.5) secara independen dengan payload ultra-minimal.
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Jika GPT-6 Astra mengembalikan HTTP 500, pengujian akan tetap berlanjut ke GPT-5.6 Luna dan GPT-5.5 tanpa rotasi API key.
            </div>
          </div>
        )}

        {/* The 3 Model Individual Results */}
        {summary && summary.results.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {summary.results.map((res) => {
              const isSuccess = res.success;
              const isShownBody = !!showSafeBody[res.gatewayId];

              return (
                <div
                  key={res.gatewayId}
                  className={`rounded-xl border p-4 space-y-3 flex flex-col justify-between transition ${
                    isSuccess
                      ? 'bg-[#0f141f] border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.06)]'
                      : res.httpStatus === 500
                      ? 'bg-[#18131a] border-amber-500/40'
                      : 'bg-[#181014] border-rose-500/40'
                  }`}
                >
                  {/* Model Header */}
                  <div className="space-y-1.5 border-b border-[#222736] pb-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-sm text-white">{res.modelName}</h4>
                      <span
                        className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          isSuccess
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        {isSuccess ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>✅ PASSED</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-rose-400" />
                            <span>❌ FAILED</span>
                          </>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span className="bg-[#0b0d13] px-2 py-0.5 rounded border border-[#1f2536] text-slate-300">
                        {res.gatewayId}
                      </span>
                      {res.latencyMs !== undefined && (
                        <span className="flex items-center gap-1 text-slate-500">
                          <Zap className="w-3 h-3 text-amber-400/80" />
                          <span>{res.latencyMs} ms</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* HTTP Status & Diagnostic Category */}
                  <div className="space-y-2 flex-grow">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400">HTTP STATUS:</span>
                      <strong className={`px-2 py-0.5 rounded ${
                        isSuccess ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                      }`}>
                        {res.httpStatus}
                      </strong>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#0b0d14] border border-[#1e2436] space-y-1">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        DIAGNOSTIC RESULT:
                      </div>
                      <div
                        className={`text-xs font-bold font-mono ${
                          isSuccess
                            ? 'text-emerald-300'
                            : res.httpStatus === 500
                            ? 'text-amber-300'
                            : 'text-rose-300'
                        }`}
                      >
                        {res.diagnosticCategory}
                      </div>
                    </div>

                    {/* Returned text preview if 200 */}
                    {isSuccess && res.returnedText && (
                      <div className="p-2 rounded bg-emerald-950/20 border border-emerald-500/20 font-mono text-[11px] text-emerald-300">
                        <span className="text-slate-400 text-[10px] uppercase block">Returned Text:</span>
                        <div className="truncate font-semibold">{res.returnedText}</div>
                      </div>
                    )}
                  </div>

                  {/* Safe response body expandable button */}
                  {res.sanitizedResponseBody && (
                    <div className="pt-2 border-t border-[#1f2435] text-[11px]">
                      <button
                        onClick={() => toggleSafeBody(res.gatewayId)}
                        className="text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition font-mono"
                      >
                        <Terminal className="w-3 h-3 text-amber-400" />
                        <span>{isShownBody ? 'Tutup Response Body' : 'Safe Response Body'}</span>
                      </button>

                      {isShownBody && (
                        <div className="mt-2 p-2.5 rounded-lg bg-[#08090e] border border-[#1e2334] font-mono text-[10px] text-slate-300 whitespace-pre-wrap max-h-36 overflow-y-auto">
                          {res.sanitizedResponseBody}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer info */}
        {summary && (
          <div className="pt-2 border-t border-[#222736] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>
                {summary.anyPassed
                  ? `Koneksi aktif terverifikasi (${summary.passedCount}/${summary.totalCount} model). API Key aman dan tidak dirotasi pada HTTP 500.`
                  : `Pengujian diagnostik selesai. Tidak ada rotasi API key pada HTTP 500.`}
              </span>
            </div>
            {summary.lastTestedAt && (
              <span className="text-[11px] font-mono text-slate-500">
                Terakhir Diuji: {summary.lastTestedAt}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

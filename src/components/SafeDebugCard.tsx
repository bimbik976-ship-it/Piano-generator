import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { SafeDebugInfo } from '../types';

interface SafeDebugCardProps {
  debugInfo: SafeDebugInfo;
  onRetry?: () => void;
}

export const SafeDebugCard: React.FC<SafeDebugCardProps> = ({ debugInfo, onRetry }) => {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const debugText = `
${debugInfo.endpoint ? `Endpoint: ${debugInfo.endpoint}\n` : ''}Model: ${debugInfo.selectedModel}
Model ID: ${debugInfo.gatewayModelId}
HTTP: ${debugInfo.httpStatus ?? 'N/A'}
Error: ${debugInfo.errorType}
Error Message: ${debugInfo.errorMessage}
Time: ${debugInfo.time}
Attempt: ${debugInfo.attempt ?? 1}${debugInfo.sanitizedResponseBody ? `\nServer Response: ${debugInfo.sanitizedResponseBody}` : ''}
`.trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(debugText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 text-slate-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-rose-400">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span className="font-bold text-sm">Safe Diagnostic Log ({debugInfo.errorType})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            className="p-1 rounded bg-[#1f2430] hover:bg-[#2b3140] text-slate-300 text-xs flex items-center gap-1 px-2 transition"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span className="text-[10px]">{copied ? 'Copied' : 'Copy Log'}</span>
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded bg-[#1f2430] hover:bg-[#2b3140] text-slate-300 text-xs"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <p className="text-xs text-rose-200/90 mb-3">{debugInfo.errorMessage}</p>

      {expanded && (
        <div className="rounded-lg bg-[#0d0f14] border border-[#222736] p-3 font-mono text-[11px] space-y-1.5">
          {debugInfo.endpoint && (
            <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5">
              <span className="text-slate-500">Endpoint:</span>
              <span className="text-amber-400 break-all">{debugInfo.endpoint}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-500">Model:</span>
            <span className="text-slate-200">{debugInfo.selectedModel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Model ID:</span>
            <span className="text-amber-400 font-semibold">{debugInfo.gatewayModelId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">HTTP:</span>
            <span className="text-slate-200">{debugInfo.httpStatus ?? 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Error:</span>
            <span className="text-rose-400 font-bold">{debugInfo.errorType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Time:</span>
            <span className="text-slate-300">{debugInfo.time}</span>
          </div>
          {debugInfo.sanitizedResponseBody && (
            <div className="pt-2 border-t border-[#1d2230] space-y-1">
              <div className="text-[10px] uppercase font-bold text-amber-400">Sanitized Server Response Body:</div>
              <pre className="p-2 rounded bg-[#07080b] border border-[#1b1f2b] text-[10px] text-slate-300 font-mono overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
                {debugInfo.sanitizedResponseBody}
              </pre>
            </div>
          )}
          <div className="pt-2 border-t border-[#1d2230] text-[10px] text-emerald-400/80">
            [Safe Shield: No API Keys or authorization credentials are ever logged or exposed.]
          </div>
        </div>
      )}

      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 w-full py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition"
        >
          Coba Lagi (Retry Generation)
        </button>
      )}
    </div>
  );
};

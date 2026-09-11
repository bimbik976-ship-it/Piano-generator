import React, { useState } from 'react';
import {
  KeyRound,
  ShieldAlert,
  Plus,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff,
  RotateCw,
  RefreshCw,
  Cpu,
  AlertCircle,
  Sparkles,
  ChevronDown,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { ApiKeyItem, ApiKeyStatus, RoutingMode } from '../types';
import { MODEL_CONFIG } from '../config/models';
import { ApiKeyManager } from '../services/apiKeyManager';

interface ApiManagerViewProps {
  keys: ApiKeyItem[];
  routingMode: RoutingMode;
  onSetRoutingMode: (mode: RoutingMode) => void;
  onAddKey: (rawKey: string, name?: string) => void;
  onAddMultipleKeys: (rawKeysText: string) => {
    addedCount: number;
    duplicateCount: number;
    invalidCount: number;
    message: string;
  };
  onRemoveKey: (id: string) => void;
  onClearAllKeys: () => void;
  onToggleActive: (id: string, active?: boolean) => void;
  onTestKey: (key: ApiKeyItem) => Promise<void>;
  onCheckAllBalances: () => Promise<void>;
  onSelectManualKey: (id: string) => void;
  manualSelectedKeyId?: string | null;
  onOpenQC: () => void;
}

export const ApiManagerView: React.FC<ApiManagerViewProps> = ({
  keys,
  routingMode,
  onSetRoutingMode,
  onAddKey,
  onAddMultipleKeys,
  onRemoveKey,
  onClearAllKeys,
  onToggleActive,
  onTestKey,
  onCheckAllBalances,
  onSelectManualKey,
  manualSelectedKeyId,
  onOpenQC,
}) => {
  // Input states
  const [multiKeyInput, setMultiKeyInput] = useState('');
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);
  const [isCheckingAll, setIsCheckingAll] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [keyToDelete, setKeyToDelete] = useState<ApiKeyItem | null>(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [showCopyAllModal, setShowCopyAllModal] = useState(false);

  // ApiKeyManager instance for status calculations
  const keyMgr = ApiKeyManager.getInstance();
  const summary = keyMgr.getTotalBalanceInfo();
  const fallbackChain = keyMgr.getFallbackChain();
  const activeKeysCount = keys.filter((k) => k.isActive).length;
  const isApiReady = activeKeysCount > 0;

  // Notification helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3500);
  };

  // Safe clipboard helper
  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // fallback for constrained iframes
    }
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    } catch {
      return false;
    }
  };

  // Handle single key copy
  const handleCopySingleKey = async (key: ApiKeyItem) => {
    const success = await copyToClipboard(key.rawKey);
    if (success) {
      setCopiedKeyId(key.id);
      showToast('API Key disalin');
      setTimeout(() => {
        setCopiedKeyId((current) => (current === key.id ? null : current));
      }, 2000);
    } else {
      showToast('Gagal menyalin ke clipboard');
    }
  };

  // Handle copy all keys
  const handleConfirmCopyAll = async () => {
    setShowCopyAllModal(false);
    if (keys.length === 0) {
      showToast('Tidak ada API key untuk disalin');
      return;
    }
    const allKeysText = keys.map((k) => k.rawKey).join('\n');
    const success = await copyToClipboard(allKeysText);
    if (success) {
      showToast(`Semua (${keys.length}) API Key disalin ke clipboard`);
    } else {
      showToast('Gagal menyalin ke clipboard');
    }
  };

  // Handle multi-key submission
  const handleAddMultipleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!multiKeyInput.trim()) {
      showToast('Masukkan minimal satu API key');
      return;
    }
    const result = onAddMultipleKeys(multiKeyInput);
    showToast(result.message);
    if (result.addedCount > 0) {
      setMultiKeyInput('');
    }
  };

  // Handle checking all balances
  const handleCheckAllClick = async () => {
    if (keys.length === 0) {
      showToast('Belum ada API Key yang tersimpan');
      return;
    }
    setIsCheckingAll(true);
    showToast('Memeriksa saldo...');
    try {
      await onCheckAllBalances();
      showToast('Saldo diperbarui');
    } catch (err: any) {
      showToast(err.message || 'Gagal memeriksa saldo');
    } finally {
      setIsCheckingAll(false);
    }
  };

  // Handle test single key
  const handleTestKeyClick = async (key: ApiKeyItem) => {
    setTestingKeyId(key.id);
    try {
      await onTestKey(key);
      showToast(`Key ${key.name} selesai diuji`);
    } catch (err: any) {
      showToast(err.message || 'Gagal menguji key');
    } finally {
      setTestingKeyId(null);
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (key: ApiKeyItem, index: number) => {
    const isCurrentActive =
      routingMode === 'MANUAL'
        ? (manualSelectedKeyId || keys[0]?.id) === key.id
        : summary.currentActiveKeyIndex === index + 1;

    let displayStatus: ApiKeyStatus = key.status;
    if (displayStatus === 'CHECKING') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-amber-950/50 text-amber-300 border border-amber-500/40">
          <RotateCw className="w-2.5 h-2.5 animate-spin" />
          CHECKING
        </span>
      );
    }

    if (displayStatus === 'INVALID' || displayStatus === 'invalid') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-rose-950/50 text-rose-400 border border-rose-500/30">
          <XCircle className="w-2.5 h-2.5" />
          INVALID
        </span>
      );
    }

    if (displayStatus === 'RATE LIMITED' || displayStatus === 'rate_limited') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-amber-950/50 text-amber-400 border border-amber-500/30">
          <AlertTriangle className="w-2.5 h-2.5" />
          RATE LIMITED
        </span>
      );
    }

    if (displayStatus === 'EXHAUSTED') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-rose-950/50 text-rose-300 border border-rose-500/30">
          <AlertCircle className="w-2.5 h-2.5" />
          EXHAUSTED
        </span>
      );
    }

    if (displayStatus === 'ERROR') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-rose-950/50 text-rose-400 border border-rose-500/30">
          <AlertCircle className="w-2.5 h-2.5" />
          ERROR
        </span>
      );
    }

    // Usable key status
    if (key.isActive) {
      if (isCurrentActive) {
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-950/50 text-emerald-400 border border-emerald-500/40">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ACTIVE
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-slate-800/60 text-slate-300 border border-slate-700">
          STANDBY
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-slate-900 text-slate-500 border border-slate-800">
        NONAKTIF
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-28 max-w-4xl mx-auto">
      {/* Toast / Notification Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#171b26] border border-amber-500/40 text-amber-300 shadow-xl text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Security Warning Notice */}
      <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 sm:p-5 text-amber-200 flex items-start gap-3.5">
        <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <h4 className="font-bold text-white text-sm">Security & Secret Management Protocol</h4>
          <p className="text-amber-200/90 leading-relaxed">
            API key disimpan secara lokal pada browser client (localStorage) dan dikirimkan secara rahasia melalui secure backend proxy ke KIE Gateway.
            Kunci API Anda selalu disamarkan secara default (<span className="font-mono text-white">sk-••••••••••1234</span>) dan <strong>tidak pernah</strong> dimasukkan ke dalam prompt, logs publik, error message, maupun Tracklist.
          </p>
        </div>
      </div>

      {/* Section 4: Compact API STATUS SUMMARY Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#171a24] to-[#14161f] border border-[#272d3e] p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isApiReady ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span
                className={`font-mono text-xs uppercase font-extrabold px-2 py-0.5 rounded border ${
                  isApiReady
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}
              >
                {isApiReady ? 'API SIAP' : 'API BELUM SIAP'}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                • {keys.length} kunci lokal ({activeKeysCount} aktif)
              </span>
            </div>

            {/* Total Balance Calculation (Section 4, 18, 19) */}
            <div className="flex flex-wrap items-baseline gap-2">
              {summary.hasGatewayBalance ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl font-black text-white">
                    {summary.knownGatewayTotal} kredit
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded">
                    Gateway
                  </span>
                  {summary.unknownGatewayCount > 0 && (
                    <span className="text-xs text-slate-400">
                      ({summary.unknownGatewayCount} saldo belum diketahui)
                    </span>
                  )}
                </div>
              ) : (
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-300">
                      Saldo gateway:
                    </span>
                    <span className="text-xs text-slate-400 italic">
                      Saldo belum tersedia dari gateway
                    </span>
                  </div>
                  {keys.length > 0 && (
                    <div className="text-xs text-amber-400 font-mono">
                      Estimasi lokal: {summary.totalEstimatedRemaining} kredit tersisa (berdasarkan awal 80)
                    </div>
                  )}
                </div>
              )}
            </div>

            <p className="text-xs text-slate-400 mt-2">
              Current Key:{' '}
              <strong className="text-amber-400 font-mono">
                {summary.currentActiveKeyLabel !== 'None' ? summary.currentActiveKeyLabel : 'Tidak ada key aktif'}
              </strong>{' '}
              • Mode: <strong className="text-white">{routingMode}</strong>
            </p>
          </div>

          {/* Quick Actions in Header Banner */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCheckAllClick}
              disabled={isCheckingAll || keys.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#202534] hover:bg-[#2c3347] border border-[#343b52] text-xs font-semibold text-slate-200 transition disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isCheckingAll ? 'animate-spin text-amber-400' : 'text-amber-400'}`} />
              <span>{isCheckingAll ? 'Memeriksa...' : 'Cek Saldo'}</span>
            </button>

            <button
              onClick={onOpenQC}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#202534] hover:bg-[#2c3347] border border-[#343b52] text-xs font-semibold text-slate-200 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Jalankan QC</span>
            </button>
          </div>
        </div>
      </div>

      {/* Section 5: API Key Settings (Pengaturan API Key) */}
      <div className="rounded-2xl bg-[#141720] border border-[#252a3a] p-5">
        <h3 className="font-bold text-sm text-white mb-4 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-amber-400" />
          <span>Pengaturan API Key</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Provider Card */}
          <div className="p-3.5 rounded-xl bg-[#0f1118] border border-[#202534] flex items-center justify-between">
            <div>
              <span className="block text-[11px] text-slate-400">Gateway Provider</span>
              <span className="font-bold text-sm text-white">KIE.AI</span>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold font-mono">
              OFFICIAL
            </span>
          </div>

          {/* Routing Mode Card */}
          <div className="p-3.5 rounded-xl bg-[#0f1118] border border-[#202534] flex items-center justify-between">
            <div>
              <span className="block text-[11px] text-slate-400">Routing Mode</span>
              <span className="font-bold text-sm text-white">{routingMode}</span>
            </div>
            <div className="flex rounded-lg bg-[#181c28] p-1 border border-[#282f42]">
              <button
                onClick={() => onSetRoutingMode('AUTO')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                  routingMode === 'AUTO'
                    ? 'bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                AUTO
              </button>
              <button
                onClick={() => onSetRoutingMode('MANUAL')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                  routingMode === 'MANUAL'
                    ? 'bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                MANUAL
              </button>
            </div>
          </div>
        </div>

        {/* Section 20: MANUAL Routing Key Selector */}
        {routingMode === 'MANUAL' && (
          <div className="mt-4 p-4 rounded-xl bg-[#0f1118] border border-amber-500/30 space-y-2 animate-in fade-in duration-150">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Pilih Kunci Utama (MANUAL Routing):
                </h4>
                <p className="text-[11px] text-slate-400">
                  Dalam mode MANUAL, request generasi hanya menggunakan kunci yang dipilih secara spesifik tanpa rotasi otomatis.
                </p>
              </div>

              {keys.length > 0 ? (
                <div className="relative">
                  <select
                    value={manualSelectedKeyId || keys[0]?.id}
                    onChange={(e) => onSelectManualKey(e.target.value)}
                    className="w-full sm:w-auto bg-[#181c28] border border-[#2c3347] text-amber-300 font-mono text-xs rounded-xl px-3 py-2 pr-8 focus:outline-none focus:border-amber-500 transition appearance-none cursor-pointer"
                  >
                    {keys.map((k, idx) => (
                      <option key={k.id} value={k.id}>
                        #{idx + 1} - {k.name} ({k.maskedKey})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
                </div>
              ) : (
                <span className="text-xs text-rose-400">Belum ada kunci terdaftar</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Section 6 & 27: API Key Pool & Controls */}
      <div className="rounded-2xl bg-[#141720] border border-[#252a3a] p-5 space-y-4">
        {/* Pool Header & Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222736] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-sm text-white">
                Daftar key tersimpan ({keys.length} key)
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">
              {routingMode === 'AUTO'
                ? 'Rotasi otomatis & fallback adaptif aktif'
                : 'Kunci manual terpilih digunakan secara langsung'}
            </span>
          </div>

          {/* Action Toolbar: Show/Hide, Cek saldo, Copy semua, Hapus semua */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Show/Hide Toggle (Section 7) */}
            <button
              onClick={() => setShowKeys(!showKeys)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#181b26] hover:bg-[#232738] border border-[#2b3144] text-xs font-semibold text-slate-200 transition"
              title={showKeys ? 'Sembunyikan karakter API Key' : 'Tampilkan karakter API Key'}
            >
              {showKeys ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sembunyikan</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                  <span>Tampilkan</span>
                </>
              )}
            </button>

            {/* Cek Saldo Button (Section 11) */}
            <button
              onClick={handleCheckAllClick}
              disabled={isCheckingAll || keys.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#181b26] hover:bg-[#232738] border border-[#2b3144] text-xs font-semibold text-slate-200 transition disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isCheckingAll ? 'animate-spin text-amber-400' : 'text-amber-400'}`} />
              <span>{isCheckingAll ? 'Memeriksa...' : 'Cek saldo'}</span>
            </button>

            {/* Copy Semua Button (Section 8) */}
            <button
              onClick={() => setShowCopyAllModal(true)}
              disabled={keys.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#181b26] hover:bg-[#232738] border border-[#2b3144] text-xs font-semibold text-slate-200 transition disabled:opacity-50"
            >
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Copy semua</span>
            </button>

            {/* Hapus Semua Button (Section 9) */}
            <button
              onClick={() => setShowDeleteAllModal(true)}
              disabled={keys.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-rose-950/40 border border-rose-500/20 text-xs font-semibold text-rose-400 transition disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus semua</span>
            </button>
          </div>
        </div>

        {/* Section 28: EMPTY STATE */}
        {keys.length === 0 ? (
          <div className="p-8 rounded-xl bg-[#0e1017] border border-[#202534] text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Belum ada API Key</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Tambahkan API Key KIE.AI untuk mulai menggunakan generator.
              </p>
            </div>
            <button
              onClick={() => {
                const el = document.getElementById('multi-key-textarea');
                el?.focus();
              }}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-[0_0_15px_rgba(245,158,11,0.25)] transition inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambahkan API Key</span>
            </button>
          </div>
        ) : (
          /* Section 6: Key List Rows */
          <div className="space-y-3">
            {keys.map((key, index) => {
              const isTesting = testingKeyId === key.id;
              const isCopied = copiedKeyId === key.id;

              return (
                <div
                  key={key.id}
                  className="p-4 rounded-xl bg-[#0f1118] border border-[#202534] hover:border-[#2b3246] transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-extrabold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                        #{index + 1}
                      </span>
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold border border-slate-700">
                        {key.provider || 'KIE'}
                      </span>
                      <span className="font-bold text-xs text-white truncate max-w-[200px]">
                        {key.name}
                      </span>
                      {renderStatusBadge(key, index)}
                    </div>

                    {/* Masked / Actual Key Display (Section 7) */}
                    <div className="font-mono text-xs text-amber-300/90 font-semibold tracking-wider select-all break-all">
                      {showKeys ? key.rawKey : key.maskedKey}
                    </div>

                    {/* Balance & Token Accounting (Section 18 & 19) */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      {typeof key.gatewayBalance === 'number' ? (
                        <span className="font-semibold text-emerald-400">
                          {key.gatewayBalance} kredit (Gateway)
                        </span>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1 text-slate-400">
                          <span>
                            {key.startingBalance ?? 80} starting • {key.usedTokens ?? 0} used •{' '}
                            <strong className="text-amber-400">
                              {key.estimatedRemaining ?? 80} sisa
                            </strong>{' '}
                            <span className="text-[10px] text-slate-400">(Estimasi Lokal)</span>
                          </span>
                        </div>
                      )}

                      {key.balanceCheckMessage && (
                        <span className="text-[10px] text-slate-400 italic">
                          • {key.balanceCheckMessage}
                        </span>
                      )}
                    </div>

                    {key.lastError && (
                      <p className="text-[11px] text-rose-400 font-mono">
                        Error: {key.lastError}
                      </p>
                    )}
                  </div>

                  {/* Key Actions: Copy, Toggle Active, Test, Delete */}
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-[#1c202e] flex-shrink-0">
                    {/* Copy Single Key (Section 8) */}
                    <button
                      onClick={() => handleCopySingleKey(key)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#1a1e2a] hover:bg-[#252b3b] border border-[#2b3144] text-slate-300 text-xs flex items-center gap-1 transition"
                      title="Salin API Key ini"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-semibold">Disalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    {/* Test / Check Single Key */}
                    <button
                      onClick={() => handleTestKeyClick(key)}
                      disabled={isTesting}
                      className="px-2.5 py-1.5 rounded-lg bg-[#1a1e2a] hover:bg-[#252b3b] border border-[#2b3144] text-slate-300 text-xs flex items-center gap-1 transition disabled:opacity-50"
                      title="Uji konektivitas key ini"
                    >
                      <RotateCw className={`w-3 h-3 ${isTesting ? 'animate-spin text-amber-400' : 'text-slate-400'}`} />
                      <span>{isTesting ? 'Menguji...' : 'Uji'}</span>
                    </button>

                    {/* Active/Inactive Toggle */}
                    <button
                      onClick={() => onToggleActive(key.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                        key.isActive
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-slate-800 text-slate-500 border-slate-700'
                      }`}
                      title={key.isActive ? 'Klik untuk menonaktifkan' : 'Klik untuk mengaktifkan'}
                    >
                      {key.isActive ? 'Aktif' : 'Off'}
                    </button>

                    {/* Delete Single Key (Section 9) */}
                    <button
                      onClick={() => setKeyToDelete(key)}
                      className="p-1.5 rounded-lg hover:bg-rose-950/50 text-slate-500 hover:text-rose-400 transition"
                      title="Hapus API Key ini"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Section 27: AUTO FALLBACK CHAIN Status Block */}
        {keys.length > 0 && routingMode === 'AUTO' && (
          <div className="rounded-xl bg-[#0c0e14] border border-[#202534] p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                AUTO FALLBACK CHAIN
              </h4>
            </div>

            {fallbackChain.length > 0 ? (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Current:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {fallbackChain[0].name} ({fallbackChain[0].maskedKey})
                  </span>
                </div>

                {fallbackChain.length > 1 && (
                  <div className="text-xs space-y-1 pt-1 border-t border-[#1a1e2a]">
                    <span className="text-[11px] text-slate-400">
                      Jika kuota habis atau rate limit:
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {fallbackChain.slice(1).map((k) => (
                        <div key={k.id} className="flex items-center gap-1 text-[11px] text-slate-300 font-mono bg-[#161a26] px-2 py-0.5 rounded border border-[#252b3d]">
                          <ArrowRight className="w-3 h-3 text-amber-400" />
                          <span>{k.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>
                  Semua API Key KIE telah mencapai batas penggunaan atau tidak dapat digunakan. Tambahkan API Key baru untuk melanjutkan.
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section 10: ADD MULTIPLE API KEYS Form */}
      <div className="rounded-2xl bg-[#141720] border border-[#252a3a] p-5 space-y-3">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <Plus className="w-4 h-4 text-amber-400" />
          <span>Tambah API Key KIE.AI</span>
        </h3>

        <p className="text-xs text-slate-400 leading-relaxed">
          Mendukung penambahan banyak API Key sekaligus. Masukkan <strong>satu API Key per baris</strong>.
          Sistem secara otomatis membersihkan spasi, memvalidasi format, mengabaikan duplikat, dan mengamankan kunci ke local storage.
        </p>

        <form onSubmit={handleAddMultipleSubmit} className="space-y-3 pt-1">
          <div>
            <textarea
              id="multi-key-textarea"
              rows={4}
              placeholder={`sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\nsk-yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy\nsk-zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz`}
              value={multiKeyInput}
              onChange={(e) => setMultiKeyInput(e.target.value)}
              className="w-full bg-[#0d0f14] border border-[#262c3d] rounded-xl p-3 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition resize-y"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400 font-mono">
              Format: sk-... (1 key per baris)
            </span>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-[0_0_15px_rgba(245,158,11,0.25)] transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambahkan API Key</span>
            </button>
          </div>
        </form>
      </div>

      {/* Existing Centralized Gateway Models Specifications (Preserved) */}
      <div className="rounded-2xl bg-[#141720] border border-[#252a3a] p-5">
        <h3 className="font-bold text-sm text-white mb-3 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-amber-400" />
          <span>Spesifikasi Gateway Model Resmi (KIE.AI)</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#222736] text-slate-400 font-mono text-[11px]">
                <th className="py-2 px-3">Nama Model UI</th>
                <th className="py-2 px-3">Gateway Model ID</th>
                <th className="py-2 px-3">Peran Musikal</th>
                <th className="py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2330]">
              {Object.entries(MODEL_CONFIG).map(([id, cfg]) => (
                <tr key={id} className="hover:bg-[#181c27]">
                  <td className="py-2.5 px-3 font-bold text-white">{cfg.uiName}</td>
                  <td className="py-2.5 px-3 font-mono text-amber-400 font-semibold">{cfg.gatewayId}</td>
                  <td className="py-2.5 px-3 text-slate-300">{cfg.description}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/50 text-emerald-400 border border-emerald-500/30">
                      Resmi
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal: Delete Single Key (Section 9) */}
      {keyToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-[#141720] border border-[#2c3142] p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-white">Hapus API Key ini?</h3>
              <p className="text-xs text-slate-300 font-mono break-all">
                {keyToDelete.name} ({keyToDelete.maskedKey})
              </p>
              <p className="text-[11px] text-slate-400 pt-1">
                Kunci akan dihapus dari penyimpanan lokal peramban Anda.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setKeyToDelete(null)}
                className="py-2.5 px-4 rounded-xl bg-[#1d212d] hover:bg-[#272d3d] text-slate-300 font-medium text-xs transition"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  onRemoveKey(keyToDelete.id);
                  setKeyToDelete(null);
                  showToast('API Key dihapus');
                }}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete All Keys (Section 9) */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-[#141720] border border-[#2c3142] p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-white">Hapus semua API Key?</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Seluruh <strong>{keys.length} API Key</strong> akan dihapus permanen dari penyimpanan lokal Anda. Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setShowDeleteAllModal(false)}
                className="py-2.5 px-4 rounded-xl bg-[#1d212d] hover:bg-[#272d3d] text-slate-300 font-medium text-xs transition"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  onClearAllKeys();
                  setShowDeleteAllModal(false);
                  showToast('Seluruh API Key telah dihapus');
                }}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition"
              >
                Hapus Semua
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Copy All Keys (Section 8) */}
      {showCopyAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-[#141720] border border-[#2c3142] p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
              <Copy className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-white">Salin semua API Key?</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Menyalin seluruh <strong>{keys.length} API Key</strong> ke clipboard peramban (satu kunci per baris).
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setShowCopyAllModal(false)}
                className="py-2.5 px-4 rounded-xl bg-[#1d212d] hover:bg-[#272d3d] text-slate-300 font-medium text-xs transition"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmCopyAll}
                className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-[0_0_15px_rgba(245,158,11,0.25)] transition"
              >
                Ya, Salin Semua
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Navigation, TabId } from './components/Navigation';
import { PetaGeneratorView } from './components/PetaGeneratorView';
import { TracklistView } from './components/TracklistView';
import { ApiManagerView } from './components/ApiManagerView';
import { NewBatchModal } from './components/NewBatchModal';
import { QCModal } from './components/QCModal';

import {
  ApiKeyItem,
  BatchState,
  GatewayModelId,
  GeneratedTrackResult,
  GeneratorSettings,
  RoutingMode,
  SafeDebugInfo
} from './types';
import { DEFAULT_SETTINGS } from './config/options';
import { DEFAULT_MODEL_ID } from './config/models';
import { ApiKeyManager } from './services/apiKeyManager';
import { BatchManager } from './services/batchManager';
import { TracklistStore } from './services/tracklistStore';
import { executeGeneration } from './services/kieClient';
import { fetchKieCredit } from './services/creditChecker';
import { useOnlineStatus } from './hooks/usePWA';

const SETTINGS_STORAGE_KEY = 'peta_piano_settings';
const MODEL_STORAGE_KEY = 'peta_piano_selected_model';

export default function App() {
  const isOnline = useOnlineStatus();
  const [activeTab, setActiveTab] = useState<TabId>('peta');

  // Core stores
  const [batchState, setBatchState] = useState<BatchState>(() =>
    BatchManager.getInstance().getState()
  );
  const [tracks, setTracks] = useState<GeneratedTrackResult[]>(() =>
    TracklistStore.getInstance().getTracks()
  );
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>(() =>
    ApiKeyManager.getInstance().getKeys()
  );
  const [routingMode, setRoutingMode] = useState<RoutingMode>(() =>
    ApiKeyManager.getInstance().getRoutingMode()
  );

  // Settings & Model Selection
  const [settings, setSettings] = useState<GeneratorSettings>(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return DEFAULT_SETTINGS;
  });

  const [selectedModelId, setSelectedModelId] = useState<GatewayModelId>(() => {
    try {
      const stored = localStorage.getItem(MODEL_STORAGE_KEY);
      if (stored === 'gpt-6-astra' || stored === 'gpt-5-6-luna' || stored === 'gpt-5-5') {
        return stored;
      }
    } catch {}
    return DEFAULT_MODEL_ID;
  });

  // Generation status state
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('VALIDATING MUSICAL OUTPUT...');
  const [debugInfo, setDebugInfo] = useState<SafeDebugInfo | null>(null);
  const [latestTrack, setLatestTrack] = useState<GeneratedTrackResult | null>(() => {
    const list = TracklistStore.getInstance().getTracks();
    return list.length > 0 ? list[0] : null;
  });

  // Modals
  const [showNewBatchModal, setShowNewBatchModal] = useState(false);
  const [showQCModal, setShowQCModal] = useState(false);

  // Sync settings changes to storage
  const handleUpdateSettings = (newSettings: GeneratorSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    } catch {}
  };

  // Sync model selection to storage
  const handleSelectModelId = (modelId: GatewayModelId) => {
    setSelectedModelId(modelId);
    try {
      localStorage.setItem(MODEL_STORAGE_KEY, modelId);
    } catch {}
  };

  // API Key handlers
  const handleAddKey = (rawKey: string, name?: string) => {
    const mgr = ApiKeyManager.getInstance();
    mgr.addKey(rawKey, name);
    setApiKeys(mgr.getKeys());
  };

  const handleAddMultipleKeys = (rawKeysText: string) => {
    const mgr = ApiKeyManager.getInstance();
    const result = mgr.addMultipleKeys(rawKeysText);
    setApiKeys(mgr.getKeys());
    return result;
  };

  const handleRemoveKey = (id: string) => {
    const mgr = ApiKeyManager.getInstance();
    mgr.removeKey(id);
    setApiKeys(mgr.getKeys());
  };

  const handleClearAllKeys = () => {
    const mgr = ApiKeyManager.getInstance();
    mgr.clearAllKeys();
    setApiKeys(mgr.getKeys());
  };

  const handleToggleActive = (id: string, active?: boolean) => {
    const mgr = ApiKeyManager.getInstance();
    mgr.toggleKeyActive(id, active);
    setApiKeys(mgr.getKeys());
  };

  const handleSetRoutingMode = (mode: RoutingMode) => {
    const mgr = ApiKeyManager.getInstance();
    mgr.setRoutingMode(mode);
    setRoutingMode(mode);
  };

  const handleSelectManualKey = (id: string) => {
    const mgr = ApiKeyManager.getInstance();
    mgr.setManualSelectedKeyId(id);
    setApiKeys(mgr.getKeys());
  };

  const handleTestKey = async (key: ApiKeyItem) => {
    const mgr = ApiKeyManager.getInstance();
    mgr.updateKeyStatus(key.id, 'CHECKING');
    setApiKeys(mgr.getKeys());

    try {
      const result = await fetchKieCredit(key.rawKey);
      const balanceMsg = result.gatewayBalance !== null ? undefined : 'Saldo tidak tersedia dari gateway';

      if (result.valid) {
        mgr.updateKeyStatus(key.id, 'ACTIVE', undefined, result.gatewayBalance, balanceMsg);
      } else if (result.status === 429) {
        mgr.updateKeyStatus(key.id, 'RATE LIMITED', result.message || 'Rate limit', result.gatewayBalance, balanceMsg);
      } else if (result.status === 401 || result.status === 403) {
        mgr.updateKeyStatus(key.id, 'INVALID', result.message || 'Invalid key', result.gatewayBalance, balanceMsg);
      } else {
        mgr.updateKeyStatus(key.id, 'ERROR', result.message || `Status: ${result.status}`, result.gatewayBalance, balanceMsg);
      }
    } catch (err: any) {
      mgr.updateKeyStatus(key.id, 'ERROR', err.message || 'Koneksi gagal', null, 'Saldo tidak tersedia dari gateway');
    }
    setApiKeys(mgr.getKeys());
  };

  const handleCheckAllBalances = async () => {
    const mgr = ApiKeyManager.getInstance();
    const allKeys = mgr.getKeys();
    if (allKeys.length === 0) return;

    for (const k of allKeys) {
      mgr.updateKeyStatus(k.id, 'CHECKING');
    }
    setApiKeys(mgr.getKeys());

    for (const k of allKeys) {
      try {
        const result = await fetchKieCredit(k.rawKey);
        const balanceMsg = result.gatewayBalance !== null ? undefined : 'Saldo tidak tersedia dari gateway';

        if (result.valid) {
          mgr.updateKeyStatus(k.id, 'ACTIVE', undefined, result.gatewayBalance, balanceMsg);
        } else if (result.status === 429) {
          mgr.updateKeyStatus(k.id, 'RATE LIMITED', result.message || 'Rate limit', result.gatewayBalance, balanceMsg);
        } else if (result.status === 401 || result.status === 403) {
          mgr.updateKeyStatus(k.id, 'INVALID', result.message || 'Invalid key', result.gatewayBalance, balanceMsg);
        } else {
          mgr.updateKeyStatus(k.id, 'ERROR', result.message || `Status: ${result.status}`, result.gatewayBalance, balanceMsg);
        }
      } catch (err: any) {
        mgr.updateKeyStatus(k.id, 'ERROR', err.message || 'Koneksi gagal', null, 'Saldo tidak tersedia dari gateway');
      }
    }
    setApiKeys(mgr.getKeys());
  };

  // Batch Handlers
  const handleStartNewBatch = () => {
    const mgr = BatchManager.getInstance();
    const newState = mgr.startNewBatch();
    setBatchState(newState);
    setLatestTrack(null);
    setDebugInfo(null);
  };

  // Tracklist Handlers
  const handleDeleteTrack = (id: string) => {
    const store = TracklistStore.getInstance();
    store.deleteTrack(id);
    const updated = store.getTracks();
    setTracks(updated);
    if (latestTrack?.id === id) {
      setLatestTrack(updated[0] || null);
    }
  };

  const handleClearBatch = () => {
    const store = TracklistStore.getInstance();
    store.clearBatch();
    setTracks([]);
    setLatestTrack(null);
    // Also reset batch counter
    const bMgr = BatchManager.getInstance();
    setBatchState(bMgr.resetCurrentBatch());
  };

  const handleExportText = () => {
    const store = TracklistStore.getInstance();
    const text = store.exportAsText(tracks);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `peta_piano_batch_${batchState.batchNumber}_prompts.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const store = TracklistStore.getInstance();
    const json = store.exportAsJSON(tracks);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `peta_piano_batch_${batchState.batchNumber}_prompts.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Primary Generation Execution
  const handleGenerate = async () => {
    const batchMgr = BatchManager.getInstance();
    if (!batchMgr.canGenerate()) {
      return;
    }

    setIsGenerating(true);
    setStatusMessage('VALIDATING MUSICAL OUTPUT...');
    setDebugInfo(null);

    const targetTrackNumber = batchMgr.getNextPromptNumber();

    try {
      const result = await executeGeneration({
        settings,
        batchNumber: targetTrackNumber,
        selectedModelId,
        routingMode,
        previousBatchTracks: tracks,
        onStatusUpdate: (msg) => setStatusMessage(msg),
      });

      if (result.success) {
        // Increment batch counter strictly on verified success
        const { newCount, isComplete } = batchMgr.incrementOnSuccess();
        setBatchState(batchMgr.getState());

        // Save track to store strictly on success
        const trackStore = TracklistStore.getInstance();
        trackStore.addTrack(result.track);
        setTracks(trackStore.getTracks());
        setLatestTrack(result.track);
        setDebugInfo(null);
      } else {
        // On failure: DO NOT save, DO NOT increment counter
        setDebugInfo(result.debugInfo);
      }
    } catch (err: any) {
      setDebugInfo({
        selectedModel: selectedModelId,
        gatewayModelId: selectedModelId,
        errorType: 'UNKNOWN_ERROR',
        errorMessage: err.message || 'Terjadi kesalahan sistem saat generasi.',
        time: new Date().toLocaleTimeString(),
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const activeKeysCount = apiKeys.filter((k) => k.isActive).length;

  return (
    <div className="min-h-screen bg-[#0d0f12] text-slate-100 flex flex-col selection:bg-amber-500 selection:text-black">
      {/* Offline banner if disconnected */}
      {!isOnline && (
        <div className="bg-amber-600 text-black px-4 py-1.5 text-xs font-bold text-center">
          Mode Offline — Koneksi internet terputus. KIE Gateway memerlukan koneksi aktif.
        </div>
      )}

      {/* Main Header */}
      <Header
        activeKeysCount={activeKeysCount}
        routingMode={routingMode}
        completedCount={batchState.completedCount}
        batchNumber={batchState.batchNumber}
        onOpenQC={() => setShowQCModal(true)}
      />

      {/* View Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 pt-5">
        {activeTab === 'peta' && (
          <PetaGeneratorView
            batchState={batchState}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            selectedModelId={selectedModelId}
            onSelectModelId={handleSelectModelId}
            routingMode={routingMode}
            activeKeysCount={activeKeysCount}
            latestTrack={latestTrack}
            isGenerating={isGenerating}
            statusMessage={statusMessage}
            debugInfo={debugInfo}
            onGenerate={handleGenerate}
            onRequestNewBatch={() => setShowNewBatchModal(true)}
            onSwitchToAPI={() => setActiveTab('api')}
          />
        )}

        {activeTab === 'tracklist' && (
          <TracklistView
            tracks={tracks}
            onDeleteTrack={handleDeleteTrack}
            onClearBatch={handleClearBatch}
            onRequestNewBatch={() => setShowNewBatchModal(true)}
            onExportText={handleExportText}
            onExportJSON={handleExportJSON}
          />
        )}

        {activeTab === 'api' && (
          <ApiManagerView
            keys={apiKeys}
            routingMode={routingMode}
            onSetRoutingMode={handleSetRoutingMode}
            onAddKey={handleAddKey}
            onAddMultipleKeys={handleAddMultipleKeys}
            onRemoveKey={handleRemoveKey}
            onClearAllKeys={handleClearAllKeys}
            onToggleActive={handleToggleActive}
            onTestKey={handleTestKey}
            onCheckAllBalances={handleCheckAllBalances}
            onSelectManualKey={handleSelectManualKey}
            manualSelectedKeyId={ApiKeyManager.getInstance().getManualSelectedKeyId()}
            onOpenQC={() => setShowQCModal(true)}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <Navigation
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        trackCount={tracks.length}
        hasActiveKey={activeKeysCount > 0}
      />

      {/* New Batch Confirmation Modal */}
      <NewBatchModal
        isOpen={showNewBatchModal}
        onClose={() => setShowNewBatchModal(false)}
        onConfirm={handleStartNewBatch}
        currentBatchNumber={batchState.batchNumber}
      />

      {/* Quality Control & Diagnostics Modal */}
      <QCModal isOpen={showQCModal} onClose={() => setShowQCModal(false)} />
    </div>
  );
}

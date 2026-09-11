import { ApiKeyItem, ApiKeyStatus, BalanceSummaryInfo, RoutingMode } from '../types';

const STORAGE_KEYS = {
  API_KEYS: 'peta_piano_api_keys',
  ROUTING_MODE: 'peta_piano_routing_mode',
  SELECTED_MODEL: 'peta_piano_selected_model',
  MANUAL_SELECTED_KEY: 'peta_piano_manual_selected_key_id',
};

/**
 * Creates a masked string for safe display.
 * e.g. "sk-1234567890abcdef1234" -> "sk-••••••••••1234"
 * Never exposes the complete key.
 */
export function maskApiKey(key: string): string {
  if (!key) return '';
  const trimmed = key.trim();
  if (trimmed.length <= 8) {
    return '••••••••';
  }
  const prefix = trimmed.slice(0, 3) === 'sk-' ? 'sk-' : trimmed.slice(0, 4);
  const suffix = trimmed.slice(-4);
  return `${prefix}••••••••••${suffix}`;
}

export class ApiKeyManager {
  private static instance: ApiKeyManager;
  private keys: ApiKeyItem[] = [];
  private routingMode: RoutingMode = 'AUTO';
  private manualSelectedKeyId: string | null = null;
  private currentKeyIndex: number = 0;

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): ApiKeyManager {
    if (!ApiKeyManager.instance) {
      ApiKeyManager.instance = new ApiKeyManager();
    }
    return ApiKeyManager.instance;
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.API_KEYS);
      if (stored) {
        const rawList = JSON.parse(stored);
        if (Array.isArray(rawList)) {
          this.keys = rawList.map((k, index) => {
            const startingBalance = typeof k.startingBalance === 'number' ? k.startingBalance : 80;
            const usedTokens = typeof k.usedTokens === 'number' ? k.usedTokens : 0;
            const estimatedRemaining =
              typeof k.estimatedRemaining === 'number'
                ? k.estimatedRemaining
                : Math.max(0, startingBalance - usedTokens);

            return {
              id: k.id || `key_${Date.now()}_${index}`,
              rawKey: k.rawKey || '',
              maskedKey: k.maskedKey || maskApiKey(k.rawKey || ''),
              isActive: k.isActive !== false,
              name: k.name || `KIE Key #${index + 1}`,
              addedAt: k.addedAt || Date.now(),
              status: k.status || 'untested',
              provider: k.provider || 'KIE',
              gatewayBalance: typeof k.gatewayBalance === 'number' ? k.gatewayBalance : null,
              startingBalance,
              usedTokens,
              estimatedRemaining,
              lastBalanceCheck: k.lastBalanceCheck,
              lastTestedAt: k.lastTestedAt,
              lastError: k.lastError,
              balanceCheckMessage: k.balanceCheckMessage,
            };
          });
        }
      }

      const storedMode = localStorage.getItem(STORAGE_KEYS.ROUTING_MODE) as RoutingMode;
      if (storedMode === 'AUTO' || storedMode === 'MANUAL') {
        this.routingMode = storedMode;
      }

      const storedManualKey = localStorage.getItem(STORAGE_KEYS.MANUAL_SELECTED_KEY);
      if (storedManualKey) {
        this.manualSelectedKeyId = storedManualKey;
      }
    } catch {
      this.keys = [];
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(this.keys));
      localStorage.setItem(STORAGE_KEYS.ROUTING_MODE, this.routingMode);
      if (this.manualSelectedKeyId) {
        localStorage.setItem(STORAGE_KEYS.MANUAL_SELECTED_KEY, this.manualSelectedKeyId);
      } else {
        localStorage.removeItem(STORAGE_KEYS.MANUAL_SELECTED_KEY);
      }
    } catch {
      // Storage error handled
    }
  }

  public getKeys(): ApiKeyItem[] {
    return [...this.keys];
  }

  public getActiveKeys(): ApiKeyItem[] {
    return this.keys.filter(k => k.isActive);
  }

  public getActiveKeysCount(): number {
    return this.getActiveKeys().length;
  }

  public getRoutingMode(): RoutingMode {
    return this.routingMode;
  }

  public setRoutingMode(mode: RoutingMode) {
    this.routingMode = mode;
    this.saveToStorage();
  }

  public getManualSelectedKeyId(): string | null {
    if (this.manualSelectedKeyId && this.keys.some(k => k.id === this.manualSelectedKeyId)) {
      return this.manualSelectedKeyId;
    }
    const active = this.getActiveKeys();
    return active.length > 0 ? active[0].id : null;
  }

  public setManualSelectedKeyId(id: string) {
    this.manualSelectedKeyId = id;
    this.saveToStorage();
  }

  public getManualSelectedKey(): ApiKeyItem | null {
    const keyId = this.getManualSelectedKeyId();
    if (!keyId) return null;
    return this.keys.find(k => k.id === keyId) || null;
  }

  /**
   * Returns the current key considered active according to routing mode
   */
  public getCurrentActiveKey(): ApiKeyItem | null {
    if (this.routingMode === 'MANUAL') {
      return this.getManualSelectedKey() || this.getActiveKeys()[0] || null;
    }
    const usable = this.getUsableKeys();
    if (usable.length === 0) return this.getActiveKeys()[0] || null;
    if (this.currentKeyIndex >= usable.length) {
      this.currentKeyIndex = 0;
    }
    return usable[this.currentKeyIndex] || usable[0];
  }

  /**
   * Returns keys that are active and not permanently invalid/exhausted
   */
  public getUsableKeys(): ApiKeyItem[] {
    return this.keys.filter(
      k =>
        k.isActive &&
        k.status !== 'INVALID' &&
        k.status !== 'invalid' &&
        k.status !== 'EXHAUSTED'
    );
  }

  /**
   * Returns the active fallback chain in order
   */
  public getFallbackChain(): ApiKeyItem[] {
    const usable = this.getUsableKeys();
    if (usable.length === 0) return [];
    if (this.routingMode === 'MANUAL') {
      const selected = this.getManualSelectedKey();
      return selected ? [selected] : usable.slice(0, 1);
    }
    const current = this.getCurrentActiveKey();
    if (!current) return usable;
    const others = usable.filter(k => k.id !== current.id);
    return [current, ...others];
  }

  /**
   * Add a single API key
   */
  public addKey(rawKey: string, name?: string): ApiKeyItem {
    const trimmed = rawKey.trim();
    if (!trimmed) {
      throw new Error('API Key cannot be empty');
    }

    const existing = this.keys.find(k => k.rawKey === trimmed);
    if (existing) {
      existing.isActive = true;
      this.saveToStorage();
      return existing;
    }

    const newItem: ApiKeyItem = {
      id: 'key_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      rawKey: trimmed,
      maskedKey: maskApiKey(trimmed),
      isActive: true,
      name: name?.trim() || `KIE Key #${this.keys.length + 1}`,
      addedAt: Date.now(),
      status: 'untested',
      provider: 'KIE',
      gatewayBalance: null,
      startingBalance: 80,
      usedTokens: 0,
      estimatedRemaining: 80,
    };

    this.keys.push(newItem);
    if (!this.manualSelectedKeyId) {
      this.manualSelectedKeyId = newItem.id;
    }
    this.saveToStorage();
    return newItem;
  }

  /**
   * Add multiple API keys (one per line).
   * Trims whitespace, removes empty lines, validates format,
   * detects duplicates against stored and batch keys, and preserves existing keys.
   */
  public addMultipleKeys(rawKeysText: string): {
    addedCount: number;
    duplicateCount: number;
    invalidCount: number;
    addedKeys: ApiKeyItem[];
    message: string;
  } {
    const lines = rawKeysText.split(/\r?\n/);
    const seenInBatch = new Set<string>();
    const addedKeys: ApiKeyItem[] = [];
    let duplicateCount = 0;
    let invalidCount = 0;

    for (const rawLine of lines) {
      const trimmed = rawLine.trim();
      if (!trimmed) continue;

      // Minimum format validation
      if (trimmed.length < 8) {
        invalidCount++;
        continue;
      }

      // Check duplicate in current batch
      if (seenInBatch.has(trimmed)) {
        duplicateCount++;
        continue;
      }
      seenInBatch.add(trimmed);

      // Check duplicate in existing stored keys
      const existing = this.keys.find(k => k.rawKey === trimmed);
      if (existing) {
        duplicateCount++;
        // If it was inactive, we re-activate it
        existing.isActive = true;
        continue;
      }

      const newItem: ApiKeyItem = {
        id: 'key_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        rawKey: trimmed,
        maskedKey: maskApiKey(trimmed),
        isActive: true,
        name: `KIE Key #${this.keys.length + 1}`,
        addedAt: Date.now(),
        status: 'untested',
        provider: 'KIE',
        gatewayBalance: null,
        startingBalance: 80,
        usedTokens: 0,
        estimatedRemaining: 80,
      };

      this.keys.push(newItem);
      addedKeys.push(newItem);
    }

    if (!this.manualSelectedKeyId && this.keys.length > 0) {
      this.manualSelectedKeyId = this.keys[0].id;
    }

    this.saveToStorage();

    const parts: string[] = [];
    if (addedKeys.length > 0) {
      parts.push(`${addedKeys.length} API Key berhasil ditambahkan`);
    }
    if (duplicateCount > 0) {
      parts.push(`${duplicateCount} key duplikat dilewati`);
    }
    if (invalidCount > 0) {
      parts.push(`${invalidCount} baris tidak valid dilewati`);
    }

    return {
      addedCount: addedKeys.length,
      duplicateCount,
      invalidCount,
      addedKeys,
      message: parts.join(', ') || 'Tidak ada key yang ditambahkan',
    };
  }

  public removeKey(id: string) {
    this.keys = this.keys.filter(k => k.id !== id);
    if (this.manualSelectedKeyId === id) {
      const active = this.getActiveKeys();
      this.manualSelectedKeyId = active.length > 0 ? active[0].id : null;
    }
    this.saveToStorage();
  }

  public clearAllKeys() {
    this.keys = [];
    this.manualSelectedKeyId = null;
    this.saveToStorage();
  }

  public toggleKeyActive(id: string, isActive?: boolean) {
    const key = this.keys.find(k => k.id === id);
    if (key) {
      key.isActive = isActive !== undefined ? isActive : !key.isActive;
      this.saveToStorage();
    }
  }

  public updateKeyStatus(
    id: string,
    status: ApiKeyStatus,
    lastError?: string,
    gatewayBalance?: number | null,
    balanceCheckMessage?: string
  ) {
    const key = this.keys.find(k => k.id === id);
    if (key) {
      key.status = status;
      key.lastTestedAt = Date.now();
      if (lastError !== undefined) key.lastError = lastError;
      if (gatewayBalance !== undefined) key.gatewayBalance = gatewayBalance;
      if (balanceCheckMessage !== undefined) key.balanceCheckMessage = balanceCheckMessage;
      this.saveToStorage();
    }
  }

  /**
   * Strictly records usage upon verified successful prompt generation
   */
  public recordUsage(id: string, tokensUsed: number = 1) {
    const key = this.keys.find(k => k.id === id);
    if (key) {
      const starting = typeof key.startingBalance === 'number' ? key.startingBalance : 80;
      const prevUsed = typeof key.usedTokens === 'number' ? key.usedTokens : 0;
      key.usedTokens = prevUsed + tokensUsed;
      key.estimatedRemaining = Math.max(0, starting - key.usedTokens);
      if (key.estimatedRemaining === 0 && key.gatewayBalance === null) {
        key.status = 'EXHAUSTED';
      }
      this.saveToStorage();
    }
  }

  /**
   * Retrieves the next available active key, rotating round-robin across active keys.
   */
  public getNextActiveKey(): ApiKeyItem | null {
    if (this.routingMode === 'MANUAL') {
      return this.getManualSelectedKey() || this.getActiveKeys()[0] || null;
    }

    const usable = this.getUsableKeys();
    if (usable.length === 0) {
      const active = this.getActiveKeys();
      return active.length > 0 ? active[0] : null;
    }

    if (this.currentKeyIndex >= usable.length) {
      this.currentKeyIndex = 0;
    }

    const key = usable[this.currentKeyIndex];
    this.currentKeyIndex = (this.currentKeyIndex + 1) % usable.length;
    return key;
  }

  /**
   * Fallback to the next active key when current key(s) fail
   */
  public getAlternativeKey(excludeKeyIds: string | string[]): ApiKeyItem | null {
    const excludeSet = new Set(Array.isArray(excludeKeyIds) ? excludeKeyIds : [excludeKeyIds]);
    const usable = this.getUsableKeys().filter(k => !excludeSet.has(k.id));
    return usable.length > 0 ? usable[0] : null;
  }

  /**
   * Calculates dynamic balance summary without fabricating data
   */
  public getTotalBalanceInfo(): BalanceSummaryInfo {
    const totalStoredKeys = this.keys.length;
    const totalActiveKeys = this.getActiveKeys().length;

    let gatewaySum = 0;
    let gatewayKnownCount = 0;
    let estimatedSum = 0;

    for (const k of this.keys) {
      if (typeof k.gatewayBalance === 'number' && !isNaN(k.gatewayBalance)) {
        gatewaySum += k.gatewayBalance;
        gatewayKnownCount++;
      }
      const rem = typeof k.estimatedRemaining === 'number' ? k.estimatedRemaining : (k.startingBalance ?? 80);
      estimatedSum += rem;
    }

    const activeKey = this.getCurrentActiveKey();
    let currentActiveKeyIndex = 0;
    let currentActiveKeyLabel = 'None';
    if (activeKey) {
      const idx = this.keys.findIndex(k => k.id === activeKey.id);
      currentActiveKeyIndex = idx >= 0 ? idx + 1 : 1;
      currentActiveKeyLabel = `Key #${currentActiveKeyIndex}`;
    }

    return {
      totalStoredKeys,
      totalActiveKeys,
      knownGatewayTotal: gatewayKnownCount > 0 ? gatewaySum : null,
      totalEstimatedRemaining: estimatedSum,
      hasGatewayBalance: gatewayKnownCount > 0,
      unknownGatewayCount: totalStoredKeys - gatewayKnownCount,
      currentActiveKeyIndex,
      currentActiveKeyLabel,
    };
  }
}


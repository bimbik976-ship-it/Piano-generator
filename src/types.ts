/**
 * PETA PIANO AI - Type Definitions
 */

export type GatewayModelId = 'gpt-6-astra' | 'gpt-5-6-luna' | 'gpt-5-5';

export interface ModelConfigItem {
  uiName: string;
  gatewayId: GatewayModelId;
  description: string;
}

export interface MusicalMetadata {
  pianoType: string;
  category: string;
  genre: string;
  mood: string;
  country: string;
}

export interface StyleIntensity {
  ambient: number;
  minimalist: number;
  meditative: number;
  sleepFriendly: number;
  emotional: number;
  cinematic: number;
  musicalActivity: number;
}

export interface GeneratedTrackResult {
  id: string;
  batchNumber: number; // #1 to #25
  stylePrompt: string;
  bpm: number;
  key: string;
  instruments: string[];
  metadata: MusicalMetadata;
  styleIntensity: StyleIntensity;
  modelUsed: string;
  gatewayModelId: GatewayModelId;
  timestamp: number;
  attemptsCount: number;
}

export type ErrorType =
  | 'BAD_REQUEST'
  | 'INVALID_API_KEY'
  | 'API_KEY_ERROR'
  | 'FORBIDDEN'
  | 'ENDPOINT_NOT_FOUND'
  | 'CONFLICT'
  | 'MODEL_OR_REQUEST_UNSUPPORTED'
  | 'MODEL_NOT_SUPPORTED'
  | 'RATE_LIMITED'
  | 'RATE_LIMIT'
  | 'GATEWAY_ERROR'
  | 'NETWORK_ERROR'
  | 'RESPONSE_BODY_READ_ERROR'
  | 'INVALID_JSON'
  | 'INVALID_STRUCTURE'
  | 'DUPLICATE'
  | 'UNKNOWN_ERROR';

export interface SafeDebugInfo {
  selectedModel: string;
  gatewayModelId: GatewayModelId;
  endpoint?: string;
  httpStatus?: number;
  errorType: ErrorType;
  errorMessage: string;
  time: string;
  attempt?: number;
  sanitizedResponseBody?: string;
}

export type ApiKeyStatus =
  | 'ACTIVE'
  | 'STANDBY'
  | 'CHECKING'
  | 'EXHAUSTED'
  | 'INVALID'
  | 'RATE LIMITED'
  | 'ERROR'
  | 'active'
  | 'invalid'
  | 'rate_limited'
  | 'untested';

export interface ApiKeyItem {
  id: string;
  maskedKey: string;
  rawKey: string;
  isActive: boolean;
  name: string;
  addedAt: number;
  status: ApiKeyStatus;
  provider?: string; // 'KIE'
  gatewayBalance?: number | null; // actual credit/balance from gateway if supported
  startingBalance?: number; // default 80
  usedTokens?: number; // actual usage
  estimatedRemaining?: number; // startingBalance - usedTokens
  lastBalanceCheck?: number;
  lastTestedAt?: number;
  lastError?: string;
  balanceCheckMessage?: string;
}

export interface BalanceSummaryInfo {
  totalStoredKeys: number;
  totalActiveKeys: number;
  knownGatewayTotal: number | null;
  totalEstimatedRemaining: number;
  hasGatewayBalance: boolean;
  unknownGatewayCount: number;
  currentActiveKeyIndex: number;
  currentActiveKeyLabel: string;
}

export type RoutingMode = 'AUTO' | 'MANUAL';

export interface GeneratorSettings {
  pianoType: string;
  categories: string[];
  genre: string;
  moods: string[];
  country: string;
}

export interface BatchState {
  currentBatchId: string;
  batchNumber: number; // 1, 2, ...
  completedCount: number; // 0 to 25
  isComplete: boolean;
  createdAt: number;
  completedAt?: number;
}

export interface QCTestResult {
  id: string;
  title: string;
  status: 'passed' | 'failed' | 'pending';
  details: string;
}

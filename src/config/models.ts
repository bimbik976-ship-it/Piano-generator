import { GatewayModelId, ModelConfigItem } from '../types';

/**
 * PETA PIANO AI - Centralized Model Configuration
 * STRICT: Only allowed Gateway IDs may ever be sent to KIE Gateway.
 * Forbidden to send: gpt-5.5, gpt-5-6, gpt-6 or any unrecognized ID.
 */
export const MODEL_CONFIG: Record<GatewayModelId, ModelConfigItem> = {
  'gpt-6-astra': {
    uiName: 'GPT-6 Astra',
    gatewayId: 'gpt-6-astra',
    description: 'Flagship reasoning model for intricate, emotionally rich musical composition prompts.'
  },
  'gpt-5-6-luna': {
    uiName: 'GPT-5.6 Luna',
    gatewayId: 'gpt-5-6-luna',
    description: 'Fast, high-fidelity model optimized for ambient soundscapes and subtle dynamics.'
  },
  'gpt-5-5': {
    uiName: 'GPT-5.5',
    gatewayId: 'gpt-5-5',
    description: 'Stable harmonic architecture model with robust JSON adherence.'
  }
};

export const DEFAULT_MODEL_ID: GatewayModelId = 'gpt-5-5';

/**
 * AUTO Routing fallback order as per specification:
 * 1. GPT-5.5 (Default)
 * 2. GPT-5.6 Luna
 * 3. GPT-6 Astra
 */
export const AUTO_FALLBACK_CHAIN: GatewayModelId[] = [
  'gpt-5-5',
  'gpt-5-6-luna',
  'gpt-6-astra'
];

/**
 * Validates that an ID is strictly one of the authorized Gateway IDs.
 */
export function validateGatewayModelId(id: string): id is GatewayModelId {
  return id === 'gpt-6-astra' || id === 'gpt-5-6-luna' || id === 'gpt-5-5';
}

/**
 * Safe resolver for UI display name.
 */
export function getModelUIName(gatewayId: GatewayModelId): string {
  return MODEL_CONFIG[gatewayId]?.uiName || gatewayId;
}

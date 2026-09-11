import { BatchState } from '../types';

const STORAGE_KEYS = {
  CURRENT_BATCH: 'peta_piano_current_batch',
};

export class BatchManager {
  private static instance: BatchManager;
  private state: BatchState;

  private constructor() {
    this.state = this.loadState();
  }

  public static getInstance(): BatchManager {
    if (!BatchManager.instance) {
      BatchManager.instance = new BatchManager();
    }
    return BatchManager.instance;
  }

  private loadState(): BatchState {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_BATCH);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Fallback
    }
    return this.createNewBatchState(1);
  }

  private createNewBatchState(batchNum: number): BatchState {
    return {
      currentBatchId: 'batch_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      batchNumber: batchNum,
      completedCount: 0,
      isComplete: false,
      createdAt: Date.now(),
    };
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_BATCH, JSON.stringify(this.state));
    } catch {
      // Ignore
    }
  }

  public getState(): BatchState {
    return { ...this.state };
  }

  public getNextPromptNumber(): number {
    return this.state.completedCount + 1;
  }

  public canGenerate(): boolean {
    return this.state.completedCount < 25 && !this.state.isComplete;
  }

  /**
   * Only called upon 100% verified, validated, unique track generation
   */
  public incrementOnSuccess(): { newCount: number; isComplete: boolean } {
    if (this.state.completedCount >= 25) {
      this.state.isComplete = true;
      this.persist();
      return { newCount: 25, isComplete: true };
    }

    this.state.completedCount += 1;
    if (this.state.completedCount === 25) {
      this.state.isComplete = true;
      this.state.completedAt = Date.now();
    }
    this.persist();
    return { newCount: this.state.completedCount, isComplete: this.state.isComplete };
  }

  /**
   * Starts a brand new batch of 25 prompts.
   * Old tracks in tracklist are kept intact unless user explicitly selects Clear.
   */
  public startNewBatch(): BatchState {
    const nextBatchNum = this.state.batchNumber + 1;
    this.state = this.createNewBatchState(nextBatchNum);
    this.persist();
    return { ...this.state };
  }

  /**
   * Resets current batch counter to #1 (if explicitly cleared)
   */
  public resetCurrentBatch(): BatchState {
    this.state = this.createNewBatchState(this.state.batchNumber);
    this.persist();
    return { ...this.state };
  }
}

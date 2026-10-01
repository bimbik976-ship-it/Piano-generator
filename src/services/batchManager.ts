import { BatchState, YouTubeSEOContent } from '../types';
import { BATCH_SIZE } from '../config/batch';

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
    return this.state.completedCount < BATCH_SIZE && !this.state.isComplete;
  }

  /**
   * Only called upon 100% verified, validated, unique track generation
   */
  public incrementOnSuccess(): { newCount: number; isComplete: boolean } {
    if (this.state.completedCount >= BATCH_SIZE) {
      this.state.isComplete = true;
      this.persist();
      return { newCount: BATCH_SIZE, isComplete: true };
    }

    this.state.completedCount += 1;
    if (this.state.completedCount === BATCH_SIZE) {
      this.state.isComplete = true;
      this.state.completedAt = Date.now();
    }
    this.persist();
    return { newCount: this.state.completedCount, isComplete: this.state.isComplete };
  }


  /**
   * Stores the single YouTube title generated from the completed 20-track batch.
   * This never affects the 20-track generation counter.
   */
  public setYouTubeTitle(title: string): BatchState {
    this.state.youtubeTitle = title;
    this.state.youtubeTitleGeneratedAt = Date.now();
    this.persist();
    return { ...this.state };
  }

  /** Stores the latest consumer-facing YouTube SEO package. */
  public setYouTubeSEO(seo: YouTubeSEOContent): BatchState {
    this.state.youtubeSEO = { ...seo, generatedAt: Date.now() };
    this.state.youtubeTitle = seo.title;
    this.state.youtubeTitleGeneratedAt = Date.now();
    this.persist();
    return { ...this.state };
  }

  public setYoutubeContent(content: YouTubeSEOContent): BatchState {
    return this.setYouTubeSEO(content);
  }

  /** Updates only the thumbnail text; all other YouTube content remains unchanged. */
  public setYouTubeThumbnailText(thumbnailText: string): BatchState {
    this.state.youtubeSEO = this.state.youtubeSEO
      ? { ...this.state.youtubeSEO, thumbnailText, generatedAt: Date.now() }
      : this.state.youtubeSEO;
    this.persist();
    return { ...this.state };
  }

  /**
   * Starts a brand new batch of 20 prompts.
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

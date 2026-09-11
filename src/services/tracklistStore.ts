import { GeneratedTrackResult } from '../types';

const STORAGE_KEYS = {
  TRACKLIST: 'peta_piano_tracklist',
};

export class TracklistStore {
  private static instance: TracklistStore;
  private tracks: GeneratedTrackResult[] = [];

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): TracklistStore {
    if (!TracklistStore.instance) {
      TracklistStore.instance = new TracklistStore();
    }
    return TracklistStore.instance;
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TRACKLIST);
      if (stored) {
        this.tracks = JSON.parse(stored);
      }
    } catch {
      this.tracks = [];
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEYS.TRACKLIST, JSON.stringify(this.tracks));
    } catch {
      // Storage error
    }
  }

  public getTracks(): GeneratedTrackResult[] {
    return [...this.tracks];
  }

  /**
   * Returns tracks belonging to the currently active batch
   */
  public getTracksForBatch(batchNumber?: number): GeneratedTrackResult[] {
    if (batchNumber !== undefined) {
      return this.tracks.filter(t => (t as any).batchIndex === batchNumber || t.batchNumber <= 25);
    }
    return [...this.tracks];
  }

  /**
   * Only stores validated, successful generations.
   * NEVER saves failed generations.
   */
  public addTrack(track: GeneratedTrackResult) {
    this.tracks.unshift(track); // prepend for chronological order
    this.saveToStorage();
  }

  public deleteTrack(id: string) {
    this.tracks = this.tracks.filter(t => t.id !== id);
    this.saveToStorage();
  }

  public clearBatch(batchNumber?: number) {
    if (batchNumber !== undefined) {
      this.tracks = this.tracks.filter(t => (t as any).batchIndex !== batchNumber);
    } else {
      this.tracks = [];
    }
    this.saveToStorage();
  }

  /**
   * Formats all style prompts for copy/export
   */
  public exportAsText(tracksToExport?: GeneratedTrackResult[]): string {
    const list = tracksToExport || this.tracks;
    if (list.length === 0) return 'No tracks available.';

    return list
      .map(
        (t) =>
          `[Track #${t.batchNumber}] ${t.metadata.pianoType} - ${t.metadata.genre} (${t.bpm} BPM)\n` +
          `Style Prompt:\n${t.stylePrompt}\n` +
          `Instruments: ${t.instruments.join(', ')}\n` +
          `Mood: ${t.metadata.mood} | Category: ${t.metadata.category} | Model: ${t.modelUsed}\n` +
          `Intensity: Ambient ${t.styleIntensity.ambient}%, Meditative ${t.styleIntensity.meditative}%, Sleep ${t.styleIntensity.sleepFriendly}%\n` +
          `--------------------------------------------------`
      )
      .join('\n\n');
  }

  public exportAsJSON(tracksToExport?: GeneratedTrackResult[]): string {
    const list = tracksToExport || this.tracks;
    return JSON.stringify(list, null, 2);
  }
}

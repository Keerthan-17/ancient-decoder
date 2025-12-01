export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Prediction {
  symbol: string;
  probability: number; // 0 to 1
  meaning: string;
  gardinerCode?: string; // e.g., "G1"
  description: string;
}

export interface TranslationResult {
  id: string;
  timestamp: number;
  croppedImageBase64: string; // The specific symbol image
  predictions: Prediction[];
}

export interface AppState {
  currentImage: string | null; // Base64 of the full uploaded image
  isAnalyzing: boolean;
  results: TranslationResult[];
  selectedResultId: string | null;
}
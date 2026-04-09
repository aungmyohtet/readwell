export interface PlacementResult {
  recommendedLevel: 'A2' | 'B1' | 'B2' | string;
  chosenLevel: 'A2' | 'B1' | 'B2' | string;
  confidenceBand: 'clear' | 'leaning' | 'mixed' | string;
  completedAt: string;
  updatedAt: string;
}

export interface SubmitPlacementRequest {
  readingComfort: 'A2' | 'B1' | 'B2';
  grammarConfidence: 'A2' | 'B1' | 'B2';
  vocabularyIndependence: 'A2' | 'B1' | 'B2';
  challengePreference: 'A2' | 'B1' | 'B2';
}

export interface UpdatePlacementChoiceRequest {
  chosenLevel: 'A2' | 'B1' | 'B2';
}
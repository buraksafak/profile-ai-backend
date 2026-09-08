export interface GenerateContentInput {
  prompt: string;
}

export interface GenerateContentResult {
  text: string;
  model: string;
}

export interface GenerateResponseResult {
  text: string;
  model: string;
  durationMs: number;
}

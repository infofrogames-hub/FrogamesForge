
export interface GenerationResult {
  html1: string;
  html2: string;
  html3: string;
  seoTitle: string;
  metaDescription: string;
}

export interface AppState {
  image: string | null;
  description1: string;
  description2: string;
  bggInfo: string;
  isGenerating: boolean;
  result: GenerationResult | null;
  error: string | null;
}

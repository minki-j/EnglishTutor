export interface Correction {
  correction: string;
  explanation: string;
}

export interface WritingEntry {
  id: string;
  type: "correction" | "vocabulary" | "breakdown";
  input: string;
  corrected?: string;
  corrections: Correction[];

  vocabulary?: {
    word: string;
    definition: string;
    examples: string[];
  }[];
  breakdown?: {
    section: string;
    analysis: string;
  }[];
  createdAt: Date;
}
export type ChunkStrategy = "paragraph" | "sentence" | "fixed"

export type MergeStrategy = "hierarchical" | "flat" | "progressive"

export interface SummaryOptions {
  maxChunkTokens?: number
  chunkStrategy?: ChunkStrategy
  mergeStrategy?: MergeStrategy
  language?: string
  style?: "bullet" | "paragraph" | "tldr"
  maxOutputTokens?: number
}

export interface Chunk {
  index: number
  text: string
  tokenEstimate: number
}

export interface ChunkSummary {
  chunkIndex: number
  summary: string
  tokensUsed: number
}

export interface SummaryResult {
  finalSummary: string
  chunkCount: number
  chunkSummaries: ChunkSummary[]
  totalTokensUsed: number
  strategy: MergeStrategy
  durationMs: number
}

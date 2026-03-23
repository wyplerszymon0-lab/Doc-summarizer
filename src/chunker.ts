import { Chunk, ChunkStrategy } from "./types"

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

function chunkByParagraph(text: string, maxTokens: number): Chunk[] {
  const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
  const chunks: Chunk[] = []
  let current = ""
  let index   = 0

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph
    if (estimateTokens(candidate) > maxTokens && current) {
      chunks.push({ index: index++, text: current, tokenEstimate: estimateTokens(current) })
      current = paragraph
    } else {
      current = candidate
    }
  }

  if (current) {
    chunks.push({ index: index++, text: current, tokenEstimate: estimateTokens(current) })
  }

  return chunks
}

function chunkBySentence(text: string, maxTokens: number): Chunk[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text]
  const chunks: Chunk[] = []
  let current = ""
  let index   = 0

  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence.trim()}` : sentence.trim()
    if (estimateTokens(candidate) > maxTokens && current) {
      chunks.push({ index: index++, text: current, tokenEstimate: estimateTokens(current) })
      current = sentence.trim()
    } else {
      current = candidate
    }
  }

  if (current) {
    chunks.push({ index: index++, text: current, tokenEstimate: estimateTokens(current) })
  }

  return chunks
}

function chunkByFixed(text: string, maxTokens: number): Chunk[] {
  const chunkSize = maxTokens * 4
  const chunks: Chunk[] = []

  for (let i = 0; i < text.length; i += chunkSize) {
    const slice = text.slice(i, i + chunkSize)
    chunks.push({
      index:         chunks.length,
      text:          slice,
      tokenEstimate: estimateTokens(slice),
    })
  }

  return chunks
}

export function chunkText(text: string, strategy: ChunkStrategy, maxTokens: number): Chunk[] {
  switch (strategy) {
    case "paragraph": return chunkByParagraph(text, maxTokens)
    case "sentence":  return chunkBySentence(text, maxTokens)
    case "fixed":     return chunkByFixed(text, maxTokens)
  }
}

export { estimateTokens }

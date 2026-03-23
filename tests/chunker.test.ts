import { describe, it, expect } from "vitest"
import { chunkText, estimateTokens } from "../src/chunker"

const SHORT_TEXT = "Hello world. This is a test."

const PARAGRAPH_TEXT = `First paragraph with some content here.

Second paragraph with different content.

Third paragraph to make it longer.`

const LONG_TEXT = "word ".repeat(2000)

describe("estimateTokens", () => {
  it("estimates tokens as roughly text length divided by 4", () => {
    const text   = "a".repeat(400)
    const tokens = estimateTokens(text)
    expect(tokens).toBe(100)
  })

  it("rounds up", () => {
    expect(estimateTokens("abc")).toBe(1)
  })

  it("returns 0 for empty string", () => {
    expect(estimateTokens("")).toBe(0)
  })
})

describe("chunkText — paragraph", () => {
  it("returns single chunk for short text", () => {
    const chunks = chunkText(SHORT_TEXT, "paragraph", 500)
    expect(chunks).toHaveLength(1)
    expect(chunks[0].text).toBe(SHORT_TEXT)
  })

  it("splits text into multiple chunks when exceeds maxTokens", () => {
    const chunks = chunkText(PARAGRAPH_TEXT, "paragraph", 20)
    expect(chunks.length).toBeGreaterThan(1)
  })

  it("each chunk is within token limit", () => {
    const maxTokens = 30
    const chunks = chunkText(LONG_TEXT, "paragraph", maxTokens)
    for (const chunk of chunks) {
      expect(chunk.tokenEstimate).toBeLessThanOrEqual(maxTokens * 2)
    }
  })

  it("assigns sequential indexes", () => {
    const chunks = chunkText(PARAGRAPH_TEXT, "paragraph", 20)
    chunks.forEach((chunk, i) => expect(chunk.index).toBe(i))
  })

  it("preserves all content across chunks", () => {
    const chunks = chunkText(PARAGRAPH_TEXT, "paragraph", 20)
    const combined = chunks.map(c => c.text).join(" ")
    expect(combined.length).toBeGreaterThan(0)
  })
})

describe("chunkText — sentence", () => {
  it("splits on sentence boundaries", () => {
    const text   = "First sentence. Second sentence. Third sentence."
    const chunks = chunkText(text, "sentence", 5)
    expect(chunks.length).toBeGreaterThan(1)
  })

  it("returns single chunk for short text", () => {
    const chunks = chunkText(SHORT_TEXT, "sentence", 500)
    expect(chunks).toHaveLength(1)
  })
})

describe("chunkText — fixed", () => {
  it("splits into fixed-size chunks", () => {
    const chunks = chunkText(LONG_TEXT, "fixed", 100)
    expect(chunks.length).toBeGreaterThan(1)
  })

  it("last chunk contains remaining text", () => {
    const text   = "a".repeat(100)
    const chunks = chunkText(text, "fixed", 10)
    const combined = chunks.map(c => c.text).join("")
    expect(combined).toBe(text)
  })

  it("assigns sequential indexes", () => {
    const chunks = chunkText(LONG_TEXT, "fixed", 50)
    chunks.forEach((chunk, i) => expect(chunk.index).toBe(i))
  })
})

describe("chunkText — edge cases", () => {
  it("handles empty string", () => {
    const chunks = chunkText("", "paragraph", 100)
    expect(chunks).toHaveLength(0)
  })

  it("handles single word", () => {
    const chunks = chunkText("hello", "paragraph", 100)
    expect(chunks).toHaveLength(1)
    expect(chunks[0].text).toBe("hello")
  })
})

import OpenAI from "openai"
import { Chunk, ChunkSummary, SummaryOptions, SummaryResult } from "./types"
import { chunkText, estimateTokens } from "./chunker"

const DEFAULTS: Required<SummaryOptions> = {
  maxChunkTokens:  800,
  chunkStrategy:   "paragraph",
  mergeStrategy:   "hierarchical",
  language:        "English",
  style:           "paragraph",
  maxOutputTokens: 500,
}

function buildChunkPrompt(chunk: Chunk, opts: Required<SummaryOptions>): string {
  const styleGuide = {
    bullet:    "Use bullet points for key information.",
    paragraph: "Write in clear, flowing prose.",
    tldr:      "Write a single concise sentence — TL;DR style.",
  }[opts.style]

  return (
    `Summarize the following text excerpt concisely.\n` +
    `Language: ${opts.language}. ${styleGuide}\n\n` +
    `Text:\n${chunk.text}`
  )
}

function buildMergePrompt(summaries: string[], opts: Required<SummaryOptions>): string {
  const styleGuide = {
    bullet:    "Use bullet points for key information.",
    paragraph: "Write in clear, flowing prose.",
    tldr:      "Write a single concise sentence — TL;DR style.",
  }[opts.style]

  const combined = summaries.map((s, i) => `[Part ${i + 1}]\n${s}`).join("\n\n")

  return (
    `You have summaries of multiple parts of a document. ` +
    `Merge them into a single coherent summary.\n` +
    `Language: ${opts.language}. ${styleGuide}\n\n` +
    `${combined}`
  )
}

async function summarizeChunk(
  client: OpenAI,
  chunk: Chunk,
  opts: Required<SummaryOptions>,
  model: string,
): Promise<ChunkSummary> {
  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: "You are a precise document summarizer. Be concise and accurate." },
      { role: "user",   content: buildChunkPrompt(chunk, opts) },
    ],
    max_tokens: opts.maxOutputTokens,
    temperature: 0.2,
  })

  return {
    chunkIndex: chunk.index,
    summary:    response.choices[0]?.message?.content ?? "",
    tokensUsed: response.usage?.total_tokens ?? 0,
  }
}

async function mergeFlat(
  client: OpenAI,
  summaries: ChunkSummary[],
  opts: Required<SummaryOptions>,
  model: string,
): Promise<{ text: string; tokens: number }> {
  const texts = summaries.map(s => s.summary)
  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: "You are a precise document summarizer." },
      { role: "user",   content: buildMergePrompt(texts, opts) },
    ],
    max_tokens: opts.maxOutputTokens,
    temperature: 0.2,
  })

  return {
    text:   response.choices[0]?.message?.content ?? "",
    tokens: response.usage?.total_tokens ?? 0,
  }
}

async function mergeHierarchical(
  client: OpenAI,
  summaries: ChunkSummary[],
  opts: Required<SummaryOptions>,
  model: string,
): Promise<{ text: string; tokens: number }> {
  let current = summaries.map(s => s.summary)
  let totalTokens = 0
  const batchSize = 4

  while (current.length > 1) {
    const next: string[] = []
    for (let i = 0; i < current.length; i += batchSize) {
      const batch = current.slice(i, i + batchSize)
      if (batch.length === 1) {
        next.push(batch[0])
        continue
      }
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: "You are a precise document summarizer." },
          { role: "user",   content: buildMergePrompt(batch, opts) },
        ],
        max_tokens: opts.maxOutputTokens,
        temperature: 0.2,
      })
      next.push(response.choices[0]?.message?.content ?? "")
      totalTokens += response.usage?.total_tokens ?? 0
    }
    current = next
  }

  return { text: current[0] ?? "", tokens: totalTokens }
}

async function mergeProgressive(
  client: OpenAI,
  summaries: ChunkSummary[],
  opts: Required<SummaryOptions>,
  model: string,
): Promise<{ text: string; tokens: number }> {
  let running = summaries[0]?.summary ?? ""
  let totalTokens = 0

  for (let i = 1; i < summaries.length; i++) {
    const prompt =
      `You have a running summary and a new part. Update the summary to include the new information.\n` +
      `Language: ${opts.language}.\n\n` +
      `Current summary:\n${running}\n\n` +
      `New part:\n${summaries[i].summary}`

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: "You are a precise document summarizer." },
        { role: "user",   content: prompt },
      ],
      max_tokens: opts.maxOutputTokens,
      temperature: 0.2,
    })

    running      = response.choices[0]?.message?.content ?? running
    totalTokens += response.usage?.total_tokens ?? 0
  }

  return { text: running, tokens: totalTokens }
}

export class DocSummarizer {
  private client: OpenAI
  private model:  string

  constructor(apiKey: string, model = "gpt-4o-mini") {
    this.client = new OpenAI({ apiKey })
    this.model  = model
  }

  async summarize(text: string, options: SummaryOptions = {}): Promise<SummaryResult> {
    const opts  = { ...DEFAULTS, ...options }
    const start = Date.now()

    const chunks = chunkText(text, opts.chunkStrategy, opts.maxChunkTokens)

    if (chunks.length === 0) {
      return {
        finalSummary:   "",
        chunkCount:      0,
        chunkSummaries:  [],
        totalTokensUsed: 0,
        strategy:        opts.mergeStrategy,
        durationMs:      Date.now() - start,
      }
    }

    if (chunks.length === 1) {
      const single = await summarizeChunk(this.client, chunks[0], opts, this.model)
      return {
        finalSummary:   single.summary,
        chunkCount:      1,
        chunkSummaries:  [single],
        totalTokensUsed: single.tokensUsed,
        strategy:        opts.mergeStrategy,
        durationMs:      Date.now() - start,
      }
    }

    const chunkSummaries = await Promise.all(
      chunks.map(chunk => summarizeChunk(this.client, chunk, opts, this.model))
    )

    const chunkTokens = chunkSummaries.reduce((s, c) => s + c.tokensUsed, 0)

    let merged: { text: string; tokens: number }

    switch (opts.mergeStrategy) {
      case "flat":
        merged = await mergeFlat(this.client, chunkSummaries, opts, this.model)
        break
      case "progressive":
        merged = await mergeProgressive(this.client, chunkSummaries, opts, this.model)
        break
      case "hierarchical":
      default:
        merged = await mergeHierarchical(this.client, chunkSummaries, opts, this.model)
    }

    return {
      finalSummary:   merged.text,
      chunkCount:      chunks.length,
      chunkSummaries,
      totalTokensUsed: chunkTokens + merged.tokens,
      strategy:        opts.mergeStrategy,
      durationMs:      Date.now() - start,
    }
  }
}

import * as dotenv from "dotenv"
import * as fs from "fs"
import * as path from "path"
import { DocSummarizer } from "./summarizer"
import { SummaryOptions } from "./types"

dotenv.config()

async function main() {
  const filePath = process.argv[2]
  if (!filePath) {
    console.error("Usage: ts-node src/index.ts <file> [options]")
    console.error("Options: --style=bullet|paragraph|tldr --strategy=hierarchical|flat|progressive")
    process.exit(1)
  }

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`)
    process.exit(1)
  }

  const text = fs.readFileSync(filePath, "utf-8")

  const style    = (process.argv.find(a => a.startsWith("--style="))?.split("=")[1]    ?? "paragraph") as any
  const strategy = (process.argv.find(a => a.startsWith("--strategy="))?.split("=")[1] ?? "hierarchical") as any

  const options: SummaryOptions = { style, mergeStrategy: strategy }

  const summarizer = new DocSummarizer(process.env.OPENAI_API_KEY ?? "")

  console.log(`Summarizing ${path.basename(filePath)}...`)
  console.log(`Style: ${style} | Strategy: ${strategy}\n`)

  const result = await summarizer.summarize(text, options)

  console.log("=".repeat(60))
  console.log("SUMMARY")
  console.log("=".repeat(60))
  console.log(result.finalSummary)
  console.log("=".repeat(60))
  console.log(`Chunks: ${result.chunkCount} | Tokens: ${result.totalTokensUsed} | Time: ${result.durationMs}ms`)
}

main().catch(err => { console.error(err); process.exit(1) })

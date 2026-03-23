# doc-summarizer

Batch document summarizer for long texts. Splits documents into chunks, summarizes each in parallel and merges results using configurable strategies — handles documents of any length.

## How It Works
```
Long document
      ↓
Chunker (paragraph / sentence / fixed)
      ↓
Parallel chunk summarization
      ↓
Merge strategy (hierarchical / flat / progressive)
      ↓
Final summary
```

## Merge Strategies

| Strategy | Description | Best for |
|---|---|---|
| `hierarchical` | Merges in batches of 4, repeats until one summary | Long documents |
| `flat` | All chunk summaries merged in one call | Short-medium docs |
| `progressive` | Running summary updated with each chunk | Sequential narratives |

## Chunk Strategies

| Strategy | Description |
|---|---|
| `paragraph` | Splits on double newlines |
| `sentence` | Splits on sentence boundaries |
| `fixed` | Fixed character-count chunks |

## Run
```bash
npm install
export OPENAI_API_KEY=your_key

npm run dev document.txt
npm run dev document.txt --style=bullet
npm run dev document.txt --strategy=progressive --style=tldr
```

## Test
```bash
npm test
```

## Project Structure
```
doc-summarizer/
├── src/
│   ├── index.ts        # CLI entry point
│   ├── summarizer.ts   # DocSummarizer — orchestrates chunking and merging
│   ├── chunker.ts      # Text chunking strategies
│   └── types.ts        # Interfaces and types
├── tests/
│   └── chunker.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Author

**Szymon Wypler** 

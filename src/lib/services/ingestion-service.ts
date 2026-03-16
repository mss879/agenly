import { CHUNK_SIZE, CHUNK_OVERLAP, DEFAULT_CHAT_MODEL } from "@/lib/constants";
import { GoogleGenAI } from "@google/genai";

export interface ChunkResult {
  content: string;
  chunkIndex: number;
  tokenCount: number;
  metadata: Record<string, unknown>;
}

/**
 * Sanitize text to remove characters that Postgres cannot store.
 */
function sanitizeText(text: string): string {
  return text
    .replace(/\u0000/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export class IngestionService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  }

  /**
   * Extract text from file content based on file type.
   * - text/plain, text/markdown: direct text read
   * - application/pdf: uses Gemini AI to extract text (multimodal)
   * - images: stored but not chunk-extracted in v1
   */
  async extractText(fileContent: Buffer, fileType: string, fileName: string): Promise<string> {
    // Plain text files — just decode directly
    if (fileType === "text/plain" || fileType === "text/markdown") {
      const text = fileContent.toString("utf-8");
      console.log(`[Ingestion] Text file "${fileName}": ${text.length} characters`);
      return sanitizeText(text);
    }

    // PDFs — use Gemini to extract text (AI can natively read PDFs)
    if (fileType === "application/pdf") {
      return this.extractTextWithGemini(fileContent, fileType, fileName);
    }

    // Images — use Gemini vision to extract text and describe content
    if (fileType.startsWith("image/")) {
      return this.extractTextWithGemini(fileContent, fileType, fileName);
    }

    // Audio — skip for v1
    if (fileType.startsWith("audio/")) {
      console.log(`[Ingestion] Audio file "${fileName}": skipping text extraction (v1)`);
      return "";
    }

    console.log(`[Ingestion] Unknown file type "${fileType}" for "${fileName}": skipping`);
    return "";
  }

  /**
   * Use Gemini AI to extract text from a PDF or document.
   * Gemini can natively read PDFs — no need for pdf-parse libraries.
   */
  private async extractTextWithGemini(fileContent: Buffer, mimeType: string, fileName: string): Promise<string> {
    try {
      console.log(`[Ingestion] Using Gemini to extract text from "${fileName}" (${fileContent.length} bytes)`);

      const base64Data = fileContent.toString("base64");

      const response = await this.ai.models.generateContent({
        model: DEFAULT_CHAT_MODEL,
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
              {
                text: mimeType === "application/pdf"
                  ? `Extract ALL text content from this document. 
Return ONLY the extracted text, preserving the original structure and formatting as much as possible.
Do NOT add any commentary, headers, or formatting that wasn't in the original document.
Do NOT summarize — extract the complete text word for word.`
                  : `Analyze this image thoroughly and extract ALL information from it.
Include:
- All visible text, labels, captions, and numbers
- Description of charts, graphs, diagrams, or infographics
- Key data points and relationships shown
- Any branding, logos, or company information visible
Return the information as organized, readable text that captures everything in the image.`,
              },
            ],
          },
        ],
        config: {
          temperature: 0,
          maxOutputTokens: 65536,
        },
      });

      const extractedText = response.text || "";
      console.log(`[Ingestion] Gemini extracted ${extractedText.length} characters from "${fileName}"`);

      if (extractedText.length < 10) {
        console.warn(`[Ingestion] Warning: Very little text extracted from "${fileName}"`);
      }

      return sanitizeText(extractedText);
    } catch (error) {
      console.error(`[Ingestion] Gemini extraction failed for "${fileName}":`, error instanceof Error ? error.message : error);
      return "";
    }
  }

  /**
   * Split text into overlapping chunks.
   */
  splitIntoChunks(text: string, fileName: string): ChunkResult[] {
    if (!text || text.trim().length === 0) return [];

    const words = text.split(/\s+/);
    const chunks: ChunkResult[] = [];
    const chunkWordSize = CHUNK_SIZE;
    const overlapWords = CHUNK_OVERLAP;

    let i = 0;
    let chunkIndex = 0;

    while (i < words.length) {
      const chunkWords = words.slice(i, i + chunkWordSize);
      const content = sanitizeText(chunkWords.join(" "));

      if (content.length > 0) {
        chunks.push({
          content,
          chunkIndex,
          tokenCount: Math.ceil(content.length / 4),
          metadata: {
            source: fileName,
            wordStart: i,
            wordEnd: Math.min(i + chunkWordSize, words.length),
          },
        });
      }

      i += chunkWordSize - overlapWords;
      chunkIndex++;
    }

    console.log(`[Ingestion] "${fileName}": ${words.length} words → ${chunks.length} chunks`);
    return chunks;
  }

  /**
   * Full ingestion pipeline: extract text and split into chunks.
   */
  async processFile(
    fileContent: Buffer,
    fileType: string,
    fileName: string
  ): Promise<ChunkResult[]> {
    const text = await this.extractText(fileContent, fileType, fileName);
    if (!text) return [];
    return this.splitIntoChunks(text, fileName);
  }
}

export const ingestionService = new IngestionService();

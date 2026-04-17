import { createRequire } from "module";
import { callLLM, callVisionLLM } from "@/lib/llm";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse/lib/pdf-parse.js") as (buffer: Buffer) => Promise<{ text?: string }>;

const DOCUMENT_ANALYSIS_SYSTEM_PROMPT = `
You are an assistant for a consumer kidney-health app.
Your task is to analyze a user-provided lab or medical document and return a deeper, non-diagnostic explanation in plain language.

Rules:
- Do not provide a diagnosis.
- Do not recommend starting, stopping, or changing treatment.
- Do not tell the user that a result proves a disease.
- Use cautious consumer language like "may", "can", "suggests", "appears", or "ask your clinician".
- Explain what each marker generally measures and why someone might care about it.
- If the document includes reference ranges, compare against those. If not, say the document may need clinician interpretation.
- If information is unclear, say so explicitly instead of guessing.
- Offer practical follow-up questions or recordkeeping suggestions, not medical instructions.
- Return strict JSON with this shape:
{
  "overallTakeaway": "4-6 sentence plain-language overview",
  "markers": [
    {
      "marker": "eGFR",
      "value": "54",
      "unit": "mL/min/1.73m²",
      "status": "Below the reference range shown on the report",
      "meaning": "eGFR is a common estimate of kidney filtration.",
      "whyItMayMatter": "Lower values may deserve follow-up in context with other labs and health history.",
      "whatToReview": "A user may want to ask whether this fits prior kidney trends, hydration status, or repeat testing."
    }
  ],
  "nextSteps": [
    "Compare these numbers with prior lab reports to see whether they are stable, improving, or worsening.",
    "Ask your clinician which results matter most for your personal history and whether any repeat testing is needed."
  ],
  "consumerNotice": "Informational only. This is not medical advice, diagnosis, or treatment."
}
`;

type AnalysisResult = {
  aiSummary: string | null;
  aiFeedback: string | null;
};

type ParsedAnalysis = {
  overallTakeaway?: string;
  markers?: Array<Record<string, string>>;
  nextSteps?: string[];
  consumerNotice?: string;
};

function parseJSONFromLLM(value: string): ParsedAnalysis | null {
  try {
    const start = value.indexOf("{");
    const end = value.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    return JSON.parse(value.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const parsed = await pdf(buffer);
    return String(parsed?.text ?? "").trim();
  } catch (error) {
    console.error("pdf text extraction failed:", error);
    return "";
  }
}

function buildAnalysisResponse(llmRaw: string): AnalysisResult {
  if (!llmRaw || llmRaw.startsWith("ERROR_")) {
    return {
      aiSummary: "Automated analysis is currently unavailable for this document.",
      aiFeedback: "Informational only. Please review the original file and verify any findings with your clinician.",
    };
  }

  const parsed = parseJSONFromLLM(llmRaw);
  if (!parsed) {
    return {
      aiSummary: "Automated review completed, but the response could not be structured cleanly.",
      aiFeedback: "Informational only. Use the original document as the source of truth and confirm questions with your clinician.",
    };
  }

  const markers = (parsed.markers ?? [])
    .slice(0, 6)
    .map((item) => {
      const marker = item.marker?.trim();
      const value = item.value?.trim();
      const unit = item.unit?.trim();
      const status = item.status?.trim();
      const meaning = item.meaning?.trim();
      const whyItMayMatter = item.whyItMayMatter?.trim();
      const whatToReview = item.whatToReview?.trim();
      const lines = [
        [marker, value ? `${value}${unit ? ` ${unit}` : ""}` : "", status].filter(Boolean).join(" — "),
        meaning ? `What it generally means: ${meaning}` : "",
        whyItMayMatter ? `Why it may matter: ${whyItMayMatter}` : "",
        whatToReview ? `What you may want to review: ${whatToReview}` : "",
      ].filter(Boolean);
      return lines.join("\n");
    })
    .filter(Boolean);

  const nextSteps = (parsed.nextSteps ?? [])
    .map((step) => step.trim())
    .filter(Boolean)
    .slice(0, 4);

  return {
    aiSummary: parsed.overallTakeaway?.trim() || "Automated review completed.",
    aiFeedback: [
      ...(markers.length ? ["Marker-by-marker review:", ...markers] : []),
      ...(nextSteps.length ? ["", "What the user may want to do next:", ...nextSteps.map((step) => `- ${step}`)] : []),
      parsed.consumerNotice?.trim() || "Informational only. This is not medical advice.",
    ].join("\n"),
  };
}

export async function analyzeDocument(params: {
  mimeType: string;
  buffer: Buffer;
  title: string;
  category: string;
  previewImageMimeType?: string;
  previewImageBase64?: string;
}): Promise<AnalysisResult> {
  let llmRaw = "";

  if (params.mimeType === "application/pdf") {
    const text = await extractPdfText(params.buffer);
    if (text) {
      llmRaw = await callLLM(
        DOCUMENT_ANALYSIS_SYSTEM_PROMPT,
        `Document title: ${params.title}\nCategory: ${params.category}\n\nDocument text:\n${text.slice(0, 18000)}`
      );
      return buildAnalysisResponse(llmRaw);
    }

    if (params.previewImageMimeType && params.previewImageBase64) {
      llmRaw = await callVisionLLM({
        systemPrompt: DOCUMENT_ANALYSIS_SYSTEM_PROMPT,
        userPrompt: `Analyze this uploaded ${params.category.toLowerCase()} PDF preview image. Extract visible lab markers and produce a deeper consumer-friendly, informational summary.`,
        mimeType: params.previewImageMimeType,
        base64Data: params.previewImageBase64,
      });
      return buildAnalysisResponse(llmRaw);
    }

    return {
      aiSummary: "Analysis unavailable for this PDF because readable text could not be extracted.",
      aiFeedback: "Informational only. Upload a text-based PDF or allow the web uploader to generate a preview image so the document can be reviewed more reliably.",
    };
  }

  if (params.mimeType.startsWith("image/")) {
    llmRaw = await callVisionLLM({
      systemPrompt: DOCUMENT_ANALYSIS_SYSTEM_PROMPT,
      userPrompt: `Analyze this uploaded ${params.category.toLowerCase()} document image. Extract visible lab markers and produce a consumer-friendly informational summary.`,
      mimeType: params.mimeType,
      base64Data: params.buffer.toString("base64"),
    });
    return buildAnalysisResponse(llmRaw);
  }

  return {
    aiSummary: "Automated analysis is unavailable for this file type.",
    aiFeedback: "Informational only. Please review the original document directly.",
  };
}

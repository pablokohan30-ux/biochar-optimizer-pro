import { GoogleGenerativeAI } from "@google/generative-ai";

export type Role = "system" | "user" | "assistant";

export type Message = {
  role: Role;
  content: string;
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

export type InvokeParams = {
  messages: Message[];
  maxTokens?: number;
  max_tokens?: number;
  response_format?: ResponseFormat;
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | null;
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

let _client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!_client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }
    _client = new GoogleGenerativeAI(apiKey);
  }
  return _client;
}

// ─── PDF extraction ────────────────────────────────────────────────────────
// Uses Gemini's native PDF support (up to ~1000 pages / 50MB).
// Pass a base64-encoded PDF + a prompt describing what to extract.
// Returns the raw text/JSON response from the model.

export type ExtractFromPdfParams = {
  /** Base64-encoded PDF content (no data URL prefix). */
  pdfBase64: string;
  /** System prompt describing the extraction task. */
  systemInstruction: string;
  /** User prompt — usually "Extract the requested fields from this document." */
  userPrompt: string;
  /** Optional JSON schema to enforce response structure. */
  jsonSchema?: Record<string, unknown>;
};

export async function extractFromPdf(params: ExtractFromPdfParams): Promise<string> {
  const client = getClient();

  let systemInstruction = params.systemInstruction;
  if (params.jsonSchema) {
    systemInstruction += `\n\nCRITICAL: You MUST respond with valid JSON matching this schema:\n${JSON.stringify(params.jsonSchema, null, 2)}\n\nRespond ONLY with the JSON object, no markdown, no code fences, no other text. Use null for missing fields.`;
  }

  const model = client.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction,
  });

  const result = await model.generateContent({
    contents: [{
      role: "user",
      parts: [
        { text: params.userPrompt },
        { inlineData: { mimeType: "application/pdf", data: params.pdfBase64 } },
      ],
    }],
  });

  let text = result.response.text();
  // Strip markdown code fences if present
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }
  return text;
}

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const client = getClient();

  // Separate system and chat messages
  const systemMessages = params.messages.filter(m => m.role === "system");
  const chatMessages = params.messages.filter(m => m.role !== "system");

  let systemInstruction = systemMessages.map(m => m.content).join("\n");

  // If JSON response format requested, add instruction
  if (params.response_format?.type === "json_schema") {
    const schema = params.response_format.json_schema;
    systemInstruction += `\n\nIMPORTANT: You MUST respond with valid JSON matching this schema:\n${JSON.stringify(schema.schema, null, 2)}\n\nRespond ONLY with the JSON object, no markdown, no code fences, no other text.`;
  } else if (params.response_format?.type === "json_object") {
    systemInstruction += "\n\nIMPORTANT: Respond with valid JSON only, no markdown, no code fences, no other text.";
  }

  const model = client.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction,
  });

  const contents = chatMessages.map(m => ({
    role: m.role === "assistant" ? "model" as const : "user" as const,
    parts: [{ text: m.content }],
  }));

  const result = await model.generateContent({ contents });
  const response = result.response;
  let text = response.text();

  // Strip markdown code fences if present
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }

  return {
    id: `gemini-${Date.now()}`,
    created: Math.floor(Date.now() / 1000),
    model: "gemini-2.5-flash",
    choices: [{
      index: 0,
      message: {
        role: "assistant",
        content: text || null,
      },
      finish_reason: "stop",
    }],
    usage: {
      prompt_tokens: response.usageMetadata?.promptTokenCount ?? 0,
      completion_tokens: response.usageMetadata?.candidatesTokenCount ?? 0,
      total_tokens: response.usageMetadata?.totalTokenCount ?? 0,
    },
  };
}

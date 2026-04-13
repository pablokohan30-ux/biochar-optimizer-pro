import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the LLM module
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

import { invokeLLM } from "./_core/llm";

const mockInvokeLLM = vi.mocked(invokeLLM);

// Helper to simulate the biomass search logic (extracted from routers.ts)
async function searchBiomass(query: string) {
  const systemPrompt = `You are an expert in biomass characterization and pyrolysis science.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Find biomass properties for: "${query}"` },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "biomass_properties",
        strict: true,
        schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            C: { type: "number" },
            H: { type: "number" },
            O: { type: "number" },
            N: { type: "number" },
            S: { type: "number" },
            ash: { type: "number" },
            moisture: { type: "number" },
            anchor_T: { type: "number" },
            anchor_t: { type: "number" },
            anchor_C: { type: "number" },
            anchor_H: { type: "number" },
            source: { type: "string" },
            notes: { type: "string" },
          },
          required: [
            "name", "C", "H", "O", "N", "S", "ash", "moisture",
            "anchor_T", "anchor_t", "anchor_C", "anchor_H", "source", "notes",
          ],
          additionalProperties: false,
        },
      },
    },
  });

  const rawContent = response.choices[0]?.message?.content;
  if (!rawContent) return null;
  const content = typeof rawContent === "string" ? rawContent : null;
  if (!content) return null;

  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

describe("Biomass AI Search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return parsed biomass data when LLM returns valid JSON", async () => {
    const mockBiomass = {
      name: "Walnut Shell",
      C: 52.3,
      H: 5.8,
      O: 40.1,
      N: 0.5,
      S: 0.1,
      ash: 1.2,
      moisture: 8.0,
      anchor_T: 650,
      anchor_t: 30,
      anchor_C: 88.0,
      anchor_H: 0.22,
      source: "Phyllis2 Database",
      notes: "Typical hardwood shell composition",
    };

    mockInvokeLLM.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify(mockBiomass) } }],
    } as any);

    const result = await searchBiomass("walnut shell");
    expect(result).not.toBeNull();
    expect(result.name).toBe("Walnut Shell");
    expect(result.C).toBe(52.3);
    expect(result.anchor_T).toBe(650);
    expect(result.source).toBe("Phyllis2 Database");
  });

  it("should return null when LLM returns empty content", async () => {
    mockInvokeLLM.mockResolvedValueOnce({
      choices: [{ message: { content: "" } }],
    } as any);

    const result = await searchBiomass("unknown biomass xyz");
    expect(result).toBeNull();
  });

  it("should return null when LLM returns invalid JSON", async () => {
    mockInvokeLLM.mockResolvedValueOnce({
      choices: [{ message: { content: "not valid json {{{" } }],
    } as any);

    const result = await searchBiomass("some biomass");
    expect(result).toBeNull();
  });

  it("should return null when LLM returns no choices", async () => {
    mockInvokeLLM.mockResolvedValueOnce({
      choices: [],
    } as any);

    const result = await searchBiomass("some biomass");
    expect(result).toBeNull();
  });

  it("should pass the query correctly to the LLM", async () => {
    mockInvokeLLM.mockResolvedValueOnce({
      choices: [{ message: { content: null } }],
    } as any);

    await searchBiomass("wheat straw");
    expect(mockInvokeLLM).toHaveBeenCalledOnce();
    const callArgs = mockInvokeLLM.mock.calls[0][0];
    expect(callArgs.messages[1].content).toContain("wheat straw");
  });
});

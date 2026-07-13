import { describe, it, expect } from "vitest";
import { flattenPddPreFillContent } from "./aiBuilderRouter";

/**
 * Sprint 4 — verifies that the AI Project Builder's `pdd-pre-fill` doc,
 * once handed off to the PDD Builder, correctly turns table-typed answers
 * (structuredRows) into JSON-stringified arrays that PddTableInput picks
 * up, while leaving prose answers as plain strings.
 */
describe("flattenPddPreFillContent", () => {
  it("returns {} on invalid JSON", () => {
    expect(flattenPddPreFillContent("not-json")).toEqual({});
  });

  it("returns {} when workstreams are missing", () => {
    expect(flattenPddPreFillContent(JSON.stringify({ other: [] }))).toEqual({});
  });

  it("serializes structuredRows into JSON-stringified arrays for table questions", () => {
    const payload = JSON.stringify({
      workstreams: [
        {
          id: "qualities",
          title: "B. Project Qualities",
          answers: [
            {
              questionId: "riskRegister",
              draftAnswer: "Top 5 risks summarized below.",
              structuredRows: [
                { type: "financial", description: "Funding gap", mitigation: "Investor discussions", level: "medium", supportingDoc: "Risk Assessment" },
                { type: "technology", description: "Pyrolyzer performance", mitigation: "OEM supervision", level: "low", supportingDoc: "Quotation" },
              ],
              confidence: "MEDIUM",
              requiresUserInput: true,
            },
          ],
        },
      ],
    });
    const flat = flattenPddPreFillContent(payload);
    expect(flat.riskRegister).toBeDefined();
    const rows = JSON.parse(flat.riskRegister);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      type: "financial",
      description: "Funding gap",
      mitigation: "Investor discussions",
      level: "medium",
      supportingDoc: "Risk Assessment",
    });
  });

  it("falls back to draftAnswer for prose questions (empty structuredRows)", () => {
    const payload = JSON.stringify({
      workstreams: [
        {
          id: "feedstock",
          answers: [
            {
              questionId: "counterfactualUse",
              draftAnswer: "The forestry residues would decompose in situ.",
              confidence: "HIGH",
              requiresUserInput: false,
            },
          ],
        },
      ],
    });
    const flat = flattenPddPreFillContent(payload);
    expect(flat.counterfactualUse).toBe("The forestry residues would decompose in situ.");
  });

  it("prefers structuredRows over draftAnswer when both are present and non-empty", () => {
    const payload = JSON.stringify({
      workstreams: [
        {
          id: "financial",
          answers: [
            {
              questionId: "capex",
              draftAnswer: "See table below.",
              structuredRows: [
                { item: "Pyrolyzer", phase: "phase-1", costUsd: "1200000", notes: "Beston BST-50" },
              ],
              confidence: "MEDIUM",
              requiresUserInput: true,
            },
          ],
        },
      ],
    });
    const flat = flattenPddPreFillContent(payload);
    // Should be JSON, not prose
    expect(() => JSON.parse(flat.capex)).not.toThrow();
    const rows = JSON.parse(flat.capex);
    expect(rows[0].item).toBe("Pyrolyzer");
    expect(flat.capex).not.toContain("See table below.");
  });

  it("falls back to draftAnswer when structuredRows are all empty rows", () => {
    const payload = JSON.stringify({
      workstreams: [
        {
          id: "electrical",
          answers: [
            {
              questionId: "qualityParameters",
              draftAnswer: "QC parameters to be defined during commissioning.",
              structuredRows: [{ parameter: "", target: "", testMethod: "", frequency: "" }],
              confidence: "LOW",
              requiresUserInput: true,
            },
          ],
        },
      ],
    });
    const flat = flattenPddPreFillContent(payload);
    expect(flat.qualityParameters).toBe("QC parameters to be defined during commissioning.");
  });

  it("coerces non-string cell values to strings and preserves nulls as empty strings", () => {
    const payload = JSON.stringify({
      workstreams: [
        {
          id: "equipment",
          answers: [
            {
              questionId: "pyrolysisUnits",
              draftAnswer: "One pyrolysis reactor",
              structuredRows: [
                {
                  unitId: "R-01",
                  makeModel: "Beston BST-50",
                  capacityKgh: 250,      // number
                  tempC: 650,             // number
                  residenceMin: 30,       // number
                  powerKw: null,          // null
                  status: "quoted",
                },
              ],
              confidence: "MEDIUM",
              requiresUserInput: false,
            },
          ],
        },
      ],
    });
    const flat = flattenPddPreFillContent(payload);
    const rows = JSON.parse(flat.pyrolysisUnits);
    expect(rows[0].capacityKgh).toBe("250");
    expect(rows[0].tempC).toBe("650");
    expect(rows[0].powerKw).toBe("");
    expect(rows[0].status).toBe("quoted");
  });

  it("skips answers that have neither structuredRows nor a draftAnswer string", () => {
    const payload = JSON.stringify({
      workstreams: [
        {
          id: "parties",
          answers: [
            { questionId: "projectDeveloper" }, // no draftAnswer
            { questionId: "commercialPartners", draftAnswer: "See table.", structuredRows: [] },
          ],
        },
      ],
    });
    const flat = flattenPddPreFillContent(payload);
    expect(flat.projectDeveloper).toBeUndefined();
    // commercialPartners falls back to draftAnswer because rows are empty
    expect(flat.commercialPartners).toBe("See table.");
  });
});

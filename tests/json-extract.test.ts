import { describe, it, expect } from "vitest";
import { extractJsonObject } from "@/lib/ai/json-extract";

describe("extractJsonObject", () => {
  it("parses a clean JSON object", () => {
    expect(extractJsonObject('{"a":1}')).toEqual({ a: 1 });
  });

  it("ignores trailing content after the object", () => {
    // This is the exact shape that broke the Patterns tab during diagnosis.
    const raw = '{"status":"complete","bias":"bearish"}\n\nLet me know if you need more.';
    expect(extractJsonObject(raw)).toEqual({ status: "complete", bias: "bearish" });
  });

  it("keeps only the first object when the model emits two", () => {
    const raw = '{"first":true}\n{"second":true}';
    expect(extractJsonObject(raw)).toEqual({ first: true });
  });

  it("handles a markdown fence", () => {
    const raw = '```json\n{"bias":"bullish"}\n```';
    expect(extractJsonObject(raw)).toEqual({ bias: "bullish" });
  });

  it("does not terminate early on a brace inside a string", () => {
    const raw = '{"rationale":"demand zone {supply} holds","levels":[1,2]} trailing';
    expect(extractJsonObject(raw)).toEqual({
      rationale: "demand zone {supply} holds",
      levels: [1, 2],
    });
  });

  it("handles escaped quotes and backslashes", () => {
    const raw = '{"note":"he said \\"buy\\" at {1.10}","ok":true} junk';
    expect(extractJsonObject(raw)).toEqual({ note: 'he said "buy" at {1.10}', ok: true });
  });

  it("returns undefined for unparseable input", () => {
    expect(extractJsonObject("no json here")).toBeUndefined();
    expect(extractJsonObject("")).toBeUndefined();
    expect(extractJsonObject('{"unclosed": ')).toBeUndefined();
  });

  it("rejects a non-object payload such as a bare number", () => {
    expect(extractJsonObject("42")).toBeUndefined();
    expect(extractJsonObject("[1,2,3]")).toBeUndefined();
  });
});

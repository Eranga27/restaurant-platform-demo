import { describe, expect, it } from "vitest";

import { scriptString } from "@/lib/inline-script";

describe("scriptString", () => {
  it("is a JavaScript string literal with the same value", () => {
    const value = `800 1em 'Bricolage Grotesque', "Fallback" \\ done`;
    expect(JSON.parse(scriptString(value))).toBe(value);
  });

  it("can't close the script tag or break the line", () => {
    const value = "</script><script>alert(1)</script>\u2028\u2029";
    const literal = scriptString(value);
    expect(literal).not.toMatch(/[<>/\u2028\u2029]/);
    expect(JSON.parse(literal)).toBe(value);
  });
});

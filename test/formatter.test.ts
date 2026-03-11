import { describe, it, expect } from "vitest";
import { parseTemplate, formatBranch, previewBranch } from "../src/branch/formatter";

const defaultOptions = {
  separator: "-",
  lowercase: true,
  maxLength: 80,
};

describe("parseTemplate", () => {
  it("extracts variables in order", () => {
    expect(parseTemplate("{user}:{scope}/{type}/{service}/{description}")).toEqual([
      "user",
      "scope",
      "type",
      "service",
      "description",
    ]);
  });

  it("handles a simple template with one variable", () => {
    expect(parseTemplate("{type}/{description}")).toEqual(["type", "description"]);
  });

  it("handles template with no variables", () => {
    expect(parseTemplate("no-variables-here")).toEqual([]);
  });

  it("handles template with custom variables", () => {
    expect(parseTemplate("{team}/{type}/{description}")).toEqual(["team", "type", "description"]);
  });

  it("deduplicates by position (first occurrence counts)", () => {
    const result = parseTemplate("{type}/{type}/{description}");
    expect(result).toEqual(["type", "type", "description"]);
  });
});

describe("formatBranch", () => {
  it("produces the default format branch name", () => {
    const result = formatBranch(
      "{user}:{scope}/{type}/{service}/{description}",
      {
        user: "ty",
        scope: "api",
        type: "feat",
        service: "order-service",
        description: "add-rate-limiter",
      },
      defaultOptions,
    );
    expect(result).toBe("ty:api/feat/order-service/add-rate-limiter");
  });

  it("collapses separators when scope is empty", () => {
    const result = formatBranch(
      "{user}:{scope}/{type}/{service}/{description}",
      {
        user: "ty",
        scope: "",
        type: "feat",
        service: "order-service",
        description: "add-rate-limiter",
      },
      defaultOptions,
    );
    // When scope is empty, {user}:{scope}/{type} becomes "ty:/{type}" → "ty:/feat" → collapsed
    // After collapse: "ty:feat/order-service/add-rate-limiter" (colon+slash → just colon)
    expect(result).not.toContain(":/");
    expect(result).toContain("ty:");
    expect(result).toContain("feat");
  });

  it("lowercases when option is true", () => {
    const result = formatBranch(
      "{type}/{description}",
      { type: "FEAT", description: "MyFeature" },
      { separator: "-", lowercase: true, maxLength: 0 },
    );
    expect(result).toBe("feat/myfeature");
  });

  it("does not lowercase when option is false", () => {
    const result = formatBranch(
      "{type}/{description}",
      { type: "FEAT", description: "MyFeature" },
      { separator: "-", lowercase: false, maxLength: 0 },
    );
    expect(result).toBe("FEAT/MyFeature");
  });

  it("truncates to maxLength", () => {
    const result = formatBranch(
      "{type}/{description}",
      { type: "feat", description: "a-very-long-description-that-exceeds-the-limit-significantly" },
      { separator: "-", lowercase: true, maxLength: 20 },
    );
    expect(result.length).toBeLessThanOrEqual(20);
  });

  it("does not truncate when maxLength is 0", () => {
    const longDesc = "a".repeat(200);
    const result = formatBranch(
      "{type}/{description}",
      { type: "feat", description: longDesc },
      { separator: "-", lowercase: true, maxLength: 0 },
    );
    expect(result.length).toBeGreaterThan(80);
  });

  it("removes unreplaced template tokens", () => {
    const result = formatBranch(
      "{user}:{scope}/{type}/{description}",
      { type: "fix", description: "bug" },
      defaultOptions,
    );
    expect(result).not.toContain("{user}");
    expect(result).not.toContain("{scope}");
  });

  it("strips leading structural characters", () => {
    const result = formatBranch(
      "{scope}/{type}/{description}",
      { scope: "", type: "fix", description: "bug" },
      defaultOptions,
    );
    expect(result).not.toMatch(/^[/:_\-.]/);
  });

  it("strips trailing structural characters", () => {
    const result = formatBranch(
      "{type}/{description}/{scope}",
      { type: "fix", description: "bug", scope: "" },
      defaultOptions,
    );
    expect(result).not.toMatch(/[/:_\-.]$/);
  });

  it("handles all variables empty except description", () => {
    const result = formatBranch(
      "{user}:{scope}/{type}/{description}",
      { user: "", scope: "", type: "", description: "my-branch" },
      defaultOptions,
    );
    expect(result).toBe("my-branch");
  });

  it("handles custom separator in template values", () => {
    const result = formatBranch(
      "{type}/{description}",
      { type: "feat", description: "add feature" },
      { separator: "_", lowercase: true, maxLength: 0 },
    );
    // slugify uses the separator, so spaces → underscores
    expect(result).toBe("feat/add_feature");
  });
});

describe("previewBranch", () => {
  it("shows collected values and keeps unreplaced tokens", () => {
    const result = previewBranch(
      "{user}:{scope}/{type}/{description}",
      { user: "ty", type: "feat" },
      defaultOptions,
    );
    expect(result).toContain("ty");
    expect(result).toContain("feat");
    expect(result).toContain("{scope}");
    expect(result).toContain("{description}");
  });

  it("lowercases replaced portions", () => {
    const result = previewBranch(
      "{type}/{description}",
      { type: "FEAT" },
      defaultOptions,
    );
    expect(result).toContain("feat");
  });
});

import { describe, it, expect } from "vitest";
import { slugify, validateBranchName, sanitizeBranchName } from "../src/branch/sanitizer";

describe("slugify", () => {
  it("replaces spaces with separator", () => {
    expect(slugify("add rate limiter", "-")).toBe("add-rate-limiter");
  });

  it("replaces underscores with separator", () => {
    expect(slugify("add_rate_limiter", "-")).toBe("add-rate-limiter");
  });

  it("strips invalid git ref characters", () => {
    expect(slugify("feat~thing", "-")).not.toContain("~");
    expect(slugify("feat^thing", "-")).not.toContain("^");
    expect(slugify("feat:thing", "-")).not.toContain(":");
    expect(slugify("feat?thing", "-")).not.toContain("?");
    expect(slugify("feat*thing", "-")).not.toContain("*");
    expect(slugify("feat[thing", "-")).not.toContain("[");
  });

  it("removes double dots", () => {
    expect(slugify("feat..thing", "-")).not.toContain("..");
  });

  it("collapses repeated separators", () => {
    expect(slugify("feat---thing", "-")).toBe("feat-thing");
  });

  it("removes leading separator", () => {
    expect(slugify("-feat", "-")).not.toMatch(/^-/);
  });

  it("removes trailing separator", () => {
    expect(slugify("feat-", "-")).not.toMatch(/-$/);
  });

  it("removes leading/trailing dots", () => {
    expect(slugify(".feat.", "-")).not.toMatch(/^\.|\.$/);
  });

  it("uses custom separator", () => {
    expect(slugify("add rate limiter", "_")).toBe("add_rate_limiter");
  });

  it("handles already-clean input unchanged", () => {
    expect(slugify("add-rate-limiter", "-")).toBe("add-rate-limiter");
  });

  it("handles empty string", () => {
    expect(slugify("", "-")).toBe("");
  });

  it("removes trailing .lock", () => {
    expect(slugify("feature.lock", "-")).not.toMatch(/\.lock$/);
  });
});

describe("validateBranchName", () => {
  it("accepts a valid branch name", () => {
    expect(validateBranchName("feat/add-rate-limiter")).toBeUndefined();
  });

  it("rejects a branch with colon", () => {
    // Git does not allow colons in branch names (git-check-ref-format)
    expect(validateBranchName("ty:feat/add-thing")).toBeDefined();
  });

  it("rejects empty string", () => {
    expect(validateBranchName("")).toBeDefined();
  });

  it("rejects whitespace-only string", () => {
    expect(validateBranchName("   ")).toBeDefined();
  });

  it("rejects branch starting with dot", () => {
    expect(validateBranchName(".hidden-branch")).toBeDefined();
  });

  it("rejects branch ending with dot", () => {
    expect(validateBranchName("branch.")).toBeDefined();
  });

  it("rejects branch ending with .lock", () => {
    expect(validateBranchName("branch.lock")).toBeDefined();
  });

  it("rejects branch with double dots", () => {
    expect(validateBranchName("feat..thing")).toBeDefined();
  });

  it("rejects branch with tilde", () => {
    expect(validateBranchName("feat~1")).toBeDefined();
  });

  it("rejects branch with caret", () => {
    expect(validateBranchName("feat^merge")).toBeDefined();
  });

  it("rejects branch with @{", () => {
    expect(validateBranchName("feat@{upstream}")).toBeDefined();
  });

  it("rejects branch with consecutive slashes", () => {
    expect(validateBranchName("feat//thing")).toBeDefined();
  });

  it("rejects branch starting with slash", () => {
    expect(validateBranchName("/feat/thing")).toBeDefined();
  });

  it("rejects branch ending with slash", () => {
    expect(validateBranchName("feat/thing/")).toBeDefined();
  });

  it("rejects branch with space", () => {
    expect(validateBranchName("feat thing")).toBeDefined();
  });
});

describe("sanitizeBranchName", () => {
  it("lowercases when option is true", () => {
    expect(sanitizeBranchName("FEAT/AddThing", "-", true, 0)).toBe("feat/addthing");
  });

  it("does not lowercase when option is false", () => {
    expect(sanitizeBranchName("FEAT/AddThing", "-", false, 0)).toBe("FEAT/AddThing");
  });

  it("truncates to maxLength", () => {
    const long = "feat/" + "a".repeat(100);
    const result = sanitizeBranchName(long, "-", true, 20);
    expect(result.length).toBeLessThanOrEqual(20);
  });

  it("does not truncate when maxLength is 0", () => {
    const long = "feat/" + "a".repeat(100);
    const result = sanitizeBranchName(long, "-", true, 0);
    expect(result.length).toBeGreaterThan(80);
  });

  it("strips leading structural characters", () => {
    const result = sanitizeBranchName("/feat/thing", "-", true, 0);
    expect(result).not.toMatch(/^[/:_\-.]/);
  });

  it("strips trailing structural characters", () => {
    const result = sanitizeBranchName("feat/thing/", "-", true, 0);
    expect(result).not.toMatch(/[/:_\-.]$/);
  });

  it("collapses consecutive slashes", () => {
    const result = sanitizeBranchName("feat//thing", "-", true, 0);
    expect(result).not.toContain("//");
  });

  it("removes .lock suffix", () => {
    const result = sanitizeBranchName("feat.lock", "-", true, 0);
    expect(result).not.toMatch(/\.lock$/);
  });

  it("produces a valid branch name for the default format", () => {
    const result = sanitizeBranchName(
      "ty/api/feat/order-service/add-rate-limiter",
      "-",
      true,
      80,
    );
    expect(validateBranchName(result)).toBeUndefined();
    expect(result).toBe("ty/api/feat/order-service/add-rate-limiter");
  });

  it("replaces colon with separator (colon is invalid in git branch names)", () => {
    // Regression: thanhpp:refactor/go-mod/update-trading-clients was rejected by git
    const result = sanitizeBranchName(
      "thanhpp:refactor/go-mod/update-trading-clients",
      "-",
      true,
      80,
    );
    expect(result).not.toContain(":");
    expect(validateBranchName(result)).toBeUndefined();
  });

  it("collapses double dots", () => {
    const result = sanitizeBranchName("feat..thing", "-", true, 0);
    expect(result).not.toContain("..");
  });
});

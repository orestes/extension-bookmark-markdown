import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import {
  buildFrontMatter,
  injectTagsIntoMarkdown,
  parseMetaDate,
} from "./frontmatter";

function parseFrontMatter(raw: string): Record<string, unknown> {
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) throw new Error("No frontmatter found");
  return parse(match[1]) as Record<string, unknown>;
}

const BASE_INPUT = {
  title: "Test Article",
  url: "https://example.com/article",
  description: "A test description",
  image: "https://example.com/image.jpg",
  sourceTags: ["javascript", "testing"],
  savedAt: "2025-01-15T12:00:00.000Z",
  publishedAt: null,
  updatedAt: null,
} as const;

describe("buildFrontMatter", () => {
  it("emits all required fields in order", () => {
    const raw = buildFrontMatter({ ...BASE_INPUT });
    const fields = parseFrontMatter(raw);

    expect(Object.keys(fields)).toEqual([
      "title",
      "url",
      "description",
      "image",
      "sourceTags",
      "savedAt",
    ]);
    expect(fields.title).toBe("Test Article");
    expect(fields.url).toBe("https://example.com/article");
    expect(fields.description).toBe("A test description");
    expect(fields.image).toBe("https://example.com/image.jpg");
    expect(fields.sourceTags).toEqual(["javascript", "testing"]);
    expect(fields.savedAt).toBe("2025-01-15T12:00:00.000Z");
  });

  it("includes publishedAt when provided", () => {
    const raw = buildFrontMatter({
      ...BASE_INPUT,
      publishedAt: "2025-01-10T08:00:00.000Z",
    });
    const fields = parseFrontMatter(raw);

    expect(fields.publishedAt).toBe("2025-01-10T08:00:00.000Z");
    expect(Object.keys(fields)).toEqual([
      "title",
      "url",
      "description",
      "image",
      "sourceTags",
      "savedAt",
      "publishedAt",
    ]);
  });

  it("includes updatedAt when provided", () => {
    const raw = buildFrontMatter({
      ...BASE_INPUT,
      updatedAt: "2025-01-14T10:00:00.000Z",
    });
    const fields = parseFrontMatter(raw);

    expect(fields.updatedAt).toBe("2025-01-14T10:00:00.000Z");
  });

  it("includes both publishedAt and updatedAt when provided", () => {
    const raw = buildFrontMatter({
      ...BASE_INPUT,
      publishedAt: "2025-01-10T08:00:00.000Z",
      updatedAt: "2025-01-14T10:00:00.000Z",
    });
    const fields = parseFrontMatter(raw);

    expect(Object.keys(fields)).toEqual([
      "title",
      "url",
      "description",
      "image",
      "sourceTags",
      "savedAt",
      "publishedAt",
      "updatedAt",
    ]);
  });

  it("omits publishedAt and updatedAt when null", () => {
    const raw = buildFrontMatter({ ...BASE_INPUT });
    const fields = parseFrontMatter(raw);

    expect(fields).not.toHaveProperty("publishedAt");
    expect(fields).not.toHaveProperty("updatedAt");
  });

  it("wraps output in YAML frontmatter delimiters", () => {
    const raw = buildFrontMatter({ ...BASE_INPUT });

    expect(raw).toMatch(/^---\n/);
    expect(raw).toMatch(/\n---\n\n$/);
  });

  it("emits empty sourceTags as empty array", () => {
    const raw = buildFrontMatter({ ...BASE_INPUT, sourceTags: [] });
    const fields = parseFrontMatter(raw);

    expect(fields.sourceTags).toEqual([]);
  });
});

describe("parseMetaDate", () => {
  it("returns ISO string for valid date", () => {
    expect(parseMetaDate("2025-01-15T12:00:00Z")).toBe(
      "2025-01-15T12:00:00.000Z",
    );
  });

  it("parses date-only strings", () => {
    const result = parseMetaDate("2025-01-15");
    expect(result).toMatch(/^2025-01-15T/);
  });

  it("returns null for null input", () => {
    expect(parseMetaDate(null)).toBeNull();
  });

  it("returns null for invalid date", () => {
    expect(parseMetaDate("not-a-date")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseMetaDate("")).toBeNull();
  });
});

describe("injectTagsIntoMarkdown", () => {
  const sampleMarkdown = buildFrontMatter({ ...BASE_INPUT });

  it("injects tags field before sourceTags", () => {
    const result = injectTagsIntoMarkdown(sampleMarkdown, [
      "my-tag",
      "reading",
    ]);
    const fields = parseFrontMatter(result);

    expect(fields.tags).toEqual(["my-tag", "reading"]);

    const keys = Object.keys(fields);
    expect(keys.indexOf("tags")).toBeLessThan(keys.indexOf("sourceTags"));
  });

  it("preserves all existing fields", () => {
    const result = injectTagsIntoMarkdown(sampleMarkdown, ["my-tag"]);
    const fields = parseFrontMatter(result);

    expect(fields.title).toBe("Test Article");
    expect(fields.url).toBe("https://example.com/article");
    expect(fields.description).toBe("A test description");
    expect(fields.image).toBe("https://example.com/image.jpg");
    expect(fields.sourceTags).toEqual(["javascript", "testing"]);
    expect(fields.savedAt).toBe("2025-01-15T12:00:00.000Z");
  });

  it("handles empty tags array", () => {
    const result = injectTagsIntoMarkdown(sampleMarkdown, []);
    const fields = parseFrontMatter(result);

    expect(fields.tags).toEqual([]);
  });

  it("returns markdown unchanged when no frontmatter closing delimiter", () => {
    const noFrontMatter = "Just some text";
    const result = injectTagsIntoMarkdown(noFrontMatter, ["tag"]);

    expect(result).toBe(noFrontMatter);
  });

  it("produces valid YAML after injection", () => {
    const withDates = buildFrontMatter({
      ...BASE_INPUT,
      publishedAt: "2025-01-10T08:00:00.000Z",
      updatedAt: "2025-01-14T10:00:00.000Z",
    });
    const result = injectTagsIntoMarkdown(withDates, ["research", "ai"]);
    const fields = parseFrontMatter(result);

    expect(Object.keys(fields)).toEqual([
      "title",
      "url",
      "description",
      "image",
      "tags",
      "sourceTags",
      "savedAt",
      "publishedAt",
      "updatedAt",
    ]);
  });
});

import { describe, expect, it } from "vitest";
import { extractKeywordsFromJsonLd } from "./json-ld";

const TECHCRUNCH_JSONLD = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "NewsArticle",
      headline: "Anthropic's Claude Tag is learning your company",
      keywords: ["Anthropic", "Claude", "claude tag", "Enterprise AI"],
      articleSection: ["AI", "Enterprise"],
    },
    {
      "@type": "WebPage",
      name: "Some page",
    },
  ],
});

describe("extractKeywordsFromJsonLd", () => {
  it("extracts keywords array from @graph NewsArticle", () => {
    expect(extractKeywordsFromJsonLd([TECHCRUNCH_JSONLD])).toEqual([
      "Anthropic",
      "Claude",
      "claude tag",
      "Enterprise AI",
    ]);
  });

  it("handles flat (non-graph) article object", () => {
    const flat = JSON.stringify({
      "@type": "BlogPosting",
      keywords: ["react", "typescript"],
    });
    expect(extractKeywordsFromJsonLd([flat])).toEqual(["react", "typescript"]);
  });

  it("handles comma-separated keywords string", () => {
    const csv = JSON.stringify({
      "@type": "Article",
      keywords: "ai, machine learning, llm",
    });
    expect(extractKeywordsFromJsonLd([csv])).toEqual([
      "ai",
      "machine learning",
      "llm",
    ]);
  });

  it("handles multi-type @type array", () => {
    const multi = JSON.stringify({
      "@type": ["NewsArticle", "WebPage"],
      keywords: ["multi-type"],
    });
    expect(extractKeywordsFromJsonLd([multi])).toEqual(["multi-type"]);
  });

  it("skips non-article types", () => {
    const product = JSON.stringify({
      "@type": "Product",
      keywords: ["should", "not", "match"],
    });
    expect(extractKeywordsFromJsonLd([product])).toEqual([]);
  });

  it("returns empty array when no JSON-LD blocks", () => {
    expect(extractKeywordsFromJsonLd([])).toEqual([]);
  });

  it("skips malformed JSON", () => {
    expect(extractKeywordsFromJsonLd(["not valid json"])).toEqual([]);
  });

  it("skips malformed JSON and continues to valid block", () => {
    const valid = JSON.stringify({
      "@type": "Article",
      keywords: ["found"],
    });
    expect(extractKeywordsFromJsonLd(["{{invalid", valid])).toEqual(["found"]);
  });

  it("filters non-string entries from keywords array", () => {
    const mixed = JSON.stringify({
      "@type": "Article",
      keywords: ["valid", 42, null, "also-valid"],
    });
    expect(extractKeywordsFromJsonLd([mixed])).toEqual([
      "valid",
      "also-valid",
    ]);
  });

  it("returns empty array when article has no keywords field", () => {
    const noKw = JSON.stringify({
      "@type": "NewsArticle",
      headline: "No keywords here",
    });
    expect(extractKeywordsFromJsonLd([noKw])).toEqual([]);
  });

  it("handles empty string in keywords string", () => {
    const empty = JSON.stringify({
      "@type": "Article",
      keywords: ",tag1,,tag2,",
    });
    expect(extractKeywordsFromJsonLd([empty])).toEqual(["tag1", "tag2"]);
  });

  it("recognizes all supported article types", () => {
    const types = [
      "Article",
      "NewsArticle",
      "BlogPosting",
      "TechArticle",
      "ScholarlyArticle",
      "AnalysisNewsArticle",
      "ReportageNewsArticle",
      "ReviewNewsArticle",
    ];
    for (const t of types) {
      const block = JSON.stringify({ "@type": t, keywords: [t] });
      expect(extractKeywordsFromJsonLd([block])).toEqual([t]);
    }
  });
});

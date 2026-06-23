const ARTICLE_TYPES = new Set([
  "Article",
  "NewsArticle",
  "BlogPosting",
  "TechArticle",
  "ScholarlyArticle",
  "AnalysisNewsArticle",
  "ReportageNewsArticle",
  "ReviewNewsArticle",
]);

export function extractKeywordsFromJsonLd(rawBlocks: string[]): string[] {
  for (const raw of rawBlocks) {
    try {
      const data = JSON.parse(raw);
      const entities: unknown[] = Array.isArray(data["@graph"])
        ? data["@graph"]
        : [data];

      for (const entity of entities) {
        if (typeof entity !== "object" || entity === null) continue;
        const record = entity as Record<string, unknown>;
        const type = record["@type"];
        const types = Array.isArray(type) ? type : [type];
        if (!types.some((t) => typeof t === "string" && ARTICLE_TYPES.has(t)))
          continue;

        const kw = record["keywords"];
        if (Array.isArray(kw)) return kw.filter((k) => typeof k === "string");
        if (typeof kw === "string")
          return kw
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean);
      }
    } catch {
      // malformed JSON-LD block, skip
    }
  }

  return [];
}

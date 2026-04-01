import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";
import { stringify } from "yaml";

function getOgProperty(property: string): string | null {
  return (
    document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)
      ?.content ?? null
  );
}

function getOgTags(): string[] {
  return Array.from(
    document.querySelectorAll<HTMLMetaElement>('meta[property="article:tag"]'),
  ).map((el) => el.content);
}

function extractArticle(): ReturnType<Readability["parse"]> {
  return new Readability(document.cloneNode(true) as Document).parse();
}

function sanitizeImageUrl(url: string | null): string {
  if (!url) return "";
  try {
    const { protocol } = new URL(url);
    return protocol === "http:" || protocol === "https:" ? url : "";
  } catch {
    return "";
  }
}

function buildFrontMatter(article: ReturnType<Readability["parse"]>): string {
  return (
    "---\n" +
    stringify({
      title: getOgProperty("og:title") ?? article?.title ?? document.title,
      url: window.location.href,
      description: getOgProperty("og:description") ?? "",
      image: sanitizeImageUrl(getOgProperty("og:image")),
      tags: getOgTags(),
    }) +
    "---\n\n"
  );
}

function articleToMarkdown(
  article: NonNullable<ReturnType<Readability["parse"]>>,
): string {
  const td = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
  });
  return td.turndown(article.content ?? "");
}

function generateFilename(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-");
  return (slug || "untitled") + ".md";
}

function extractPageAsMarkdown(): string {
  const article = extractArticle();
  if (!article) return "Could not extract content from this page.";
  return buildFrontMatter(article) + articleToMarkdown(article);
}

const title = getOgProperty("og:title") ?? document.title;
// esbuild bundles this file as an IIFE, so it cannot return a value from
// executeScript. Globals are the only way to pass data back to the caller.
(window as any).__bookmarkMarkdown = extractPageAsMarkdown();
(window as any).__bookmarkFilename = generateFilename(title);
(window as any).__bookmarkMeta = {
  title,
  description: getOgProperty("og:description") ?? "",
  image: sanitizeImageUrl(getOgProperty("og:image")),
  url: window.location.href,
};

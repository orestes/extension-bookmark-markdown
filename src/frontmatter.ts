import { stringify } from "yaml";

export interface FrontMatterInput {
  title: string;
  url: string;
  description: string;
  image: string;
  sourceTags: readonly string[];
  savedAt: string;
  publishedAt: string | null;
  updatedAt: string | null;
}

export function buildFrontMatter(input: FrontMatterInput): string {
  const fields: Record<string, unknown> = {
    title: input.title,
    url: input.url,
    description: input.description,
    image: input.image,
    sourceTags: input.sourceTags,
    savedAt: input.savedAt,
  };
  if (input.publishedAt) fields.publishedAt = input.publishedAt;
  if (input.updatedAt) fields.updatedAt = input.updatedAt;

  return "---\n" + stringify(fields) + "---\n\n";
}

export function parseMetaDate(raw: string | null): string | null {
  if (!raw) return null;
  const ms = Date.parse(raw);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toISOString();
}

export function injectTagsIntoMarkdown(
  markdown: string,
  tags: string[],
): string {
  const tagsYaml = stringify({ tags }).trimEnd();

  const closingPos = markdown.indexOf("\n---", 3);
  if (closingPos === -1) return markdown;

  const beforeClose = markdown.slice(0, closingPos);
  const sourceTagsPos = beforeClose.indexOf("\nsourceTags:");
  if (sourceTagsPos === -1) {
    return beforeClose + "\n" + tagsYaml + markdown.slice(closingPos);
  }

  return (
    beforeClose.slice(0, sourceTagsPos) +
    "\n" +
    tagsYaml +
    beforeClose.slice(sourceTagsPos) +
    markdown.slice(closingPos)
  );
}

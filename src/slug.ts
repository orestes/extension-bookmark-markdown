import slugify from "@sindresorhus/slugify";

export function generateFilename(title: string): string {
  return (slugify(title) || "untitled") + ".md";
}

import { describe, expect, it } from "vitest";
import { generateFilename } from "./slug";

describe("generateFilename", () => {
  it("produces a lowercase hyphenated slug with .md extension", () => {
    expect(generateFilename("Hello World")).toBe("hello-world.md");
  });

  it("falls back to untitled.md for empty input", () => {
    expect(generateFilename("")).toBe("untitled.md");
  });

  it("falls back to untitled.md for whitespace-only input", () => {
    expect(generateFilename("   ")).toBe("untitled.md");
  });

  it("falls back to untitled.md for symbol-only input", () => {
    expect(generateFilename("!@#$%")).toBe("untitled.md");
  });

  describe("Latin diacritics", () => {
    it("folds Spanish accented characters", () => {
      expect(
        generateFilename(
          "Prototipando aplicaciones web, rápido - GDG Talk 2019",
        ),
      ).toBe("prototipando-aplicaciones-web-rapido-gdg-talk-2019.md");
    });

    it("folds French accented characters", () => {
      expect(generateFilename("Les Misérables, résumé complet")).toBe(
        "les-miserables-resume-complet.md",
      );
    });

    it("folds Portuguese accented characters", () => {
      expect(generateFilename("Ação e reação: física básica")).toBe(
        "acao-e-reacao-fisica-basica.md",
      );
    });

    it("folds Turkish characters", () => {
      expect(
        generateFilename("Ölüdeniz: Türkiye'nin saklı cenneti"),
      ).toBe("oeluedeniz-tuerkiye-nin-sakli-cenneti.md");
    });

    it("folds German umlauts", () => {
      expect(generateFilename("Café und Küche")).toBe("cafe-und-kueche.md");
    });
  });

  describe("non-Latin scripts", () => {
    it("transliterates Cyrillic (Russian)", () => {
      expect(generateFilename("Как работает JavaScript движок V8")).toBe(
        "kak-rabotaet-java-script-dvizhok-v8.md",
      );
    });

    it("transliterates Greek", () => {
      const slug = generateFilename("Εισαγωγή στον προγραμματισμό");
      expect(slug).toMatch(/^[a-z0-9-]+\.md$/);
      expect(slug).not.toBe("untitled.md");
    });

    it("transliterates Arabic", () => {
      const slug = generateFilename("مقدمة في البرمجة");
      expect(slug).toMatch(/^[a-z0-9-]+\.md$/);
      expect(slug).not.toBe("untitled.md");
    });

    it("falls back to untitled for CJK-only titles", () => {
      expect(generateFilename("東京タワーの歴史")).toBe("untitled.md");
    });

    it("falls back to untitled for Korean-only titles", () => {
      expect(generateFilename("리액트 훅 사용법")).toBe("untitled.md");
    });
  });

  describe("mixed content", () => {
    it("preserves ASCII portions of mixed-script titles", () => {
      const slug = generateFilename("React 入門ガイド 2024年版");
      expect(slug).toContain("react");
      expect(slug).toContain("2024");
    });
  });
});

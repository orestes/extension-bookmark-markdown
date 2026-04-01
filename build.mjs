import { build } from "esbuild";
import { cpSync, mkdirSync } from "fs";
import sharp from "sharp";

const options = {
  entryPoints: [
    "src/popup.ts",
    "src/content.ts",
    "src/options.ts",
    "src/background.ts",
    "src/offscreen.ts",
  ],
  bundle: true,
  outdir: "dist",
  format: "iife",
  target: "chrome120",
  platform: "browser",
};

const ICON_SIZES = [16, 32, 48, 128];
const ICON_STATES = ["enabled", "disabled", "enabled-dark", "disabled-dark"];

async function generateIcons() {
  mkdirSync("dist/icons", { recursive: true });
  await Promise.all(
    ICON_STATES.flatMap((state) =>
      ICON_SIZES.map((size) =>
        sharp(`src/icons/${state}.svg`)
          .resize(size, size)
          .png()
          .toFile(`dist/icons/${state}-${size}.png`),
      ),
    ),
  );
}

await build(options);
await generateIcons();
cpSync("src/manifest.json", "dist/manifest.json");
cpSync("src/popup.html", "dist/popup.html");
cpSync("src/options.html", "dist/options.html");
cpSync("src/offscreen.html", "dist/offscreen.html");

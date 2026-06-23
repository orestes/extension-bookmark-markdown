import { build } from "esbuild";
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import sharp from "sharp";

const isDev = process.argv.includes("--dev");

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
      ICON_SIZES.map((size) => {
        let pipeline = sharp(`src/icons/${state}.svg`).resize(size, size);
        if (isDev) {
          pipeline = pipeline.tint({ r: 255, g: 140, b: 0 });
        }
        return pipeline.png().toFile(`dist/icons/${state}-${size}.png`);
      }),
    ),
  );
}

await build(options);
await generateIcons();

const manifest = JSON.parse(readFileSync("src/manifest.json", "utf-8"));
if (isDev) {
  manifest.name += " (Dev)";
}
writeFileSync("dist/manifest.json", JSON.stringify(manifest, null, 2) + "\n");

cpSync("src/popup.html", "dist/popup.html");

const DEV_BADGE = ` <span class="badge" style="background: #e67e22; color: #fff; border-color: #e67e22;">dev</span>`;

const optionsHtml = readFileSync("src/options.html", "utf-8");
if (isDev) {
  writeFileSync(
    "dist/options.html",
    optionsHtml.replace("</h1>", `${DEV_BADGE}</h1>`),
  );
} else {
  cpSync("src/options.html", "dist/options.html");
}

cpSync("src/offscreen.html", "dist/offscreen.html");

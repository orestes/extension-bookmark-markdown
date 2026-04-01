import { readFileSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));
mkdirSync("release", { recursive: true });
const output = `../release/bookmark-as-markdown-${version}.zip`;

execSync(`tar -czf "${output}" .`, { cwd: "dist", stdio: "inherit" });
console.log(`Created release/bookmark-as-markdown-${version}.zip`);

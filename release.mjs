import { deflateRawSync } from "node:zlib";
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, relative } from "node:path";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));
mkdirSync("release", { recursive: true });
const output = `release/bookmark-as-markdown-${version}.zip`;

function crc32(buf) {
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    statSync(full).isDirectory() ? walk(full, files) : files.push(full);
  }
  return files;
}

const sourceDir = "dist";
// dist/ is committed to the repository; run `yarn build` first if it is missing.
const files = walk(sourceDir);
const parts = [];
const centralDir = [];
let offset = 0;

const now = new Date();
const dosDate =
  (((now.getFullYear() - 1980) << 9) |
    ((now.getMonth() + 1) << 5) |
    now.getDate()) >>>
  0;
const dosTime =
  ((now.getHours() << 11) |
    (now.getMinutes() << 5) |
    (now.getSeconds() >> 1)) >>>
  0;

for (const file of files) {
  const name = relative(sourceDir, file).replace(/\\/g, "/");
  const data = readFileSync(file);
  const compressed = deflateRawSync(data);
  const nameBytes = Buffer.from(name);
  const crc = crc32(data);

  const local = Buffer.alloc(30 + nameBytes.length);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(0, 6);
  local.writeUInt16LE(8, 8);
  local.writeUInt16LE(dosTime, 10);
  local.writeUInt16LE(dosDate, 12);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(compressed.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(nameBytes.length, 26);
  local.writeUInt16LE(0, 28);
  nameBytes.copy(local, 30);
  parts.push(local, compressed);

  const cd = Buffer.alloc(46 + nameBytes.length);
  cd.writeUInt32LE(0x02014b50, 0);
  cd.writeUInt16LE(20, 4);
  cd.writeUInt16LE(20, 6);
  cd.writeUInt16LE(0, 8);
  cd.writeUInt16LE(8, 10);
  cd.writeUInt16LE(dosTime, 12);
  cd.writeUInt16LE(dosDate, 14);
  cd.writeUInt32LE(crc, 16);
  cd.writeUInt32LE(compressed.length, 20);
  cd.writeUInt32LE(data.length, 24);
  cd.writeUInt16LE(nameBytes.length, 28);
  cd.writeUInt16LE(0, 30);
  cd.writeUInt16LE(0, 32);
  cd.writeUInt16LE(0, 34);
  cd.writeUInt16LE(0, 36);
  cd.writeUInt32LE(0, 38);
  cd.writeUInt32LE(offset, 42);
  nameBytes.copy(cd, 46);
  centralDir.push(cd);

  offset += local.length + compressed.length;
}

const cdBuf = Buffer.concat(centralDir);
const eocd = Buffer.alloc(22);
eocd.writeUInt32LE(0x06054b50, 0);
eocd.writeUInt16LE(0, 4);
eocd.writeUInt16LE(0, 6);
eocd.writeUInt16LE(files.length, 8);
eocd.writeUInt16LE(files.length, 10);
eocd.writeUInt32LE(cdBuf.length, 12);
eocd.writeUInt32LE(offset, 16);
eocd.writeUInt16LE(0, 20);

writeFileSync(output, Buffer.concat([...parts, cdBuf, eocd]));
console.log(`Created ${output}`);

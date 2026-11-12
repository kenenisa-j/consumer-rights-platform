// Repository rules that are cheap to check mechanically. Run with `npm run validate`.
//  1. Size caps (documented in documentation/coding-standards.md).
//  2. web/ must never import backend or database code.
//  3. Every controller route declares a Public or RequirePermission policy.
//  4. Relative links in Markdown files resolve.
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const roots = ["web/src", "backend/src", "backend/prisma", "lib", "scripts", "tests", "documentation", ".github"];
const rootFiles = ["README.md", "AGENTS.md", "CLAUDE.md", "CONTRIBUTING.md", "SECURITY.md", "ROADMAP.md", "CHANGELOG.md"];
const skipDirs = new Set(["node_modules", "dist", ".next", "migrations"]);
const WEB_LEAK = /@prisma\/client|better-auth\/crypto|DATABASE_URL|from ["'](?:\.\.\/)+backend/;
let errors = 0;
let checked = 0;

function fail(message) { console.error(`FAIL ${message}`); errors++; }
const rel = file => path.relative(root, file).split(path.sep).join("/");

function sizeCap(file) {
  if (/\.test\.(m?js|tsx?)$/.test(file)) return 600;
  if (/controller\.ts$/.test(file)) return 250;
  if (/\.tsx$/.test(file)) return 350;
  return 399;
}

function checkLinks(file, text) {
  const withoutCode = text.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
  for (const match of withoutCode.matchAll(/\]\(([^)\s]+)\)/g)) {
    const target = match[1].split("#")[0];
    if (!target || /^(https?:|mailto:|tel:)/.test(target)) continue;
    const resolved = path.resolve(path.dirname(file), decodeURIComponent(target));
    stat(resolved).catch(() => fail(`${rel(file)} links to missing ${target}`));
  }
}

async function checkFile(file) {
  const name = path.basename(file);
  if (!/\.(tsx?|m?js|css|md|sql|ya?ml|json)$/.test(name) || name === "package-lock.json") return;
  checked++;
  const text = await readFile(file, "utf8");
  const lines = text.split(/\r?\n/).length;
  if (!name.endsWith(".json") && lines > sizeCap(file)) fail(`${rel(file)} has ${lines} lines; cap ${sizeCap(file)}.`);
  if (rel(file).startsWith("web/src/") && WEB_LEAK.test(text)) fail(`${rel(file)} reaches backend or database code from web/.`);
  if (name.endsWith("controller.ts")) {
    const routes = (text.match(/@(Get|Post|Patch|Put|Delete)\(/g) || []).length;
    const policies = (text.match(/@(Public|RequirePermission)\(/g) || []).length;
    if (routes !== policies) fail(`${rel(file)} has ${routes} routes and ${policies} permission policies.`);
  }
  if (name.endsWith(".md")) checkLinks(file, text);
}

async function visit(directory) {
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) { if (!skipDirs.has(entry.name)) await visit(file); }
    else await checkFile(file);
  }
}

for (const directory of roots) await visit(path.join(root, directory));
for (const file of rootFiles) await checkFile(path.join(root, file)).catch(() => {});
await new Promise(resolve => setTimeout(resolve, 100)); // let async link checks report
console.log(`Checked ${checked} files: size caps, web/backend boundary, API permission policies, Markdown links.`);
if (errors) process.exitCode = 1;

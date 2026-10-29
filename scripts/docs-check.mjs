#!/usr/bin/env node
// Checks the project's own Markdown: relative links and #anchors resolve, and every
// project skill in .claude/skills has a name + description. Vendored skills are skipped.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const root = resolve(dirname(new URL(import.meta.url).pathname), "..");
const vendored = ["impeccable", "vercel-react-best-practices"].map((n) => `.claude/skills/${n}/`);
const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "*.md"], {
  cwd: root,
  encoding: "utf8",
})
  .split("\n")
  .filter((f) => f && existsSync(join(root, f)) && !vendored.some((v) => f.startsWith(v)));

const slug = (heading) =>
  heading
    .trim()
    .toLowerCase()
    .replace(/[`*_~]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s/g, "-");

const anchorCache = new Map();
function anchors(file) {
  if (!anchorCache.has(file)) {
    const seen = new Map();
    const set = new Set();
    for (const line of stripCode(readFileSync(file, "utf8")).split("\n")) {
      const m = /^#{1,6}\s+(.*?)\s*#*\s*$/.exec(line);
      if (!m) continue;
      const base = slug(m[1]);
      const n = seen.get(base) ?? 0;
      seen.set(base, n + 1);
      set.add(n ? `${base}-${n}` : base);
    }
    anchorCache.set(file, set);
  }
  return anchorCache.get(file);
}

function stripCode(text) {
  return text.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
}

const errors = [];
for (const file of files) {
  const abs = join(root, file);
  const text = stripCode(readFileSync(abs, "utf8"));
  for (const [, target] of text.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(target)) continue; // external / mailto
    const [path, hash] = target.split("#");
    const dest = path ? resolve(dirname(abs), decodeURI(path)) : abs;
    if (!existsSync(dest)) {
      errors.push(`${file}: broken link → ${target}`);
      continue;
    }
    if (hash && dest.endsWith(".md") && statSync(dest).isFile() && !anchors(dest).has(hash)) {
      errors.push(`${file}: missing anchor → ${target}`);
    }
  }
}

for (const file of files.filter((f) => /^\.claude\/skills\/[^/]+\/SKILL\.md$/.test(f))) {
  const head = /^---\n([\s\S]*?)\n---/.exec(readFileSync(join(root, file), "utf8"));
  const folder = file.split("/")[2];
  if (!head) errors.push(`${file}: missing frontmatter`);
  else {
    if (!new RegExp(`^name:\\s*${folder}\\s*$`, "m").test(head[1]))
      errors.push(`${file}: name must equal folder "${folder}"`);
    if (!/^description:\s*\S/m.test(head[1])) errors.push(`${file}: missing description`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  console.error(`\n${errors.length} documentation problem(s).`);
  process.exit(1);
}
console.log(`docs-check: ${files.length} Markdown files OK (${relative(process.cwd(), root) || "."})`);

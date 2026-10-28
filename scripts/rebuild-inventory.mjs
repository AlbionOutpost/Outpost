import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { createHash } from "node:crypto";
import ts from "typescript";
import { format } from "prettier";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");
const hash = (path) =>
  createHash("sha256")
    .update(readFileSync(join(root, path)))
    .digest("hex");
const excluded = new Set([
  "node_modules",
  ".next",
  ".open-next",
  ".wrangler",
  ".git",
  ".qa",
  "__pycache__",
  "test-results",
  "playwright-report",
]);
function walk(directory) {
  return readdirSync(join(root, directory), { withFileTypes: true })
    .flatMap((entry) => {
      if (excluded.has(entry.name) || entry.isSymbolicLink()) return [];
      const path = join(directory, entry.name).replaceAll("\\", "/");
      if (path === "cloudflare/generated") return [];
      return entry.isDirectory() ? walk(path) : [path];
    })
    .sort();
}
function moduleInfo(path) {
  const source = ts.createSourceFile(
    path,
    read(path),
    ts.ScriptTarget.Latest,
    true,
    path.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const imports = [],
    exports = [];
  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement)) imports.push(statement.moduleSpecifier.text);
    if (
      ts.isExportDeclaration(statement) &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause)
    ) {
      exports.push(...statement.exportClause.elements.map((element) => element.name.text));
    }
    if (statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
      if (statement.name) exports.push(statement.name.text);
      if (ts.isVariableStatement(statement))
        exports.push(...statement.declarationList.declarations.map((d) => d.name.getText(source)));
      if (statement.modifiers.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword))
        exports.push("default");
    }
  }
  return {
    client: source.statements.some(
      (s) =>
        ts.isExpressionStatement(s) &&
        ts.isStringLiteral(s.expression) &&
        s.expression.text === "use client",
    ),
    imports,
    exports: [...new Set(exports)].sort(),
  };
}
const appFiles = walk("src/app");
const route = (path, filename) =>
  "/" +
  relative("src/app", path)
    .replaceAll("\\", "/")
    .replace(new RegExp(`/?${filename}\\.tsx?$`), "")
    .split("/")
    .filter((part) => part && !/^\(.+\)$/.test(part))
    .join("/");
const pages = appFiles
  .filter((p) => p.endsWith("/page.tsx"))
  .map((path) => ({ route: route(path, "page"), source: path, ...moduleInfo(path) }));
const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
const apis = appFiles
  .filter((p) => p.endsWith("/route.ts"))
  .map((path) => {
    const info = moduleInfo(path),
      source = read(path);
    return {
      route: route(path, "route"),
      source: path,
      methods: info.exports.filter((name) => methods.includes(name)),
      privateResponseWrapper: source.includes("apiHandler("),
      boundaryReferences: ["mutationUser", "getServerSession", "boundedJson", "rateLimit"].filter(
        (s) => source.includes(s),
      ),
      imports: info.imports,
    };
  });
const components = walk("src/components")
  .filter((p) => /\.tsx?$/.test(p))
  .map((source) => ({ source, ...moduleInfo(source) }));
const modules = walk("src/lib")
  .filter((p) => /\.tsx?$/.test(p))
  .map((source) => ({ source, ...moduleInfo(source) }));
const schema = read("prisma/schema.prisma");
const definitions = [...schema.matchAll(/^(model|enum)\s+(\w+)\s*\{([\s\S]*?)^\}/gm)].map(
  (match) => ({
    kind: match[1],
    name: match[2],
    definition: match[0],
    entries: match[3]
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith("//")),
  }),
);
const migrations = walk("prisma/migrations")
  .filter((p) => p.endsWith("migration.sql"))
  .map((source) => ({ name: source.split("/").at(-2), source, sha256: hash(source) }));
const roots = [
  "src",
  "prisma",
  "public",
  "assets/source",
  "data",
  "scripts",
  "tests",
  "e2e",
  "docs/assets",
  "docs/data",
  "skill-system/skills",
  ".github",
  "cloudflare",
];
const rootFiles = [
  "package.json",
  "package-lock.json",
  "next.config.ts",
  "open-next.config.ts",
  "wrangler.jsonc",
  "next-env.d.ts",
  "tsconfig.json",
  "playwright.config.ts",
  "vitest.config.ts",
  "eslint.config.mjs",
  "Dockerfile",
  "docker-compose.yml",
  ".dockerignore",
  ".gitignore",
  ".env.example",
  ".nvmrc",
  ".prettierrc.json",
  ".prettierignore",
  ".editorconfig",
];
const files = [
  ...new Set([...roots.filter((p) => existsSync(join(root, p))).flatMap(walk), ...rootFiles]),
].sort();
if (files.some((p) => /(^|\/)\.env(?:\.|$)/.test(p) && p !== ".env.example"))
  throw new Error("Private environment in inventory");
const lock = JSON.parse(read("package-lock.json"));
const dependencies = Object.fromEntries(
  Object.entries(lock.packages[""]?.dependencies ?? {}).map(([name, requested]) => [
    name,
    { requested, resolved: lock.packages[`node_modules/${name}`]?.version ?? null },
  ]),
);
const packageJson = JSON.parse(read("package.json"));
const inventory = {
  formatVersion: 1,
  baseline: JSON.parse(read("docs/rebuild/baseline.json")),
  instructions:
    "Regenerate from repository root with node scripts/rebuild-inventory.mjs; --check verifies drift. Textual boundary references are navigation aids, not an authorization audit.",
  runtime: {
    node: read(".nvmrc").trim(),
    packageManager: "npm with committed package-lock.json",
    dependencies,
    scripts: packageJson.scripts,
  },
  counts: {
    pages: pages.length,
    apiRoutes: apis.length,
    httpOperations: apis.reduce((n, r) => n + r.methods.length, 0),
    components: components.length,
    libraryModules: modules.length,
    models: definitions.filter((d) => d.kind === "model").length,
    enums: definitions.filter((d) => d.kind === "enum").length,
    migrations: migrations.length,
    files: files.length,
  },
  pages,
  apis,
  components,
  modules,
  database: {
    schema: "prisma/schema.prisma",
    sha256: hash("prisma/schema.prisma"),
    definitions,
    migrations,
  },
  files: files.map((path) => ({
    path,
    bytes: readFileSync(join(root, path)).byteLength,
    sha256: hash(path),
  })),
};
const link = (path) => `[${path}](../../${path})`;
const tables = `# Generated implementation inventory\n\nGenerated from the current source, without private environment values or database contents. Regenerate with \`node scripts/rebuild-inventory.mjs\`; verify with \`--check\`. [Full JSON](inventory.json) includes exports, imports, schema definitions, locked runtime versions and file hashes. Auth-boundary mentions are textual navigation aids; [security contracts](SECURITY_AND_AUTH.md) and actual handlers govern permissions.\n\n## Page routes (${pages.length})\n\n| Route | Source | Direct client component |\n| --- | --- | --- |\n${pages.map((p) => `| \`${p.route}\` | ${link(p.source)} | ${p.client ? "Yes" : "No (server component)"} |`).join("\n")}\n\n## HTTP routes (${apis.length})\n\n| Route | Exported methods | Source |\n| --- | --- | --- |\n${apis.map((p) => `| \`${p.route}\` | ${p.methods.join(", ")} | ${link(p.source)} |`).join("\n")}\n\n## Components (${components.length})\n\n| Source | Boundary | Exports |\n| --- | --- | --- |\n${components.map((p) => `| ${link(p.source)} | ${p.client ? "Client" : "Server-compatible module"} | ${p.exports.map((n) => "`" + n + "`").join(", ")} |`).join("\n")}\n\n## Domain and infrastructure modules (${modules.length})\n\n| Source | Exports |\n| --- | --- |\n${modules.map((p) => `| ${link(p.source)} | ${p.exports.map((n) => "`" + n + "`").join(", ")} |`).join("\n")}\n`;
const database = `# Exact database reference\n\nGenerated from ${link("prisma/schema.prisma")}; SHA256 \`${inventory.database.sha256}\`. These are schema definitions, not a dump of anyone’s data. Execute the committed SQL migrations in order as well: migrations contain checks and compatibility details that Prisma declarations alone may not express. Do not use a schema push to replace migration history.\n\n${definitions.map((d) => `## ${d.name}\n\n\`\`\`prisma\n${d.definition}\n\`\`\`\n`).join("\n")}\n## Ordered migrations (${migrations.length})\n\n| Migration | SQL | SHA256 |\n| --- | --- | --- |\n${migrations.map((m) => `| \`${m.name}\` | ${link(m.source)} | \`${m.sha256}\` |`).join("\n")}\n`;
const outputs = {
  "docs/rebuild/inventory.json": JSON.stringify(inventory, null, 2) + "\n",
  "docs/rebuild/INVENTORY.md": tables,
  "docs/rebuild/DATABASE_REFERENCE.md": database,
};
const chapters = [
  "README",
  "REBUILD_SEQUENCE",
  "SETUP_AND_OPERATIONS",
  "ARCHITECTURE",
  "DATABASE_AND_PERSISTENCE",
  "SECURITY_AND_AUTH",
  "HTTP_API",
  "FEATURES_AND_ROUTES",
  "FRONTEND_DESIGN",
  "COMPONENT_GUIDE",
  "GAME_DATA",
  "CALCULATORS",
  "TESTING_AND_ACCEPTANCE",
  "DECISIONS_AND_LIMITS",
  "VERIFICATION",
  "DATABASE_REFERENCE",
  "INVENTORY",
];
const handbook = [
  "# Outpost complete rebuild handbook",
  "",
  "Generated from the maintained chapters in this directory. Use this single file when handing the project to another AI. Source, assets, dataset, lockfile and migrations remain required; private credentials/database contents are intentionally excluded. Start with the instruction in the first chapter. Regenerate with `node scripts/rebuild-inventory.mjs`.",
  "",
];
for (const [index, name] of chapters.entries()) {
  const path = `docs/rebuild/${name}.md`;
  const content = outputs[path] ?? read(path);
  const lines = content.trim().split("\n");
  handbook.push(`## ${String(index + 1).padStart(2, "0")}. ${lines[0].replace(/^# /, "")}`, "");
  let fence = false;
  for (const line of lines.slice(1)) {
    if (/^```/.test(line)) fence = !fence;
    handbook.push(!fence && /^#{1,5} /.test(line) ? "#" + line : line);
  }
  handbook.push("", "---", "");
}
outputs["docs/rebuild/HANDBOOK.md"] = handbook.join("\n");
let drift = false;
for (const [path, raw] of Object.entries(outputs)) {
  const content = await format(raw, { ...JSON.parse(read(".prettierrc.json")), filepath: path });
  if (process.argv.includes("--check")) {
    if (!existsSync(join(root, path)) || read(path) !== content) {
      console.error(`Rebuild documentation drift: ${path}`);
      drift = true;
    }
  } else writeFileSync(join(root, path), content);
}
console.log(
  JSON.stringify({
    mode: process.argv.includes("--check") ? "check" : "generate",
    ...inventory.counts,
    drift,
  }),
);
if (drift) process.exitCode = 1;

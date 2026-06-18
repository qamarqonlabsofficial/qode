import {
  intro,
  outro,
  select,
  text,
  confirm,
  note,
  spinner,
} from "@clack/prompts";
import color from "picocolors";
import path from "path";
import fs from "fs-extra";
import os from "os";
import { execSync } from "child_process";

// ─── Types ─────────────────────────────────────────────────────────────────

type VSCodeSnippet = {
  scope?: string; // comma-separated language ids, omit = all languages
  prefix: string | string[]; // trigger word(s)
  body: string[]; // one string per line — NOT a single string
  description?: string;
};

type SnippetFile = Record<string, VSCodeSnippet>;

type SnippetScope = "project" | "global";

// ─── Language identifiers ──────────────────────────────────────────────────
// VS Code uses these exact strings — not file extensions

const LANGUAGES = [
  { value: "typescript", label: "TypeScript" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescriptreact", label: "TypeScript React (TSX)" },
  { value: "javascriptreact", label: "JavaScript React (JSX)" },
  { value: "python", label: "Python" },
  { value: "rust", label: "Rust" },
  { value: "go", label: "Go" },
  { value: "css", label: "CSS" },
  { value: "html", label: "HTML" },
  { value: "json", label: "JSON" },
  { value: "markdown", label: "Markdown" },
  { value: "shellscript", label: "Shell / Bash" },
  { value: "cpp", label: "C++" },
  { value: "c", label: "C" },
  { value: "java", label: "Java" },
  { value: "php", label: "PHP" },
  { value: "yaml", label: "YAML" },
  { value: "toml", label: "TOML" },
  { value: "all", label: "All languages (no scope)" },
] as const;

// ─── Path helpers ──────────────────────────────────────────────────────────

function getProjectSnippetPath(name: string): string {
  // .vscode/<name>.code-snippets — VS Code picks up any .code-snippets file here
  const vscodeDir = path.join(process.cwd(), ".vscode");
  return path.join(vscodeDir, `${sanitizeFilename(name)}.code-snippets`);
}

function getGlobalSnippetsDir(): string {
  const platform = process.platform;
  const home = os.homedir();

  if (platform === "darwin") {
    // Check for Insiders first, fall back to stable
    const insiders = path.join(
      home,
      "Library/Application Support/Code - Insiders/User/snippets",
    );
    const stable = path.join(
      home,
      "Library/Application Support/Code/User/snippets",
    );
    const vscodium = path.join(
      home,
      "Library/Application Support/VSCodium/User/snippets",
    );
    if (fs.existsSync(insiders)) return insiders;
    if (fs.existsSync(vscodium)) return vscodium;
    return stable;
  }

  if (platform === "win32") {
    const appdata = process.env.APPDATA ?? path.join(home, "AppData/Roaming");
    const insiders = path.join(appdata, "Code - Insiders/User/snippets");
    const stable = path.join(appdata, "Code/User/snippets");
    const vscodium = path.join(appdata, "VSCodium/User/snippets");
    if (fs.existsSync(insiders)) return insiders;
    if (fs.existsSync(vscodium)) return vscodium;
    return stable;
  }

  // Linux (and everything else)
  const configHome = process.env.XDG_CONFIG_HOME ?? path.join(home, ".config");
  const insiders = path.join(configHome, "Code - Insiders/User/snippets");
  const stable = path.join(configHome, "Code/User/snippets");
  const vscodium = path.join(configHome, "VSCodium/User/snippets");
  if (fs.existsSync(insiders)) return insiders;
  if (fs.existsSync(vscodium)) return vscodium;
  return stable;
}

function getGlobalSnippetPath(name: string, language?: string): string {
  const dir = getGlobalSnippetsDir();
  // Language snippets use <language>.json, general use <name>.code-snippets
  const filename =
    language && language !== "all"
      ? `${language}.json`
      : `${sanitizeFilename(name)}.code-snippets`;
  return path.join(dir, filename);
}

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-");
}

// ─── Open in editor ────────────────────────────────────────────────────────

function openInEditor(filePath: string): void {
  const platform = process.platform;
  try {
    // Try VS Code first, then fall back to system default
    try {
      execSync(`code "${filePath}"`, { stdio: "ignore" });
      return;
    } catch {
      // code CLI not on PATH
    }

    if (platform === "darwin") {
      execSync(`open "${filePath}"`, { stdio: "ignore" });
      return;
    }
    if (platform === "win32") {
      execSync(`start "" "${filePath}"`, { stdio: "ignore", shell: true });
      return;
    }
    // Linux — try common editors
    for (const editor of ["code", "xdg-open", "nano", "vim"]) {
      try {
        execSync(`${editor} "${filePath}"`, { stdio: "ignore" });
        return;
      } catch {
        continue;
      }
    }
  } catch {
    // silent — we tell the user the path anyway
  }
}

// ─── Read / write snippet files ────────────────────────────────────────────

async function readSnippetFile(filePath: string): Promise<SnippetFile> {
  if (!fs.existsSync(filePath)) return {};
  const raw = await fs.readFile(filePath, "utf-8");
  try {
    // VS Code snippet files can have // comments — strip them before parsing
    const stripped = raw.replace(/^\s*\/\/.*$/gm, "");
    return JSON.parse(stripped) as SnippetFile;
  } catch {
    return {};
  }
}

async function writeSnippetFile(
  filePath: string,
  snippets: SnippetFile,
): Promise<void> {
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(snippets, null, 2), "utf-8");
}

// ─── Body builder ──────────────────────────────────────────────────────────
// Takes a raw multi-line string and converts to the array VS Code requires.
// Also validates tabstops and warns about common mistakes.

function buildBody(raw: string): { body: string[]; warnings: string[] } {
  const lines = raw.split("\n");
  const warnings: string[] = [];

  // Check for common mistake: using \t as a literal two-char sequence
  if (raw.includes("\\t")) {
    warnings.push(
      'Found "\\t" — if you meant a tab character use an actual tab, not \\t',
    );
  }

  // Collect tabstops to check ordering
  const tabstops = [...raw.matchAll(/\$(\d+)|\$\{(\d+)(?::[^}]*)?\}/g)]
    .map((m) => parseInt(m[1] ?? m[2]))
    .filter((n) => n > 0);

  const uniqueStops = new Set(tabstops);
  if (uniqueStops.size > 0) {
    const max = Math.max(...uniqueStops);
    for (let i = 1; i <= max; i++) {
      if (!uniqueStops.has(i)) {
        warnings.push(`Missing tabstop $${i} — tabstops should be sequential`);
      }
    }
  }

  if (!raw.includes("$0")) {
    warnings.push(
      "No $0 found — $0 marks the final cursor position after all tabstops",
    );
  }

  return { body: lines, warnings };
}

// ─── Main command ──────────────────────────────────────────────────────────

export async function addSnippetCommand(subcommand?: string) {
  intro(color.bgYellow(color.black(" qode snippet ")));

  const action =
    subcommand ??
    ((await select({
      message: "What do you want to do?",
      options: [
        {
          value: "add-project",
          label: "Add snippet to this project  " + color.dim("(.vscode/)"),
        },
        {
          value: "add-global",
          label:
            "Add global snippet           " +
            color.dim("(available everywhere)"),
        },
        {
          value: "edit",
          label:
            "Edit a snippet file          " + color.dim("(opens in VS Code)"),
        },
        {
          value: "list",
          label:
            "List snippet files           " + color.dim("(project + global)"),
        },
      ],
    })) as string);

  if (typeof action === "symbol") {
    outro("Cancelled.");
    return;
  }

  switch (action) {
    case "add-project":
      await addSnippet("project");
      break;
    case "add-global":
      await addSnippet("global");
      break;
    case "edit":
      await editSnippet();
      break;
    case "list":
      await listSnippets();
      break;
    default:
      note(`Unknown subcommand: ${action}`, color.red("Error"));
  }

  outro(color.yellow("Done."));
}

// ─── Add snippet ───────────────────────────────────────────────────────────

async function addSnippet(scope: SnippetScope) {
  // ── 1. Language selection ───────────────────────────────────────────────
  const langChoice = await select({
    message: "Which language is this snippet for?",
    options: LANGUAGES.map((l) => ({ value: l.value, label: l.label })),
  });

  if (typeof langChoice === "symbol") {
    note("Cancelled.", "Skipped");
    return;
  }

  const language = langChoice as string;

  // ── 2. Snippet file to write into ──────────────────────────────────────
  // For project scope: always .vscode/qode.code-snippets (our managed file)
  // For global scope: language.json if a specific language, else a named file

  let filePath: string;

  if (scope === "project") {
    filePath = getProjectSnippetPath("qode");
    note(
      color.dim(path.relative(process.cwd(), filePath)),
      "Writing to project snippet file",
    );
  } else {
    // Global: language-specific file vs a named general file
    const fileChoice = await select({
      message: "Where should the global snippet live?",
      options: [
        {
          value: "language",
          label:
            language !== "all"
              ? `Language file  ${color.dim(`(${language}.json — only active in ${language} files)`)}`
              : `Named file     ${color.dim("(active in all files)")}`,
        },
        {
          value: "named",
          label: `Named file     ${color.dim("(you choose the filename, active in all files)")}`,
        },
      ],
    });

    if (typeof fileChoice === "symbol") {
      note("Cancelled.", "Skipped");
      return;
    }

    if (fileChoice === "language") {
      filePath = getGlobalSnippetPath("", language);
      note(color.dim(filePath), "Writing to global language snippet file");
    } else {
      const fname = await text({
        message: "Name for the global snippet file",
        placeholder: "my-snippets",
        validate: (v) => (!v?.trim() ? "Name cannot be empty" : undefined),
      });
      if (typeof fname === "symbol") {
        note("Cancelled.", "Skipped");
        return;
      }
      filePath = getGlobalSnippetPath(fname, undefined);
      note(color.dim(filePath), "Writing to global snippet file");
    }
  }

  // ── 3. Snippet details ─────────────────────────────────────────────────

  const snippetName = await text({
    message: "Snippet name",
    placeholder: "React functional component",
    validate: (v) => (!v?.trim() ? "Name cannot be empty" : undefined),
  });
  if (typeof snippetName === "symbol") {
    note("Cancelled.", "Skipped");
    return;
  }

  const prefix = await text({
    message: "Trigger prefix",
    placeholder: "rfc",
    hint: "What you type to trigger this snippet",
    validate: (v) => (!v?.trim() ? "Prefix cannot be empty" : undefined),
  });
  if (typeof prefix === "symbol") {
    note("Cancelled.", "Skipped");
    return;
  }

  const description = await text({
    message: "Description (optional)",
    placeholder: "Creates a React functional component",
  });
  if (typeof description === "symbol") {
    note("Cancelled.", "Skipped");
    return;
  }

  // ── 4. Body ─────────────────────────────────────────────────────────────
  note(
    [
      "Enter your snippet body. Tabstop reference:",
      color.cyan("  $1 $2 $3") + color.dim("  — cursor stops in order"),
      color.cyan("  ${1:name}") + color.dim(" — tabstop with placeholder text"),
      color.cyan("  $0") +
        color.dim("        — final cursor position (required)"),
      "",
      color.dim(
        "Variables: $TM_FILENAME  $TM_SELECTED_TEXT  $CLIPBOARD  $CURRENT_DATE",
      ),
      color.dim(
        "Multi-line: paste your full snippet body, press enter twice when done.",
      ),
    ].join("\n"),
    "Snippet body",
  );

  const rawBody = await text({
    message: "Snippet body",
    placeholder: "const ${1:name} = () => {\n  return $0\n}",
    validate: (v) => (!v?.trim() ? "Body cannot be empty" : undefined),
  });
  if (typeof rawBody === "symbol") {
    note("Cancelled.", "Skipped");
    return;
  }

  const { body, warnings } = buildBody(rawBody);

  if (warnings.length > 0) {
    note(
      warnings.map((w) => color.yellow("  ⚠  " + w)).join("\n"),
      "Body warnings",
    );
    const cont = await confirm({
      message: "Continue anyway?",
      initialValue: true,
    });
    if (!cont || typeof cont === "symbol") {
      note("Cancelled.", "Skipped");
      return;
    }
  }

  // ── 5. Build and write the snippet ─────────────────────────────────────

  const snippet: VSCodeSnippet = {
    prefix: prefix.trim(),
    body,
    ...(language !== "all" && scope === "project" ? { scope: language } : {}),
    ...(description && typeof description === "string" && description.trim()
      ? { description: description.trim() }
      : {}),
  };

  const s = spinner();
  s.start("Writing snippet...");

  const existing = await readSnippetFile(filePath);

  // Warn if name already exists
  if (existing[snippetName]) {
    s.stop("");
    const overwrite = await confirm({
      message: `A snippet named "${snippetName}" already exists in this file. Overwrite?`,
      initialValue: false,
    });
    if (!overwrite || typeof overwrite === "symbol") {
      note("Cancelled — existing snippet kept.", "Skipped");
      return;
    }
    s.start("Overwriting snippet...");
  }

  existing[snippetName] = snippet;
  await writeSnippetFile(filePath, existing);

  s.stop(color.green("Snippet written."));

  const snippetCount = Object.keys(existing).length;

  note(
    [
      `${color.bold("Name:")}     ${snippetName}`,
      `${color.bold("Prefix:")}   ${color.cyan(prefix)}`,
      `${color.bold("Scope:")}    ${language === "all" ? "all languages" : language}`,
      `${color.bold("File:")}     ${color.dim(scope === "project" ? path.relative(process.cwd(), filePath) : filePath)}`,
      `${color.bold("Total:")}    ${snippetCount} snippet${snippetCount !== 1 ? "s" : ""} in this file`,
    ].join("\n"),
    color.green("Added"),
  );

  // Offer to open the file
  const open = await confirm({
    message: "Open snippet file in VS Code?",
    initialValue: false,
  });
  if (open && typeof open !== "symbol") {
    openInEditor(filePath);
    note(color.dim(filePath), "Opened");
  }
}

// ─── Edit snippet (open in editor) ─────────────────────────────────────────

async function editSnippet() {
  const files = collectSnippetFiles();

  if (files.length === 0) {
    note(
      [
        "No snippet files found.",
        `Run ${color.cyan("qode snippet add-project")} to create one.`,
      ].join("\n"),
      "Nothing to edit",
    );
    return;
  }

  const chosen = await select({
    message: "Which snippet file do you want to edit?",
    options: files.map((f) => ({
      value: f.path,
      label: `${color.bold(f.label)}  ${color.dim(f.path)}`,
    })),
  });

  if (typeof chosen === "symbol") {
    note("Cancelled.", "Skipped");
    return;
  }

  const filePath = chosen as string;

  if (!fs.existsSync(filePath)) {
    note(`File not found: ${filePath}`, color.red("Error"));
    return;
  }

  openInEditor(filePath);

  note(
    [
      color.dim(filePath),
      "",
      "File opened in VS Code.",
      color.dim("VS Code picks up changes immediately — no reload needed."),
    ].join("\n"),
    "Editing",
  );
}

// ─── List snippet files ─────────────────────────────────────────────────────

async function listSnippets() {
  const files = collectSnippetFiles();

  if (files.length === 0) {
    note(
      `No snippet files found.\nRun ${color.cyan("qode snippet add-project")} to create one.`,
      "No snippets",
    );
    return;
  }

  for (const f of files) {
    const snippets = await readSnippetFile(f.path);
    const names = Object.keys(snippets);

    const lines =
      names.length > 0
        ? names.map((name) => {
            const snip = snippets[name];
            const pfx = Array.isArray(snip.prefix)
              ? snip.prefix.join(", ")
              : snip.prefix;
            const scope = snip.scope ? color.dim(` [${snip.scope}]`) : "";
            return `  ${color.cyan(pfx.padEnd(20))}  ${name}${scope}`;
          })
        : [`  ${color.dim("(empty)")}`];

    note(
      [color.dim(f.path), "", ...lines].join("\n"),
      `${color.bold(f.label)}  ${color.dim(`${names.length} snippet${names.length !== 1 ? "s" : ""}`)}`,
    );
  }
}

// ─── Collect all known snippet files ───────────────────────────────────────

type SnippetFileEntry = { path: string; label: string };

function collectSnippetFiles(): SnippetFileEntry[] {
  const results: SnippetFileEntry[] = [];

  // Project snippets — all .code-snippets files in .vscode/
  const vscodeDir = path.join(process.cwd(), ".vscode");
  if (fs.existsSync(vscodeDir)) {
    const entries = fs.readdirSync(vscodeDir);
    for (const entry of entries) {
      if (entry.endsWith(".code-snippets")) {
        results.push({
          path: path.join(vscodeDir, entry),
          label: `project · ${entry}`,
        });
      }
    }
  }

  // Global snippets dir
  const globalDir = getGlobalSnippetsDir();
  if (fs.existsSync(globalDir)) {
    const entries = fs.readdirSync(globalDir);
    for (const entry of entries) {
      if (entry.endsWith(".code-snippets") || entry.endsWith(".json")) {
        results.push({
          path: path.join(globalDir, entry),
          label: `global · ${entry}`,
        });
      }
    }
  }

  return results;
}

import { intro, outro, select, note } from "@clack/prompts";
import color from "picocolors";

const COMMAND_DETAILS: Record<
  string,
  { summary: string; usage: string; detail: string }
> = {
  init: {
    summary: "Initialize a fresh qode workspace",
    usage: "qode init",
    detail: [
      "Sets up tracking for file distribution dependencies inside a project workspace.",
      `Generates an atomic configuration state file named ${color.cyan("qode.json")} in the current folder.`,
      `Automatically configures local tracking ignore rules by modifying ${color.yellow(".gitignore")}.`,
      "Triggers the source registration wizard so you can map out primary download repositories.",
    ].join("\n"),
  },
  add: {
    summary: "Pull components or structures from registered repository configs",
    usage: "qode add",
    detail: [
      "Launches an interactive cross-repository navigation tree file browser panel.",
      "Allows targeted selections from a single profile or grouped downloads spanning multiple repos.",
      "Automatically analyzes your working project framework for folder roots like 'src/'.",
      "",
      color.bold("Interactive File Selector Key Bindings:"),
      `  ${color.cyan("↑ / ↓ or k / j")} : Navigate choices sequentially inside the view line listings`,
      `  ${color.cyan("PgUp / PgDn")}   : Page jump through massive file listings`,
      `  ${color.cyan("Space")}         : Toggle choice selection on targeted items`,
      `  ${color.cyan("a")}             : Multi-toggle all currently visible pagination items`,
      `  ${color.cyan("n")}             : Clear all active checkbox selections globally`,
      `  ${color.cyan("/")}             : Initialize instant filter mode to live-query names`,
      `  ${color.cyan("Enter")}         : Confirm array inputs and trigger secure parallel downloading sequences`,
      `  ${color.cyan("Esc")}           : Kill the operation instantly and exit safely`,
    ].join("\n"),
  },
  addx: {
    summary: "One-shot file retrieval bypassing configuration state trackers",
    usage: "qode addx [owner/repo] [options]",
    detail: [
      "Downloads remote directories directly without changing tracking configurations.",
      "Useful for evaluating public setups, assets, or running quick patches.",
      "",
      color.bold("Command Flag Options:"),
      `  ${color.yellow("-t, --token <token>")} : Supply an validation PAT key inline to access private systems`,
      "",
      color.bold("Syntax Configurations:"),
      "  Expects standard 'owner/repo' structures or explicit 'github:owner/repo' paths.",
    ].join("\n"),
  },
  sources: {
    summary: "Interact with configuration source repository endpoints",
    usage:
      "qode sources [subcommand]\n  Alternative explicit shortcuts: qode sources:[list|add|remove|edit]",
    detail: [
      "Manages persistent tracking references linking your project workspace with GitHub data feeds.",
      "",
      color.bold("Subcommand Scopes:"),
      `  ${color.cyan("list")}   : Generates an overview of linked profiles, credentials, aliases, and keys`,
      `  ${color.cyan("add")}    : Appends a fresh remote source profile to your local workspace index`,
      `  ${color.cyan("remove")} : Erases target resource parameters with contextual safeguards`,
      `  ${color.cyan("edit")}   : Adjust friendly workspace aliases, access keys, or public/private security limits`,
    ].join("\n"),
  },
  status: {
    summary: "Inspect operational integrity and asset state metrics",
    usage: "qode status",
    detail: [
      "Scans workspace tracking properties and compiles an operational report.",
      "Validates asset positions on local storage media against database parameters.",
      `Displays a clear health metric symbol (${color.green("✓ present")} / ${color.red("✗ missing")}) next to each tracking entry.`,
    ].join("\n"),
  },
  alias: {
    summary:
      "Inject executable command shortcuts inside environmental terminal profiles",
    usage: "qode alias <name> <command> [options]",
    detail: [
      "Writes system macros across multi-platform development workstations from a single prompt layer.",
      "Supports bash, zsh, fish, ksh, tcsh, powershell, and cmd.exe profile systems natively.",
      "",
      color.bold("Command Flag Options:"),
      `  ${color.yellow("-s, --shell <name>")}  : Force mapping configurations against a distinct shell platform`,
      `  ${color.yellow("-f, --file <path>")}   : Provide an absolute fallback file string directing to your shell file profile`,
      `  ${color.yellow("-y, --yes")}           : Skip validation prompts during standard execution passes`,
      `  ${color.yellow("-o, --overwrite")}     : Overwrite existing environment variables with matching labels automatically`,
    ].join("\n"),
  },
  snippet: {
    summary:
      "Generate, inspect, and map automated VS Code code completion snippets",
    usage: "qode snippet [subcommand]",
    detail: [
      "Manages editor extensions directly from your working interface.",
      "",
      color.bold("Subcommand Scopes:"),
      `  ${color.cyan("add-project")} : Generates localized configurations targeting '.vscode/qode.code-snippets'`,
      `  ${color.cyan("add-global")}  : Maps cross-project snippets using automated platform user-directory indexing`,
      `  ${color.cyan("edit")}        : Locates environment configuration binaries to access code layouts`,
      `  ${color.cyan("list")}        : Audits local schemas, displaying text trigger prefixes alongside matching languages`,
    ].join("\n"),
  },
};

export default async function helpCommand() {
  intro(color.bgCyan(color.black(" qode — Comprehensive Help Engine ")));

  note(
    [
      `${color.bold("qode")} is a streamlined, interactive terminal toolkit for managing external files.`,
      "It helps you pull modular code blocks directly from GitHub repos without running full git operations,",
      "and includes handy utilities for managing shell shortcuts and editor layouts.",
    ].join("\n"),
    "System Architecture Overview",
  );

  const selection = await select({
    message:
      "Which operational engine block do you want to analyze detailed documentation for?",
    options: [
      {
        value: "all",
        label: "✨ Output Complete Unified Command Manual Documentation",
      },
      ...Object.entries(COMMAND_DETAILS).map(([key, value]) => ({
        value: key,
        label: `${color.cyan(key.padEnd(10))} ${color.dim("→")} ${color.white(value.summary)}`,
      })),
    ],
  });

  if (typeof selection === "symbol") {
    outro("Exiting documentation engine. Have a great day!");
    return;
  }

  if (selection === "all") {
    for (const [command, data] of Object.entries(COMMAND_DETAILS)) {
      note(
        [
          `${color.bold("Syntax Structure:")} ${color.yellow(data.usage)}`,
          "",
          data.detail,
        ].join("\n"),
        `Manual Entry: qode ${command}`,
      );
    }
    outro(color.green("Full system manual output sequence finished."));
  } else {
    const data = COMMAND_DETAILS[selection as string];
    if (data) {
      note(
        [
          `${color.bold("Syntax Structure:")} ${color.yellow(data.usage)}`,
          "",
          data.detail,
        ].join("\n"),
        `Manual Entry: qode ${selection}`,
      );
    }
    outro(
      color.dim(
        `Execute [ qode ${selection} ] directly to begin running this operation sequence.`,
      ),
    );
  }
}

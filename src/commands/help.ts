import { intro, outro, select, note } from "@clack/prompts";
import color from "picocolors";

const COMMANDS: Record<
  string,
  { summary: string; usage: string; detail: string; keys?: string[] }
> = {
  init: {
    summary: "Set up qode in a project",
    usage: "qode init",
    detail: [
      "Creates qode.json in the current directory.",
      "Walks you through registering one or more GitHub sources (public or",
      "private). Automatically detects whether a src/ directory exists and",
      "sets it as the default download target — no extra config needed.",
      "",
      "Run this once per project before using qode add.",
    ].join("\n"),
  },
  add: {
    summary: "Pull files from your configured sources",
    usage: "qode add",
    detail: [
      "Opens an interactive file browser across your registered sources.",
      "Choose one source or multiple sources in a single session.",
      "",
      "Selection modes:",
      "  · Pick individual files — paged selector, works on any repo size",
      "  · Pick an entire directory — select one folder, pull everything in it",
      "  · Download everything — pulls all files from the source",
      "",
      "File selector controls:",
      "  ↑ / k         move up",
      "  ↓ / j         move down",
      "  PgUp / PgDn   jump a full page",
      "  space         toggle selection",
      "  a             select all visible (or deselect all if all selected)",
      "  n             deselect everything",
      "  /             open filter — type to narrow the list instantly",
      "  enter         confirm selection",
      "  esc           cancel",
      "",
      "All downloads are tracked in qode.json.",
    ].join("\n"),
  },
  addx: {
    summary: "One-shot fetch from any repo (no config needed)",
    usage: "qode addx [owner/repo] [--token ghp_...]",
    detail: [
      "Fetch files from any GitHub repo without touching qode.json.",
      "Uses the same paged file selector as `add`.",
      "",
      "Examples:",
      "  qode addx                              fully interactive",
      "  qode addx shadcn-ui/ui                 jump to file selection",
      "  qode addx myorg/private --token ghp_   private repo",
      "",
      "Great for:",
      "  · Grabbing a file from any open source project",
      "  · Trying something before committing it to your config",
      "  · One-off pulls on machines where you don't want a config trail",
      "",
      "Does not write to qode.json. Nothing is tracked.",
    ].join("\n"),
  },
  sources: {
    summary: "Manage registered GitHub sources",
    usage: "qode sources [list|add|remove|edit]",
    detail: [
      "View, add, remove, or edit your registered GitHub sources.",
      "",
      "Subcommands (all optional — omitting opens an interactive menu):",
      "  qode sources list     show all registered sources",
      "  qode sources add      register a new source",
      "  qode sources remove   delete a source",
      "  qode sources edit     update alias, token, or visibility",
      "",
      "Each source stores:",
      "  · Repo path  (github:owner/repo)",
      "  · Visibility (public or private)",
      "  · Auth token (PAT, stored only in qode.json — never sent elsewhere)",
      "  · Alias      (optional friendly name shown in menus)",
    ].join("\n"),
  },
  status: {
    summary: "Show project health and tracked files",
    usage: "qode status",
    detail: [
      "Prints a full report of the current project:",
      "  · Number of registered sources",
      "  · Every file that has been pulled, grouped by source",
      "  · Whether each file still exists on disk (✓ present / ✗ missing)",
      "  · The timestamp of when each file was pulled",
      "",
      "Commit qode.json so your team always knows what came from where.",
    ].join("\n"),
  },
  alias: {
    summary: "Lets you add aliases to your shell profile",
    usage: "qode alias [alias] [command]",
    detail: [
      "lets you add aliases to your shell whether its windows linux",
      "(many shells) mac or whatever",
      `Examples:
  $ qode alias ll "ls -la"
  $ qode alias gst "git status" -s zsh
  $ qode alias serve "npx serve ." -s bash -f ~/.bashrc -y
  $ qode alias k kubectl -s zsh -yo`,
    ].join("\n"),
  },
  help: {
    summary: "Show this help",
    usage: "qode help",
    detail: "Interactive command guide. You're looking at it.",
  },
};

export default async function helpCommand() {
  intro(color.bgCyan(color.black(" qode — help ")));

  note(
    [
      color.bold("qode") + " — GitHub-based file distribution CLI.",
      "",
      "Pull any file from any GitHub repo directly into your project.",
      "Tracks what you pulled, from where, and when. Works with public",
      "and private repos. No git cloning. No npm packages to publish.",
      "",
      color.dim("Think shadcn/ui's add command — but for your own repos."),
    ].join("\n"),
    "What is qode?",
  );

  const chosen = await select({
    message: "Which command do you want to learn about?",
    options: [
      { value: "all", label: color.bold("Show all commands") },
      ...Object.entries(COMMANDS).map(([cmd, info]) => ({
        value: cmd,
        label: `${color.cyan(cmd.padEnd(10))}  ${color.dim(info.summary)}`,
      })),
    ],
  });

  if (typeof chosen === "symbol") {
    outro("Bye!");
    return;
  }

  if (chosen === "all") {
    for (const [name, info] of Object.entries(COMMANDS)) {
      note(
        [
          `${color.bold("Usage:")}  ${color.cyan(info.usage)}`,
          "",
          info.detail,
        ].join("\n"),
        color.cyan(name),
      );
    }
    outro(
      color.dim(
        "Run any command — a menu will guide you if you forget the subcommands.",
      ),
    );
  } else {
    const info = COMMANDS[chosen as string];
    note(
      [
        `${color.bold("Usage:")}  ${color.cyan(info?.usage)}`,
        "",
        info?.detail,
      ].join("\n"),
      color.cyan(chosen as string),
    );
    outro(color.dim(`Run ${color.cyan(`qode ${chosen}`)} to get started.`));
  }
}

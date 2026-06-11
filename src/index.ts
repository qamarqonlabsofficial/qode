import { Command } from "commander";
import { select, intro, outro } from "@clack/prompts";
import color from "picocolors";

import { initCommand } from "./commands/init";
import helpCommand from "./commands/help";
import { addCommand } from "./commands/add";
import { addxCommand } from "./commands/addx";
import { sourcesCommand } from "./commands/sources";
import { statusCommand } from "./commands/status";
import addAlias, { type AddAliasOptions } from "./commands/addAlias";

const program = new Command();

program
  .name("qnlabs")
  .description(
    "The GitHub-based file distribution CLI for QamarQonLabs — and anyone else.",
  )
  .version("0.2.0");

// ─── init ───────────────────────────────────────────────────────────────────
program
  .command("init")
  .description("Initialize qnlabs.json in the current project")
  .action(async () => {
    await initCommand();
  });

// ─── add ────────────────────────────────────────────────────────────────────
program
  .command("add")
  .description("Pull files from your configured sources")
  .action(async () => {
    await addCommand();
  });

// ─── addAlias ────────────────────────────────────────────────────────────────────
program
  .command("alias <name> <command>")
  .description("Add a shell alias to your profile file")
  .addHelpText(
    "after",
    `
Examples:
  $ qnlabs alias ll "ls -la"
  $ qnlabs alias gst "git status" -s zsh
  $ qnlabs alias serve "npx serve ." -s bash -f ~/.bashrc -y
  $ qnlabs alias k kubectl -s zsh -yo
`,
  )
  .option(
    "-s, --shell <name>",
    "target shell (bash, zsh, fish, ksh, tcsh, powershell, cmd.exe)",
  )
  .option("-f, --file <path>", "explicit path to the shell profile file")
  .option("-y, --yes", "skip the write confirmation prompt")
  .option(
    "-o, --overwrite",
    "auto-overwrite if alias already exists without prompting",
  )
  .action((name: string, command: string, opts: AddAliasOptions) => {
    addAlias(name, command, opts);
  });
// ─── addx ───────────────────────────────────────────────────────────────────
program
  .command("addx [repo]")
  .description("One-shot fetch from any GitHub repo (no config required)")
  .option("-t, --token <token>", "Personal Access Token for private repos")
  .action(async (repo?: string, options?: { token?: string }) => {
    await addxCommand(repo, options?.token);
  });

// ─── sources ────────────────────────────────────────────────────────────────
program
  .command("sources [subcommand]")
  .description("Manage registered sources (list | add | remove | edit)")
  .action(async (subcommand?: string) => {
    await sourcesCommand(subcommand);
  });

// Shorthand aliases for sources subcommands
for (const sub of ["list", "add", "remove", "edit"] as const) {
  program
    .command(`sources:${sub}`)
    .description(`sources ${sub}`)
    .action(async () => {
      await sourcesCommand(sub);
    });
}

// ─── status ─────────────────────────────────────────────────────────────────
program
  .command("status")
  .description("Show project status, sources, and tracked files")
  .action(async () => {
    await statusCommand();
  });

// ─── help ───────────────────────────────────────────────────────────────────
program
  .command("help")
  .description("Interactive help for all commands")
  .action(async () => {
    await helpCommand();
  });

// ─── Default interactive mode (no command typed) ─────────────────────────────
// When the user just types `qnlabs` with no arguments, show a menu.
if (process.argv.length <= 2) {
  (async () => {
    intro(color.bgCyan(color.black(" qnlabs — GitHub file distribution CLI ")));
    intro(
      color.dim(
        "Pull any file from any GitHub repo. No manual git cloning required.",
      ),
    );

    const action = await select({
      message: "What do you want to do?",
      options: [
        {
          value: "add",
          label: `${color.cyan("add")}          Pull files from configured sources`,
        },
        {
          value: "addx",
          label: `${color.magenta("addx")}         One-shot fetch from any repo (no config needed)`,
        },
        {
          value: "init",
          label: `${color.green("init")}         Set up qnlabs in this project`,
        },
        {
          value: "sources",
          label: `${color.blue("sources")}      View / manage your registered repos`,
        },
        {
          value: "status",
          label: `${color.yellow("status")}       See tracked files and project state`,
        },
        {
          value: "help",
          label: `${color.dim("help")}          Learn about all commands`,
        },
      ],
    });

    if (typeof action === "symbol") {
      outro("Bye!");
      process.exit(0);
    }

    switch (action) {
      case "init":
        await initCommand();
        break;
      case "add":
        await addCommand();
        break;
      case "addx":
        await addxCommand();
        break;
      case "sources":
        await sourcesCommand();
        break;
      case "status":
        await statusCommand();
        break;
      case "help":
        await helpCommand();
        break;
    }
  })();
} else {
  program.parse(process.argv);
}

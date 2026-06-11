import { note, text, select, confirm, spinner } from "@clack/prompts";
import color from "picocolors";
import path from "path";
import fs from "fs-extra";
import { execSync } from "child_process";
import os from "os";

// ─── Types ────────────────────────────────────────────────────────────────────

type ShellProfile = {
  shell: string;
  profileFiles: string[];
  aliasFormat: (alias: string, command: string) => string;
};

export type AddAliasOptions = {
  shell?: string;
  file?: string;
  yes?: boolean;
  overwrite?: boolean;
};

// ─── Shell Profiles ───────────────────────────────────────────────────────────

const SHELL_PROFILES: Record<string, ShellProfile> = {
  bash: {
    shell: "bash",
    profileFiles: [".bashrc", ".bash_profile", ".profile"],
    aliasFormat: (alias, command) => `alias ${alias}='${command}'`,
  },
  zsh: {
    shell: "zsh",
    profileFiles: [".zshrc", ".zprofile"],
    aliasFormat: (alias, command) => `alias ${alias}='${command}'`,
  },
  fish: {
    shell: "fish",
    profileFiles: [".config/fish/config.fish"],
    aliasFormat: (alias, command) => `alias ${alias} '${command}'`,
  },
  ksh: {
    shell: "ksh",
    profileFiles: [".kshrc", ".profile"],
    aliasFormat: (alias, command) => `alias ${alias}='${command}'`,
  },
  tcsh: {
    shell: "tcsh",
    profileFiles: [".tcshrc", ".cshrc"],
    aliasFormat: (alias, command) => `alias ${alias} '${command}'`,
  },
  powershell: {
    shell: "powershell",
    profileFiles: [],
    aliasFormat: (alias, command) =>
      `function ${alias} { ${command} $args }\nSet-Alias -Name ${alias} -Value ${alias}`,
  },
  "cmd.exe": {
    shell: "cmd.exe",
    profileFiles: [],
    aliasFormat: (alias, command) => `DOSKEY ${alias}=${command} $*`,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function detectShell(): string {
  const platform = process.platform;

  if (platform === "win32") {
    try {
      execSync("powershell -Command exit", { stdio: "ignore" });
      return "powershell";
    } catch {
      return "cmd.exe";
    }
  }

  const shellName = path.basename(process.env.SHELL || "").toLowerCase();
  if (shellName in SHELL_PROFILES) return shellName;

  for (const known of ["zsh", "bash", "fish", "ksh", "tcsh"]) {
    try {
      execSync(`which ${known}`, { stdio: "ignore" });
      return known;
    } catch {}
  }

  return "bash";
}

function getPowerShellProfilePath(): string {
  try {
    return execSync("powershell -Command $PROFILE", {
      encoding: "utf8",
    }).trim();
  } catch {
    return path.join(
      os.homedir(),
      "Documents",
      "WindowsPowerShell",
      "Microsoft.PowerShell_profile.ps1",
    );
  }
}

function resolveProfileFiles(shellName: string): string[] {
  const home = os.homedir();

  if (shellName === "powershell") return [getPowerShellProfilePath()];

  if (shellName === "cmd.exe") return [path.join(home, "aliases.bat")];

  return (SHELL_PROFILES[shellName]?.profileFiles ?? []).map((f) =>
    path.join(home, f),
  );
}

function findExistingProfileFile(files: string[]): string | null {
  return files.find((f) => fs.existsSync(f)) ?? null;
}

function aliasExistsInFile(filePath: string, alias: string): boolean {
  if (!fs.existsSync(filePath)) return false;
  const content = fs.readFileSync(filePath, "utf8");
  return [
    new RegExp(`^alias\\s+${alias}[=\\s]`, "m"),
    new RegExp(`^function\\s+${alias}\\s*\\{`, "m"),
    new RegExp(`^Set-Alias.*\\b${alias}\\b`, "mi"),
    new RegExp(`^DOSKEY\\s+${alias}=`, "mi"),
  ].some((p) => p.test(content));
}

function checkAliasInSession(alias: string, shellName: string): boolean {
  if (process.platform === "win32") return false;
  try {
    execSync(
      `${SHELL_PROFILES[shellName]?.shell ?? "bash"} -i -c "alias ${alias}" 2>/dev/null`,
      { stdio: "ignore" },
    );
    return true;
  } catch {
    return false;
  }
}

function removeAliasFromFile(filePath: string, alias: string): void {
  const lines = fs.readFileSync(filePath, "utf8").split("\n");
  const cleaned = lines.filter(
    (line) =>
      ![
        new RegExp(`^alias\\s+${alias}[=\\s]`),
        new RegExp(`^function\\s+${alias}\\s*\\{`),
        new RegExp(`^Set-Alias.*\\b${alias}\\b`, "i"),
        new RegExp(`^DOSKEY\\s+${alias}=`, "i"),
      ].some((p) => p.test(line)),
  );
  fs.writeFileSync(filePath, cleaned.join("\n"), "utf8");
}

function writeAliasToFile(
  filePath: string,
  aliasLine: string,
  shellName: string,
): void {
  fs.ensureDirSync(path.dirname(filePath));
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, "", "utf8");

  const comment = shellName === "cmd.exe" ? "::" : "#";
  fs.appendFileSync(
    filePath,
    `\n${comment} Added by qnlabs\n${aliasLine}\n`,
    "utf8",
  );

  if (shellName === "cmd.exe") {
    try {
      execSync(
        `reg add "HKCU\\Software\\Microsoft\\Command Processor" /v AutoRun /t REG_EXPAND_SZ /d "${filePath}" /f`,
        { stdio: "ignore" },
      );
    } catch {}
  }
}

const RELOAD_CMDS: Record<string, string> = {
  bash: "source ~/.bashrc",
  zsh: "source ~/.zshrc",
  fish: "source ~/.config/fish/config.fish",
  ksh: "source ~/.kshrc",
  tcsh: "source ~/.tcshrc",
  powershell: ". $PROFILE",
  "cmd.exe": "Open a new terminal window",
};

// ─── Command ──────────────────────────────────────────────────────────────────

export default async function addAlias(
  alias: string,
  command: string,
  opts: AddAliasOptions,
): Promise<void> {
  const { yes = false, overwrite = false } = opts;
  const detectedShell = detectShell();

  // ── Collect alias ──────────────────────────────────────────────────────────
  if (!alias) {
    const result = await text({
      message: "Alias name",
      placeholder: "e.g. ll",
      validate: (v) => {
        if (!v.trim()) return "Alias cannot be empty";
        if (/\s/.test(v)) return "Alias cannot contain spaces";
      },
    });
    if (typeof result !== "string") process.exit(0);
    alias = result.trim();
  }

  // ── Collect command ────────────────────────────────────────────────────────
  if (!command) {
    const result = await text({
      message: "Command to alias",
      placeholder: "e.g. ls -la",
      validate: (v) => {
        if (!v.trim()) return "Command cannot be empty";
        if (v.trim() === alias) return "Command cannot be the same as alias";
      },
    });
    if (typeof result !== "string") process.exit(0);
    command = result.trim();
  }

  // ── Self-alias guard ───────────────────────────────────────────────────────
  if (alias === command) {
    note(`Cannot alias ${color.cyan(alias)} to itself.`, color.red("Error"));
    process.exit(1);
  }

  // ── Shell selection ────────────────────────────────────────────────────────
  let selectedShell = opts.shell ?? "";

  if (!selectedShell) {
    const result = await select({
      message: "Which shell?",
      initialValue: detectedShell,
      options: Object.keys(SHELL_PROFILES).map((s) => ({
        value: s,
        label: s === detectedShell ? `${s} ${color.dim("(detected)")}` : s,
      })),
    });
    if (typeof result !== "string") process.exit(0);
    selectedShell = result;
  } else if (!(selectedShell in SHELL_PROFILES)) {
    note(
      `Unknown shell ${color.cyan(selectedShell)}. Valid options: ${Object.keys(SHELL_PROFILES).join(", ")}`,
      color.red("Error"),
    );
    process.exit(1);
  }

  const profile = SHELL_PROFILES[selectedShell];

  // ── Profile file resolution ────────────────────────────────────────────────
  let targetFile = opts.file ?? "";

  if (!targetFile) {
    const profileFiles = resolveProfileFiles(selectedShell);
    const existing = findExistingProfileFile(profileFiles);

    if (profileFiles.length === 0) {
      // Shell has no known files (shouldn't happen but guard anyway)
      const result = await text({
        message: "Enter full path to your shell profile file",
        validate: (v) => (!v.trim() ? "Path cannot be empty" : undefined),
      });
      if (typeof result !== "string") process.exit(0);
      targetFile = result.trim();
    } else if (existing) {
      targetFile = existing;
    } else {
      // None exist — ask which to create
      const result = await select({
        message: `No profile file found. Which one should ${color.cyan("qnlabs")} create?`,
        options: profileFiles.map((f) => ({ value: f, label: f })),
      });
      if (typeof result !== "string") process.exit(0);
      targetFile = result;
    }
  }

  // ── Duplicate check ────────────────────────────────────────────────────────
  const inFile = aliasExistsInFile(targetFile, alias);
  const inSession = checkAliasInSession(alias, selectedShell);
  const isDuplicate = inFile || inSession;

  if (isDuplicate) {
    const where = [
      inFile && color.cyan(path.basename(targetFile)),
      inSession && color.cyan("current session"),
    ]
      .filter(Boolean)
      .join(" and ");

    // -y or -o both auto-overwrite; otherwise prompt
    if (yes || overwrite) {
      note(
        `Alias ${color.yellow(alias)} already existed in ${where}. Overwriting.`,
        color.yellow("Overwrite"),
      );
      if (inFile) removeAliasFromFile(targetFile, alias);
    } else {
      note(
        `Alias ${color.yellow(alias)} already exists in ${where}.`,
        color.yellow("Duplicate"),
      );
      const confirmed = await confirm({
        message: "Overwrite existing alias?",
        initialValue: false,
      });
      if (!confirmed) {
        note("No changes were made.", "Cancelled");
        process.exit(0);
      }
      if (inFile) removeAliasFromFile(targetFile, alias);
    }
  }

  // ── Preview ────────────────────────────────────────────────────────────────
  const aliasLine = profile.aliasFormat(alias, command);

  note(
    [
      `${color.dim("Alias  :")} ${color.cyan(alias)}`,
      `${color.dim("Command:")} ${color.green(command)}`,
      `${color.dim("Shell  :")} ${color.yellow(selectedShell)}`,
      `${color.dim("File   :")} ${color.dim(targetFile)}`,
      ``,
      `${color.dim("Will append:")}`,
      color.white(aliasLine),
    ].join("\n"),
    "Preview",
  );

  // ── Write confirm (skipped with -y) ────────────────────────────────────────
  if (!yes) {
    const confirmed = await confirm({ message: "Write alias to file?" });
    if (!confirmed) {
      note("No changes were made.", "Cancelled");
      process.exit(0);
    }
  }

  // ── Write ──────────────────────────────────────────────────────────────────
  const s = spinner();
  s.start("Writing alias…");

  try {
    writeAliasToFile(targetFile, aliasLine, selectedShell);
    s.stop(color.green("Alias written."));
  } catch (err: any) {
    s.stop(color.red("Failed to write alias."));
    note(err?.message ?? String(err), color.red("Error"));
    process.exit(1);
  }

  // ── Done ───────────────────────────────────────────────────────────────────
  note(
    [
      `${color.cyan(alias)} → ${color.green(command)} added to ${color.dim(targetFile)}.`,
      ``,
      `Reload your shell to use it:`,
      color.yellow(RELOAD_CMDS[selectedShell] ?? "Restart your terminal"),
    ].join("\n"),
    color.green("Done"),
  );
}

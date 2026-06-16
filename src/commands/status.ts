import { intro, outro, note } from "@clack/prompts";
import color from "picocolors";
import fs from "fs-extra";
import { readConfig, detectTargetBase } from "../utils/config";
import type { AddedFile } from "../types/sourcetype";

export async function statusCommand() {
  intro(color.bgGreen(color.black(" qode status ")));

  let config;
  try {
    config = await readConfig();
  } catch (err: any) {
    note(err.message, color.red("Error"));
    outro(color.red("Exiting."));
    return;
  }

  const { hasSrc } = detectTargetBase();

  // Config summary
  note(
    [
      `${color.bold("Project dir:")}  ${config.dir}`,
      `${color.bold("Sources:")}      ${config.sources.length}`,
      `${color.bold("Files added:")}  ${config.added.length}`,
      `${color.bold("Target:")}       ${hasSrc ? "src/" : "project root"}`,
    ].join("\n"),
    "Configuration",
  );

  // Sources
  if (config.sources.length > 0) {
    const lines = config.sources.map((src, i) => {
      const vis = src.isPublic
        ? color.green("public")
        : color.yellow("private");
      return `  ${i + 1}. ${color.bold(src.alias ?? src.path)}  [${vis}]`;
    });
    note(lines.join("\n"), "Sources");
  }

  // Added files
  if (config.added.length > 0) {
    // Group by source
    const bySource: Record<string, AddedFile[]> = {};
    for (const f of config.added) {
      if (!bySource[f.source]) bySource[f.source] = [];
      bySource[f.source].push(f);
    }

    for (const [source, files] of Object.entries(bySource)) {
      const lines = files.map((f) => {
        const exists = fs.existsSync(f.localPath);
        const icon = exists ? color.green("✓") : color.red("✗ missing");
        const date = new Date(f.addedAt).toLocaleDateString();
        return `  ${icon}  ${f.path}  ${color.dim(date)}`;
      });
      note(lines.join("\n"), `From: ${color.cyan(source)}`);
    }
  } else {
    note(
      `No files added yet. Run ${color.cyan("qode add")} to pull files.`,
      "Added files",
    );
  }

  outro(color.green("Done."));
}

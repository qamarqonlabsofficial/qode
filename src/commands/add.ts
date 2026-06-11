import {
  intro,
  outro,
  select,
  multiselect,
  confirm,
  note,
} from "@clack/prompts";
import color from "picocolors";
import type { sourceType } from "../types/sourcetype";
import { readConfig, detectTargetBase } from "../utils/config";
import { interactiveFileSelector } from "./helpers/fileSelector";

export async function addCommand() {
  intro(color.bgCyan(color.black(" qnlabs — add files ")));

  let config;
  try {
    config = await readConfig();
  } catch (err: any) {
    note(err.message, color.red("Error"));
    outro(color.red("Exiting."));
    return;
  }

  const sources: sourceType[] = config.sources;

  if (sources.length === 0) {
    note(
      `No sources configured.\nRun ${color.cyan("qnlabs sources add")} to add a source first.`,
      color.red("No sources"),
    );
    outro(color.red("Exiting."));
    return;
  }

  const { base: targetBase, hasSrc } = detectTargetBase();

  note(
    `Files will be placed in: ${color.cyan(hasSrc ? "src/" : "project root")}`,
    "Target directory",
  );

  // Let user decide: single source or multiple
  const sourceMode = await select({
    message: "Which source(s) do you want to pull from?",
    options: [
      { value: "single", label: "One source" },
      { value: "multi", label: "Multiple sources at once" },
    ],
  });

  if (typeof sourceMode === "symbol") {
    outro("Cancelled.");
    return;
  }

  let chosenSources: sourceType[] = [];

  if (sourceMode === "single") {
    const chosen = await select({
      message: "Select source",
      options: sources.map((src) => ({
        value: src,
        label: src.alias
          ? `${color.bold(src.alias)}  ${color.dim(src.path)}`
          : src.path,
        hint: src.isPublic ? "public" : "private",
      })),
    });

    if (typeof chosen === "symbol") {
      outro("Cancelled.");
      return;
    }

    chosenSources = [chosen as sourceType];
  } else {
    const chosen = await multiselect({
      message: "Select sources (space to toggle)",
      options: sources.map((src) => ({
        value: src,
        label: src.alias
          ? `${color.bold(src.alias)}  ${color.dim(src.path)}`
          : src.path,
        hint: src.isPublic ? "public" : "private",
      })),
      required: true,
    });

    if (typeof chosen === "symbol") {
      outro("Cancelled.");
      return;
    }

    chosenSources = chosen as sourceType[];
  }

  // Run selection flow for each chosen source sequentially
  for (const source of chosenSources) {
    note(
      `Source: ${color.cyan(source.alias ?? source.path)}`,
      `Browsing ${chosenSources.indexOf(source) + 1} of ${chosenSources.length}`,
    );

    await interactiveFileSelector({
      source,
      targetBase,
      trackInConfig: true,
    });

    if (chosenSources.indexOf(source) < chosenSources.length - 1) {
      const continueNext = await confirm({
        message: `Continue to next source (${color.cyan(
          chosenSources[chosenSources.indexOf(source) + 1].alias ??
            chosenSources[chosenSources.indexOf(source) + 1].path,
        )})?`,
        initialValue: true,
      });
      if (!continueNext || typeof continueNext === "symbol") {
        note("Stopped early.", "Skipped remaining sources");
        break;
      }
    }
  }

  outro(color.green("Done!"));
}

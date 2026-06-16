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
import { readConfig, writeConfig } from "../utils/config";
import { AddSources } from "./helpers/init/addSources";
import type { sourceType } from "../types/sourcetype";

export async function sourcesCommand(subcommand?: string) {
  intro(color.bgBlue(color.white(" qode sources ")));

  let config;
  try {
    config = await readConfig();
  } catch (err: any) {
    note(err.message, color.red("Error"));
    outro(color.red("Exiting."));
    return;
  }

  // If a subcommand was passed via CLI, route directly
  const action =
    subcommand ??
    ((await select({
      message: "What do you want to do with sources?",
      options: [
        { value: "list", label: "📋  List all sources" },
        { value: "add", label: "➕  Add a new source" },
        { value: "remove", label: "🗑   Remove a source" },
        { value: "edit", label: "✏️   Edit a source (alias or token)" },
      ],
    })) as string);

  if (typeof action === "symbol") {
    outro("Cancelled.");
    return;
  }

  switch (action) {
    case "list":
      await listSources(config.sources);
      break;
    case "add":
      await addSource(config);
      break;
    case "remove":
      await removeSource(config);
      break;
    case "edit":
      await editSource(config);
      break;
    default:
      note(`Unknown subcommand: ${action}`, color.red("Error"));
  }

  outro(color.blue("Done."));
}

async function listSources(sources: sourceType[]) {
  if (sources.length === 0) {
    note(
      `No sources configured yet.\nRun ${color.cyan("qode sources add")} to add one.`,
      "Sources",
    );
    return;
  }

  const lines = sources.map((src, i) => {
    const label = src.alias
      ? color.bold(src.alias)
      : color.dim(`source-${i + 1}`);
    const visibility = src.isPublic
      ? color.green("public")
      : color.yellow("private");
    const tokenStatus = src.isPublic
      ? ""
      : `  token: ${src.authToken.slice(0, 6)}...`;
    return `  ${i + 1}. ${label}  ${color.dim(src.path)}  [${visibility}]${tokenStatus}`;
  });

  note(lines.join("\n"), `${sources.length} source(s) registered`);
}

async function addSource(config: Awaited<ReturnType<typeof readConfig>>) {
  const newSources = await AddSources([]);
  if (newSources.length === 0) {
    note("No sources added.", "Skipped");
    return;
  }
  config.sources.push(...newSources);
  const s = spinner();
  s.start("Saving...");
  await writeConfig(config);
  s.stop(color.green(`${newSources.length} source(s) added.`));
}

async function removeSource(config: Awaited<ReturnType<typeof readConfig>>) {
  if (config.sources.length === 0) {
    note("No sources to remove.", "Empty");
    return;
  }

  const chosen = await select({
    message: "Which source do you want to remove?",
    options: config.sources.map((src, i) => ({
      value: i,
      label: src.alias
        ? `${color.bold(src.alias)}  ${color.dim(src.path)}`
        : src.path,
    })),
  });

  if (typeof chosen === "symbol") return;

  const idx = chosen as number;
  const target = config.sources[idx];

  const sure = await confirm({
    message: `Remove ${color.bold(target.alias ?? target.path)}? This cannot be undone.`,
    initialValue: false,
  });

  if (!sure || typeof sure === "symbol") {
    note("Cancelled.", "Kept");
    return;
  }

  config.sources.splice(idx, 1);

  const s = spinner();
  s.start("Saving...");
  await writeConfig(config);
  s.stop(color.green(`Removed: ${target.alias ?? target.path}`));
}

async function editSource(config: Awaited<ReturnType<typeof readConfig>>) {
  if (config.sources.length === 0) {
    note("No sources to edit.", "Empty");
    return;
  }

  const chosen = await select({
    message: "Which source do you want to edit?",
    options: config.sources.map((src, i) => ({
      value: i,
      label: src.alias
        ? `${color.bold(src.alias)}  ${color.dim(src.path)}`
        : src.path,
    })),
  });

  if (typeof chosen === "symbol") return;

  const idx = chosen as number;
  const src = config.sources[idx];

  const field = await select({
    message: "What do you want to change?",
    options: [
      { value: "alias", label: "Alias (friendly name)" },
      { value: "token", label: "Auth token (PAT)" },
      { value: "visibility", label: "Visibility (public / private)" },
    ],
  });

  if (typeof field === "symbol") return;

  if (field === "alias") {
    const newAlias = await text({
      message: "New alias",
      placeholder: src?.alias ?? "my-components",
      defaultValue: src?.alias,
    });
    if (typeof newAlias !== "symbol") {
      config.sources[idx].alias = newAlias || undefined;
    }
  } else if (field === "token") {
    const newToken = await text({
      message: "New Personal Access Token",
      placeholder: "ghp_...",
      validate: (val) => {
        if (!val || val.trim().length < 10) return "Token looks too short";
      },
    });
    if (typeof newToken !== "symbol") {
      config.sources[idx].authToken = newToken;
      config.sources[idx].isPublic = false;
    }
  } else if (field === "visibility") {
    const vis = await select({
      message: "New visibility",
      options: [
        { value: "public", label: "Public — no token needed" },
        { value: "private", label: "Private — requires PAT" },
      ],
    });
    if (typeof vis !== "symbol") {
      config.sources[idx].isPublic = vis === "public";
      if (vis === "public") config.sources[idx].authToken = "none";
    }
  }

  const s = spinner();
  s.start("Saving...");
  await writeConfig(config);
  s.stop(color.green("Source updated."));
}

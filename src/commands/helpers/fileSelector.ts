import { confirm, spinner, note } from "@clack/prompts";
import color from "picocolors";
import path from "path";
import fs from "fs-extra";
import readline from "readline";
import type { GitTreeItem, sourceType } from "../../types/sourcetype";
import {
  buildOctokit,
  parseSourcePath,
  fetchRepoTree,
  downloadFile,
  groupByDirectory,
} from "../../utils/github";
import { recordAddedFile } from "../../utils/config";

export type DownloadContext = {
  source: sourceType;
  targetBase: string;
  trackInConfig: boolean;
};

// ─── Paged TUI selector ────────────────────────────────────────────────────
// Replaces clack multiselect/select for large option sets.
// Renders only the visible window (terminal height - 6 lines for chrome).
// Space toggles selection, / opens filter, Enter confirms, Esc cancels.

type SelectorItem = {
  label: string;
  value: string; // we use path string as key, look up object later
  hint?: string;
};

async function pagedSelector(
  message: string,
  items: SelectorItem[],
  multi: boolean,
): Promise<string[] | null> {
  // Requires a real TTY
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return null;
  }

  const termH = process.stdout.rows ?? 24;
  const termW = process.stdout.columns ?? 80;
  const VISIBLE = Math.max(5, termH - 8); // lines available for the list

  let filter = "";
  let filterMode = false;
  let cursor = 0; // index in filtered list
  let offset = 0; // scroll offset
  const selected = new Set<string>();

  // Filtered view — recomputed when filter changes
  let view: SelectorItem[] = items;

  function refilter() {
    if (!filter) {
      view = items;
    } else {
      const q = filter.toLowerCase();
      view = items.filter((i) => i.label.toLowerCase().includes(q));
    }
    // Keep cursor in bounds
    if (cursor >= view.length) cursor = Math.max(0, view.length - 1);
    // Keep offset so cursor is visible
    if (cursor < offset) offset = cursor;
    if (cursor >= offset + VISIBLE) offset = cursor - VISIBLE + 1;
  }

  function renderLine(text: string) {
    // Truncate to terminal width to prevent wrapping (which breaks cursor math)
    const stripped = text.replace(/\x1b\[[0-9;]*m/g, "");
    if (stripped.length <= termW) {
      process.stdout.write(text + "\n");
    } else {
      // Trim but preserve ANSI at start
      process.stdout.write(text.slice(0, termW - 1) + "\n");
    }
  }

  let renderedLines = 0;

  function render() {
    // Clear previously rendered lines
    if (renderedLines > 0) {
      process.stdout.write(`\x1b[${renderedLines}A`); // cursor up
      process.stdout.write("\x1b[J"); // erase from cursor to end
    }

    const lines: string[] = [];

    // Header
    const selCount = selected.size;
    const headerRight = multi
      ? color.dim(`${selCount} selected · ${view.length}/${items.length} shown`)
      : color.dim(`${view.length}/${items.length} shown`);
    lines.push(
      color.cyan("◆") +
        " " +
        color.bold(message) +
        (filter ? color.yellow(` /${filter}`) : "") +
        "  " +
        headerRight,
    );

    // List window
    const windowEnd = Math.min(offset + VISIBLE, view.length);
    for (let i = offset; i < windowEnd; i++) {
      const item = view[i];
      const isCursor = i === cursor;
      const isSelected = selected.has(item.value);

      const tick = multi
        ? isSelected
          ? color.green("◼")
          : color.dim("◻")
        : isCursor
          ? color.cyan("▶")
          : " ";

      const label = isCursor
        ? color.bold(color.white(item.label))
        : isSelected
          ? color.green(item.label)
          : color.dim(item.label);

      const hint = item.hint ? color.dim(` ${item.hint}`) : "";

      lines.push(`  ${tick} ${label}${hint}`);
    }

    // Scroll indicator
    if (view.length > VISIBLE) {
      const pct = Math.round((offset / (view.length - VISIBLE)) * 100);
      lines.push(
        color.dim(
          `  ─── ${offset + 1}–${windowEnd} of ${view.length} · ${pct}% ───`,
        ),
      );
    }

    // Footer hints
    if (filterMode) {
      lines.push(
        color.yellow(`  / ${filter}`) +
          color.dim("  (esc to cancel filter, enter to confirm)"),
      );
    } else {
      const hints = multi
        ? color.dim(
            "  space·toggle  a·all  n·none  /·filter  enter·confirm  esc·cancel",
          )
        : color.dim("  ↑↓·move  /·filter  enter·confirm  esc·cancel");
      lines.push(hints);
    }

    for (const line of lines) renderLine(line);
    renderedLines = lines.length;
  }

  // Raw mode setup
  process.stdin.setRawMode(true);
  process.stdin.resume();
  readline.emitKeypressEvents(process.stdin);

  return new Promise((resolve) => {
    refilter();
    render();

    function cleanup() {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener("keypress", onKey);
      // Clear the selector UI
      if (renderedLines > 0) {
        process.stdout.write(`\x1b[${renderedLines}A\x1b[J`);
      }
    }

    function scrollToCursor() {
      if (cursor < offset) offset = cursor;
      if (cursor >= offset + VISIBLE) offset = cursor - VISIBLE + 1;
    }

    function onKey(
      _: unknown,
      key: { name: string; ctrl: boolean; sequence: string },
    ) {
      if (!key) return;

      if (filterMode) {
        if (key.name === "escape") {
          filter = "";
          filterMode = false;
          refilter();
          render();
          return;
        }
        if (key.name === "return") {
          filterMode = false;
          refilter();
          render();
          return;
        }
        if (key.name === "backspace") {
          filter = filter.slice(0, -1);
          refilter();
          render();
          return;
        }
        if (key.sequence && key.sequence.length === 1 && !key.ctrl) {
          filter += key.sequence;
          refilter();
          render();
          return;
        }
        return;
      }

      // Normal mode
      if (key.ctrl && key.name === "c") {
        cleanup();
        resolve(null);
        return;
      }
      if (key.name === "escape") {
        cleanup();
        resolve(null);
        return;
      }
      if (key.name === "up" || key.name === "k") {
        cursor = Math.max(0, cursor - 1);
        scrollToCursor();
        render();
        return;
      }
      if (key.name === "down" || key.name === "j") {
        cursor = Math.min(view.length - 1, cursor + 1);
        scrollToCursor();
        render();
        return;
      }
      // Page up/down
      if (key.name === "pageup") {
        cursor = Math.max(0, cursor - VISIBLE);
        scrollToCursor();
        render();
        return;
      }
      if (key.name === "pagedown") {
        cursor = Math.min(view.length - 1, cursor + VISIBLE);
        scrollToCursor();
        render();
        return;
      }
      if (key.name === "/") {
        console.log(key.name);
        filterMode = true;
        render();
        return;
      }
      if (multi && key.name === "space") {
        const val = view[cursor]?.value;
        if (val) {
          selected.has(val) ? selected.delete(val) : selected.add(val);
        }
        render();
        return;
      }
      if (multi && key.name === "a") {
        // Toggle all: if all selected, deselect all; else select all visible
        const allSelected = view.every((i) => selected.has(i.value));
        if (allSelected) {
          view.forEach((i) => selected.delete(i.value));
        } else {
          view.forEach((i) => selected.add(i.value));
        }
        render();
        return;
      }
      if (multi && key.name === "n") {
        selected.clear();
        render();
        return;
      }
      if (key.name === "return") {
        cleanup();
        if (multi) {
          resolve(selected.size > 0 ? Array.from(selected) : null);
        } else {
          resolve(view[cursor] ? [view[cursor].value] : null);
        }
        return;
      }
    }

    process.stdin.on("keypress", onKey);
  });
}

// ─── Public API ────────────────────────────────────────────────────────────

export async function interactiveFileSelector(
  ctx: DownloadContext,
): Promise<void> {
  const { owner, repo } = parseSourcePath(ctx.source.path);
  const octokit = buildOctokit(ctx.source);

  const s = spinner();
  s.start(`Fetching file tree from ${color.cyan(`${owner}/${repo}`)}...`);

  let tree: GitTreeItem[];
  try {
    tree = await fetchRepoTree(octokit, owner, repo);
    s.stop(color.green(`Loaded ${tree.length} files from ${owner}/${repo}`));
  } catch (err: any) {
    s.stop(color.red("Failed to fetch repo tree"));
    note(err.message, color.red("Error"));
    return;
  }

  const groups = groupByDirectory(tree);

  // Mode selection — small fixed list, safe for clack
  const { select } = await import("@clack/prompts");
  const mode = await select({
    message: "How do you want to select files?",
    options: [
      {
        value: "files",
        label: "Pick individual files  " + color.dim(`(${tree.length} total)`),
      },
      { value: "directory", label: "Pick an entire directory" },
      { value: "all", label: "Download everything" },
    ],
  });

  if (typeof mode === "symbol") return;

  let filesToDownload: GitTreeItem[] = [];

  if (mode === "all") {
    filesToDownload = tree;
  } else if (mode === "directory") {
    const dirNames = Object.keys(groups).sort();

    const dirItems: SelectorItem[] = dirNames.map((d) => ({
      label: d,
      value: d,
      hint: `${groups[d].length} files`,
    }));

    const chosen = await pagedSelector(
      "Select a directory",
      dirItems,
      false, // single select
    );

    if (!chosen) return;
    filesToDownload = groups[chosen[0]] ?? [];
  } else {
    // Individual file selection — the broken path for large repos
    const fileItems: SelectorItem[] = tree
      .filter((f) => f.path)
      .map((f) => ({
        label: f.path!,
        value: f.path!,
        hint: f.size ? `${(f.size / 1024).toFixed(1)}K` : undefined,
      }));

    const chosen = await pagedSelector(
      "Select files  (space·toggle  a·all  /·filter  enter·confirm)",
      fileItems,
      true, // multi select
    );

    if (!chosen || chosen.length === 0) return;

    // Map back to GitTreeItem objects
    const pathSet = new Set(chosen);
    filesToDownload = tree.filter((f) => f.path && pathSet.has(f.path));
  }

  if (filesToDownload.length === 0) {
    note("No files selected.", "Skipped");
    return;
  }

  const ok = await confirm({
    message: `Download ${color.bold(String(filesToDownload.length))} file(s) into ${color.cyan(ctx.targetBase)}?`,
    initialValue: true,
  });

  if (!ok || typeof ok === "symbol") {
    note("Cancelled.", "Aborted");
    return;
  }

  await downloadFilesToDisk(filesToDownload, ctx, owner, repo, octokit);
}

export async function downloadFilesToDisk(
  files: GitTreeItem[],
  ctx: DownloadContext,
  owner: string,
  repo: string,
  octokit: ReturnType<typeof buildOctokit>,
): Promise<void> {
  const s = spinner();
  s.start(`Downloading ${files.length} file(s)...`);

  const results: { ok: string[]; fail: string[] } = { ok: [], fail: [] };

  for (const file of files) {
    if (!file.path) continue;
    try {
      const content = await downloadFile(octokit, owner, repo, file.path);
      const localPath = path.join(ctx.targetBase, file.path);
      await fs.ensureDir(path.dirname(localPath));
      await fs.writeFile(localPath, content, "utf-8");
      results.ok.push(file.path);

      if (ctx.trackInConfig) {
        await recordAddedFile({
          path: file.path,
          source: ctx.source.alias ?? ctx.source.path,
          localPath,
          addedAt: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      results.fail.push(file.path);
    }
  }

  s.stop(
    results.fail.length === 0
      ? color.green(`Downloaded ${results.ok.length} file(s) successfully.`)
      : color.yellow(
          `Downloaded ${results.ok.length} file(s). ${results.fail.length} failed.`,
        ),
  );

  if (results.ok.length > 0) {
    note(
      results.ok.map((f) => `  ${color.green("✓")} ${f}`).join("\n"),
      "Downloaded",
    );
  }
  if (results.fail.length > 0) {
    note(
      results.fail.map((f) => `  ${color.red("✗")} ${f}`).join("\n"),
      color.red("Failed"),
    );
  }
}

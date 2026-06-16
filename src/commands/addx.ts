import { intro, outro, text, select, confirm, note } from "@clack/prompts";
import color from "picocolors";
import path from "path";
import { detectTargetBase } from "../utils/config";
import { interactiveFileSelector } from "./helpers/fileSelector";
import type { sourceType } from "../types/sourcetype";

export async function addxCommand(repoArg?: string, tokenArg?: string) {
  intro(color.bgMagenta(color.black(" qode addx — one-shot fetch ")));

  note(
    "Fetch files from any GitHub repo without saving it to your config.\n" +
      color.dim(
        "Great for one-off pulls, trying things out, or quick patches.",
      ),
    "One-shot mode",
  );

  // Repo path input
  let repoPath: string;
  if (repoArg) {
    repoPath = repoArg.startsWith("github:") ? repoArg : `github:${repoArg}`;
    note(`Using repo: ${color.cyan(repoPath)}`, "From argument");
  } else {
    const input = await text({
      message: "Enter the repo path",
      placeholder: "github:owner/repo  or  owner/repo",
      validate: (val) => {
        const normalized = val.startsWith("github:") ? val : `github:${val}`;
        if (!normalized.includes("/")) return "Must be in format: owner/repo";
        const parts = normalized.replace("github:", "").split("/");
        if (parts.length < 2 || !parts[0] || !parts[1])
          return "Invalid format — expected owner/repo";
      },
    });
    if (typeof input === "symbol") {
      outro("Cancelled.");
      return;
    }
    repoPath = input.startsWith("github:") ? input : `github:${input}`;
  }

  // Visibility
  const visibility = await select({
    message: "Is this a public or private repo?",
    options: [
      { value: "public", label: "🌐  Public" },
      { value: "private", label: "🔒  Private (needs PAT)" },
    ],
  });

  if (typeof visibility === "symbol") {
    outro("Cancelled.");
    return;
  }

  let authToken = "none";
  if (visibility === "private") {
    if (tokenArg) {
      authToken = tokenArg;
      note("Using token from --token flag.", "Auth");
    } else {
      const token = await text({
        message: "Enter your Personal Access Token (PAT)",
        placeholder: "ghp_...",
        validate: (val) => {
          if (!val || val.trim().length < 10) return "Token looks too short";
        },
      });
      if (typeof token === "symbol") {
        outro("Cancelled.");
        return;
      }
      authToken = token;
    }
  }

  // Where to write
  const { base: defaultBase, hasSrc } = detectTargetBase();
  const targetChoice = await select({
    message: "Where should files be written?",
    options: [
      {
        value: "default",
        label: hasSrc
          ? `src/  ${color.dim("(detected)")}`
          : `Project root  ${color.dim("(no src/ found)")}`,
      },
      { value: "custom", label: "Custom path" },
    ],
  });

  if (typeof targetChoice === "symbol") {
    outro("Cancelled.");
    return;
  }

  let targetBase = defaultBase;
  if (targetChoice === "custom") {
    const customPath = await text({
      message: "Enter target directory (relative to cwd)",
      placeholder: "src/components",
      validate: (val) => {
        if (!val || val.trim().length === 0) return "Path cannot be empty";
      },
    });
    if (typeof customPath === "symbol") {
      outro("Cancelled.");
      return;
    }
    targetBase = path.resolve(process.cwd(), customPath);
  }

  const source: sourceType = {
    path: repoPath,
    isPublic: visibility === "public",
    authToken,
  };

  await interactiveFileSelector({
    source,
    targetBase,
    trackInConfig: false, // addx never writes to qode.json
  });

  outro(color.magenta("Done! Files fetched without touching your config."));
}

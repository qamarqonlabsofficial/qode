import { Octokit } from "@octokit/rest";
import type { sourceType, GitTreeItem } from "../types/sourcetype";

/**
 * Parse "github:owner/repo" into { owner, repo }
 */
export function parseSourcePath(sourcePath: string): {
  owner: string;
  repo: string;
} {
  const stripped = sourcePath.replace(/^github:/, "");
  const [owner, repo] = stripped.split("/");
  if (!owner || !repo) {
    throw new Error(
      `Invalid source path: "${sourcePath}". Expected format: github:owner/repo`,
    );
  }
  return { owner, repo };
}

/**
 * Build an authenticated (or anonymous) Octokit instance for a source
 */
export function buildOctokit(source: sourceType): Octokit {
  return source.isPublic || source.authToken === "none"
    ? new Octokit()
    : new Octokit({ auth: source.authToken });
}

/**
 * Fetch the full recursive file tree for a repo at HEAD of `main` (falls back to `master`)
 */
export async function fetchRepoTree(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<GitTreeItem[]> {
  let sha: string;

  // Try main, then master
  for (const branch of ["main", "master"]) {
    try {
      const refResponse = await octokit.request(
        "GET /repos/{owner}/{repo}/git/ref/{ref}",
        { owner, repo, ref: `heads/${branch}` },
      );
      sha = refResponse.data.object.sha;
      break;
    } catch {
      continue;
    }
  }

  if (!sha!) {
    throw new Error(
      `Could not resolve HEAD for ${owner}/${repo}. Ensure the repo exists and you have access.`,
    );
  }

  const treeResponse = await octokit.request(
    "GET /repos/{owner}/{repo}/git/trees/{tree_sha}",
    { owner, repo, tree_sha: sha, recursive: "1" },
  );

  return (treeResponse.data.tree as GitTreeItem[]).filter(
    (item) => item.type === "blob",
  );
}

/**
 * Download a single file's content as a UTF-8 string via the Contents API
 */
export async function downloadFile(
  octokit: Octokit,
  owner: string,
  repo: string,
  filePath: string,
): Promise<string> {
  const response = await octokit.request(
    "GET /repos/{owner}/{repo}/contents/{path}",
    { owner, repo, path: filePath },
  );

  const data = response.data as { content?: string; encoding?: string };

  if (!data.content) {
    throw new Error(`No content returned for ${filePath}`);
  }

  // GitHub returns base64 encoded content
  const content = Buffer.from(data.content, "base64").toString("utf-8");
  return content;
}

/**
 * Group flat tree items into directory buckets for the "select directory" flow
 */
export function groupByDirectory(
  items: GitTreeItem[],
): Record<string, GitTreeItem[]> {
  const groups: Record<string, GitTreeItem[]> = { "(root)": [] };

  for (const item of items) {
    if (!item.path) continue;
    const parts = item.path.split("/");
    if (parts.length === 1) {
      groups["(root)"].push(item);
    } else {
      const dir = parts.slice(0, -1).join("/");
      if (!groups[dir]) groups[dir] = [];
      groups[dir].push(item);
    }
  }

  // Remove empty root if nothing is there
  if (groups["(root)"].length === 0) delete groups["(root)"];

  return groups;
}

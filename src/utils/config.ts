import fs from "fs-extra";
import path from "path";
import type { QnlabsConfig, AddedFile } from "../types/sourcetype";

const CONFIG_FILENAME = "qnlabs.json";

export function getConfigPath(cwd = process.cwd()): string {
  return path.join(cwd, CONFIG_FILENAME);
}

export function configExists(cwd = process.cwd()): boolean {
  return fs.existsSync(getConfigPath(cwd));
}

export async function readConfig(cwd = process.cwd()): Promise<QnlabsConfig> {
  const configPath = getConfigPath(cwd);
  if (!fs.existsSync(configPath)) {
    throw new Error(`No qnlabs.json found in ${cwd}. Run "qnlabs init" first.`);
  }
  return fs.readJson(configPath) as Promise<QnlabsConfig>;
}

export async function writeConfig(
  config: QnlabsConfig,
  cwd = process.cwd(),
): Promise<void> {
  const configPath = getConfigPath(cwd);
  await fs.writeJson(configPath, config, { spaces: 2 });
}

/**
 * Detect whether the project has a src/ directory.
 * Returns the target base path: "<cwd>/src" if it exists, otherwise "<cwd>"
 */
export function detectTargetBase(cwd = process.cwd()): {
  base: string;
  hasSrc: boolean;
} {
  const srcPath = path.join(cwd, "src");
  const hasSrc = fs.existsSync(srcPath) && fs.statSync(srcPath).isDirectory();
  return { base: hasSrc ? srcPath : cwd, hasSrc };
}

/**
 * Record a downloaded file into the config's `added` array
 */
export async function recordAddedFile(
  entry: AddedFile,
  cwd = process.cwd(),
): Promise<void> {
  const config = await readConfig(cwd);
  // Deduplicate by localPath — overwrite if re-added
  config.added = config.added.filter((f) => f.localPath !== entry.localPath);
  config.added.push(entry);
  await writeConfig(config, cwd);
}

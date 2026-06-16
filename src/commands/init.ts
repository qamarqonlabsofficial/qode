import { intro, text, outro, spinner, note } from "@clack/prompts";
import fs from "fs-extra";
import path from "path";
import color from "picocolors"; // comes with clack for terminal colors
import { detectTargetBase } from "../utils/config";
import { AddSources } from "./helpers/init/addSources";

export async function initCommand() {
  let initConf;
  intro(
    color.bgCyan(color.black("______QamarQonLabs CLI - initializing______")),
  );
  const cwd = process.cwd();
  const config = path.join(cwd, "qode.json");
  const isInitialized = fs.existsSync(config);
  if (isInitialized) {
    outro(color.red("Project is already initialized found: qode.json"));
    note(color.red("REASON: Already intialized."), "EXITING");
    return;
  } else {
    var sources = await AddSources([]).then((res) => {
      return res;
    });
  }
  initConf = {
    dir: cwd,
    sources: sources,
    added: [],
  };
  fs.writeJson(config, await initConf);
  const gitIgnore = path.join(cwd, ".gitignore");
  const gitIgnoreContent = fs.readFileSync(gitIgnore, "utf-8");
  fs.writeFileSync(gitIgnore, gitIgnoreContent + "\n\n# qode\n\nqode.json");
}

# qode 📦

`qode` is a GitHub-based file distribution CLI tailored for QamarQonLabs and the broader developer community[cite: 1]. It enables developers to pull specific files or directories directly from public or private GitHub repositories directly into local projects without the need for manual git cloning or publishing modules to registry ecosystems[cite: 1, 6].

---

## 🚀 Getting Started

If you invoke `qode` without arguments, it defaults into an interactive step-by-step menu that guides you through every command[cite: 1].

```bash
# Enter interactive menu mode
qode
```
### Project Initialization

To start tracking file pulling configuration, initialize `qode` inside your project root:

```bash
qode init

```

- This command walks you through setting up your project's initial repository sources.

- It creates a tracking file named `qode.json` inside your current working directory.

- It automatically appends rules to your local `.gitignore` file to ensure configuration isolation (`qode.json`).

---

## 🛠️ Command Reference

### 1. `qode add`

Pull files or folders interactively into your project workspace.

```bash
qode add

```

- **Directory Detection:** Automatically scans your folder workspace to see if a `src/` directory exists, falling back to the project root if it does not.

- **Flexible Sourcing:** Allows you to browse a single registered repository or selectively pull files from multiple target sources simultaneously.

- **State Management:** All successfully downloaded files are systematically appended to your local configurations tracking index.

### 2. `qode addx`

One-shot file retrieval that downloads items instantly from any public or private GitHub repository without registering changes inside your local configuration file.

```bash
qode addx [repo] [options]

```

- **Format:** Expects a repository path configured as `owner/repo` or explicit `github:owner/repo`.

- **Target Options:** Lets you dump downloads into automatically resolved default directories or supply a custom target directory path relative to your execution folder.

- **Options:**
- `-t, --token <token>`: Explicitly pass a Personal Access Token (PAT) for unlocking private repositories directly on the CLI.

### 3. `qode sources`

Manage the collection of registered GitHub remote repository paths configured inside your workspace environment.

```bash
qode sources [subcommand]

```

- **Shorthand Shortcuts:** You can bypass the standard command sequence and invoke specific sub-actions cleanly via `qode sources:list`, `qode sources:add`, `qode sources:remove`, or `qode sources:edit`.

- **Subcommands:**
- `list`: Outputs an indexed summary detailing aliases, visibility scopes, repository endpoints, and localized token flags.

- `add`: Triggers the interactive prompt workflow to cleanly parse and append fresh repository mappings to your tracking array.

- `remove`: Safely cuts an existing configuration map from your source lists with interactive safeguards.

- `edit`: Granularly adjust properties such as readable folder aliases, secure authentication keys, and underlying public/private visibility parameters.

### 4. `qode status`

Provides real-time validation logs tracking project dependencies and workspace structure.

```bash
qode status

```

- Summarizes project configuration properties such as active execution pathways, source counts, and downloaded files tracker metrics.

- Breaks down your pulled assets item-by-item, grouping them by their native source endpoints while calculating their pull timestamps.

- Conducts atomic local file checks to verify file presence, outputting a clear visual indicator (`✓ present` or `✗ missing`).

### 5. `qode alias`

A multi-platform workspace customization controller that lets you write shell commands directly into your global or local profiles.

```bash
qode alias <name> <command> [options]

```

- **Supported Shells:** Native structural alignment provided for `bash`, `zsh`, `fish`, `ksh`, `tcsh`, `powershell`, and `cmd.exe` environments.

- **Options:**
- `-s, --shell <name>`: Explicitly target a specific system shell.

- `-f, --file <path>`: Input an explicit direct absolute file path pointing to your customized environment terminal profile configuration.

- `-y, --yes`: Bypass text confirmation prompts to facilitate automation processes.

- `-o, --overwrite`: Forces structural replacement if an alias matches an already existing mapping pattern.

### 6. `qode snippet`

A workflow automation layer that scaffolds, parses, and formats code snippet definitions inside VS Code structures.

```bash
qode snippet [subcommand]

```

- **Subcommands:**
- `add-project`: Appends structured snippets locally inside the current workspace path at `.vscode/qode.code-snippets`.

- `add-global`: Generates multi-environment, cross-project accessible snippets, automatically targetting corresponding system folders depending on operating platform configurations.

- `edit`: Invokes automated platform text editor lookups to view and manipulate structural JSON files natively.

- `list`: Aggregates active schemas, listing scopes, trigger handles, and contextual files registered across workspace limits.

---

## 📄 The State File (`qode.json`)

The state configuration file matches this format:

```json
{
  "dir": "/absolute/path/to/project",
  "sources": [
    {
      "path": "github:owner/repo",
      "isPublic": true,
      "authToken": "none",
      "alias": "ui-core"
    }
  ],
  "added": [
    {
      "source": "github:owner/repo",
      "path": "components/Button.tsx",
      "localPath": "/absolute/path/to/project/src/components/Button.tsx",
      "addedAt": "2026-06-17T14:20:00.000Z"
    }
  ]
}
```

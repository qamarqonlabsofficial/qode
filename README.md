# qode CLI

> Pull any file from any GitHub repo directly into your project — no manual cloning, no copy-pasting.

A file distribution CLI built for developers who maintain component registries, shared utilities, or internal toolkits across multiple projects. Think **shadcn/ui's `add` command**, but for your own repos.

---

## Why this exists

Every team eventually builds a private component library, a shared utils folder, or a set of configs they copy across projects. qode makes that distribution first-class:

- **No npm publish required** — your files live in a GitHub repo, that's it
- **Works with private repos** — PAT auth built in
- **Tracks what you've pulled** — `qode status` shows you exactly what came from where
- **One-shot pulls** — `addx` lets you grab anything from any public repo without touching config

---

## Installation

```bash
# Via npm (global)
npm install -g @qamarqonlabs/qode

# Or run directly with bunx / npx
bunx @qamarqonlabs/qode
```

---

## Quick start

```bash
# 1. In your project root:
qode init

# 2. Pull files from your registered source:
qode add

# 3. One-shot fetch (no config needed):
qode addx qamarqonlabs/ui-kit
```

---

## Commands

### `qode` (no arguments)

Launches a full interactive menu — no need to remember command names.

```
? What do you want to do?
  add          Pull files from configured sources
  addx         One-shot fetch from any repo (no config needed)
  init         Set up qode in this project
  sources      View / manage your registered repos
  status       See tracked files and project state
  help         Learn about all commands
```

---

### `qode init`

Initializes `qode.json` in the current directory. Prompts you to add one or more GitHub sources. Automatically detects whether a `src/` directory exists and sets the appropriate default target.

```bash
qode init
```

---

### `qode add`

Pull files from your configured sources into the project.

**Features:**
- Choose one source or multiple sources in a single session
- Select individual files, an entire directory, or everything
- Files are written to `src/` if it exists, otherwise project root
- All downloads tracked in `qode.json`

```bash
qode add
```

---

### `qode addx [owner/repo] [--token <PAT>]`

One-shot fetch from **any** GitHub repo without saving it to your config. Great for:

- Trying out someone's component before committing
- Pulling a config file from a boilerplate repo
- Ad-hoc patches from any open source project

```bash
# Interactive mode
qode addx

# Pass repo directly
qode addx qamarqonlabs/ui-kit

# Private repo
qode addx myorg/private-lib --token ghp_...
```

Does **not** modify `qode.json`.

---

### `qode sources [subcommand]`

Manage your registered GitHub sources.

```bash
qode sources          # interactive menu
qode sources list     # list all registered sources
qode sources add      # add a new source
qode sources remove   # remove a source
qode sources edit     # update alias, token, or visibility
```

---

### `qode status`

Shows a full project health report:

- Config directory and target path
- All registered sources
- Every file that's been pulled, grouped by source
- Whether each file still exists on disk (`✓` / `✗ missing`)

```bash
qode status
```

---

### `qode help`

Interactive help. Select any command to get its full usage and description.

---

## qode.json format

```json
{
  "dir": "/path/to/your/project",
  "sources": [
    {
      "path": "github:qamarqonlabs/ui-kit",
      "isPublic": true,
      "authToken": "none",
      "alias": "ui-kit"
    },
    {
      "path": "github:myorg/private-components",
      "isPublic": false,
      "authToken": "ghp_...",
      "alias": "internal"
    }
  ],
  "added": [
    {
      "path": "components/Button.tsx",
      "source": "ui-kit",
      "localPath": "/path/to/project/src/components/Button.tsx",
      "addedAt": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

---

## Source path format

Sources use the format `github:owner/repo-name`:

```
github:qamarqonlabs/ui-kit
github:shadcn-ui/ui
github:myorg/private-repo
```

---

## Use cases

| Scenario | Command |
|---|---|
| Pull shared components into a new project | `qode add` |
| Grab a config file from any public repo | `qode addx` |
| Update a team member's private token | `qode sources edit` |
| See what files you've pulled and from where | `qode status` |
| Start fresh on a new project | `qode init` |

---

## Tech

- **Runtime**: Bun (compatible with Node.js)
- **CLI framework**: Commander
- **Interactive UI**: @clack/prompts
- **GitHub API**: @octokit/rest
- **File system**: fs-extra

---

## License

MIT © [QamarQonLabs](https://qamarqonlabs.com)

# dotnet-unified-poc

Use this repo as a bootstrap pattern for a fresh project that needs Biome + shared config.

## Fresh clone flow

1. Clone the repo:
   ```bash
   git clone --recurse-submodules <URL>
   ```
2. If this repo only has `package.json` at first, keep it that way.
3. Run:
   ```bash
   npm run setup
   ```
4. That will:
   - clone `formatter-common-config` into `formatter-common-config/` if missing
   - run `npm install`
   - create `.vscode/settings.json`
   - create `.vscode/extensions.json`
   - copy the shared Biome config to root `biome.json`
   - generate `scripts/watch-format.mjs` (optional alternative watcher, see below)
5. Install the **"Run on Save" (`emeraldwalk.runonsave`)** VS Code extension (VS Code
   will prompt you via the recommendation in `.vscode/extensions.json`).
6. Create or edit any JSON file, save it — it auto-formats with Biome.
7. Format on demand:
   ```bash
   npm run format
   ```

## Format on save — how it actually works

VS Code's `editor.formatOnSave` alone is only a *trigger*; it needs some extension to
register as the real formatter. Unlike Vim (`autocmd BufWritePre ... !command`), VS Code
has no built-in "run any shell command on save" hook.

`emeraldwalk.runonsave` is a thin, generic extension that fills that exact gap — it reads
a shell command straight from `.vscode/settings.json` and runs it whenever you save,
no matter which formatter it is:

```json
{
  "emeraldwalk.runonsave": {
    "commands": [
      { "match": "\\.(js|jsx|ts|tsx|json|jsonc|css|html)$", "isAsync": false, "cmd": "npx biome format --write ${file}" },
      { "match": "\\.cs$", "isAsync": false, "cmd": "dotnet format --include ${relativeFile}" }
    ]
  }
}
```

This is committed to the repo, so every teammate gets the exact same on-save behavior —
and later if we add ESLint or another tool, we just add another command entry here
instead of installing more editor-specific extensions.

### C#/.NET formatting

`dotnet format` (built into the .NET SDK, no extra install needed) formats `.cs` files
using the shared `.editorconfig` — copied to the repo root by `npm run setup`. It needs
exactly one `.sln`/`.slnx` file at the repo root to auto-discover the project(s); this
repo ships `dotnet-unified-poc.slnx` + a sample `src/App` project for that reason. If you
add more C# projects, add them to the solution with `dotnet sln add <path-to-csproj>`.

### If save still isn't formatting, check:

1. **Is the extension actually installed and enabled?** Open the Extensions panel
   (`Cmd+Shift+X`), search "Run on Save", confirm `emeraldwalk.runonsave` is installed —
   VS Code only prompts a suggestion, it doesn't auto-install.
2. **Reload the window** after installing (`Cmd+Shift+P` → "Developer: Reload Window").
3. **Check the Output panel** (`Cmd+Shift+U`) → dropdown → "Run On Save" channel — it
   logs the command it ran and any errors.
4. **Test the exact command manually** in a terminal at the repo root, e.g.
   `npx biome format --write src/index.json` or `dotnet format --include src/App/Program.cs`
   — if it fails there, it will fail in the extension too.
5. **Opened multiple repos in one VS Code window?** (e.g. a parent folder containing
   this repo alongside `js-unified-poc`, `formatter-common-config`, etc.) — VS Code only
   reads `.vscode/settings.json` from the window's actual root folder, so this repo's own
   settings get ignored. See "Multi-repo workspace setup" below for the fix.

### Multi-repo workspace setup

If you open a **parent folder** containing this repo alongside other repos (all in one
VS Code window, instead of opening `dotnet-unified-poc` directly), VS Code reads
`<parent>/.vscode/settings.json`, not this repo's own `.vscode/settings.json` — so
nothing will format on save unless you add equivalent config at that parent level.

Recommended: just open `dotnet-unified-poc` directly as its own window
(`File > Open Folder` → pick this repo, not its parent) — no extra config needed
beyond what `npm run setup` already generates.

If you do need everything open together in one window, create
`<parent-folder>/.vscode/settings.json` (this file is local to your machine only, not
part of any repo) with per-repo routing, e.g.:

```json
{
  "emeraldwalk.runonsave": {
    "commands": [
      {
        "match": "dotnet-unified-poc/.*\\.(js|jsx|ts|tsx|json|jsonc|css|html)$",
        "isAsync": false,
        "cmd": "cd \"${workspaceFolder}/dotnet-unified-poc\" && npx biome format --write \"${file}\""
      },
      {
        "match": "dotnet-unified-poc/.*\\.cs$",
        "isAsync": false,
        "cmd": "cd \"${workspaceFolder}/dotnet-unified-poc\" && dotnet format --include \"$(echo ${relativeFile} | sed 's#^dotnet-unified-poc/##')\""
      },
      {
        "match": "^js-unified-poc/.*\\.(js|jsx|ts|tsx|json|jsonc|css|html)$",
        "isAsync": false,
        "cmd": "cd \"${workspaceFolder}/js-unified-poc\" && npx biome format --write \"${file}\""
      },
      {
        "match": "^formatter-common-config/.*\\.(js|jsx|ts|tsx|json|jsonc|css|html)$",
        "isAsync": false,
        "cmd": "cd \"${workspaceFolder}/formatter-common-config\" && npx biome format --write \"${file}\""
      }
    ]
  }
}
```

Each `match` is a regex tested against the file's path relative to the parent folder.
Each `cmd` first `cd`s into the correct repo (so `npx`/`dotnet` find that repo's local
`node_modules`/`.editorconfig`/`.sln`), then formats. The `sed` in the `.cs` entry strips
the `dotnet-unified-poc/` prefix since `dotnet format --include` needs a path relative to
this repo's root, not to the parent folder.

### Zero-extension alternative

If you don't want to install *any* VS Code extension at all, run the background watcher
instead:

```bash
npm run watch
```

Leave this running in a terminal. It watches every file and runs `biome format --write`
the instant you save, completely independent of the editor. Stop it with `Ctrl+C`.

## package.json pattern

The `setup` script now also generates `scripts/watch-format.mjs`, so the inline command
is long. See the actual [`package.json`](./package.json) in this repo for the exact,
copy-pasteable script — it only needs:

- `scripts.setup` — the bootstrap one-liner (clones config, installs deps, writes
  `.vscode/*`, `biome.json`, and `scripts/watch-format.mjs`)
- `scripts.format` — `biome format --write .`
- `scripts.watch` — `node scripts/watch-format.mjs`
- `scripts.update-config` — pulls the latest shared config
- `devDependencies.@biomejs/biome`

A fresh project only needs that `package.json`; everything else (`.vscode/`, `biome.json`,
`scripts/`) is generated by `npm run setup`.

## Can this be copied to other projects?

Yes, if the new project has the same idea:

- a `package.json`
- Biome installed as a dev dependency
- access to `formatter-common-config`

Then the same `setup` and `format` pattern can be reused.

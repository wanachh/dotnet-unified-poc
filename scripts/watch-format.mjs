import { watch } from "node:fs";
import { execFile } from "node:child_process";
import { resolve } from "node:path";

const root = process.cwd();
const ignoreSegments = ["node_modules", ".git", "formatter-common-config", "config", "dist", "bin", "obj"];
const timers = new Map();
const DEBOUNCE_MS = 150;

const shouldIgnore = (filename) => ignoreSegments.some((seg) => filename.split(/[\\/]/).includes(seg));

console.log("👀 Watching for file saves... auto-formatting with Biome (Ctrl+C to stop)");

watch(root, { recursive: true }, (_eventType, filename) => {
  if (!filename || shouldIgnore(filename)) return;

  if (timers.has(filename)) clearTimeout(timers.get(filename));
  timers.set(
    filename,
    setTimeout(() => {
      timers.delete(filename);
      const fullPath = resolve(root, filename);
      execFile("npx", ["biome", "format", "--write", fullPath], { cwd: root }, (err) => {
        if (!err) console.log(`✨ formatted ${filename}`);
      });
    }, DEBOUNCE_MS),
  );
});

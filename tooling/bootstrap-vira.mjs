import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const release = JSON.parse(readFileSync(resolve(root, "vira-release.json"), "utf8"));
const target = resolve(root, ".vendor/vira-enterprise-genui");
const sibling = resolve(root, "../vira-enterprise-genui");
const sourceOverride = process.env.VIRA_SOURCE_DIR ? resolve(process.env.VIRA_SOURCE_DIR) : undefined;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: "utf8",
    stdio: options.capture === false ? "inherit" : "pipe",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed (${result.status})\n${result.stderr || result.stdout || ""}`);
  }
  return (result.stdout ?? "").trim();
}

function git(cwd, ...args) {
  return run("git", args, { cwd });
}

function isGitRepo(path) {
  if (!existsSync(path)) return false;
  const result = spawnSync("git", ["-C", path, "rev-parse", "--is-inside-work-tree"], { encoding: "utf8" });
  return result.status === 0 && result.stdout.trim() === "true";
}

function assertReleaseCheckout(path) {
  const head = git(path, "rev-parse", "HEAD");
  const tree = git(path, "rev-parse", "HEAD^{tree}");
  if (head !== release.sha) {
    throw new Error(`Vira checkout HEAD mismatch: expected ${release.sha}, got ${head}`);
  }
  if (tree !== release.tree) {
    throw new Error(`Vira checkout tree mismatch: expected ${release.tree}, got ${tree}`);
  }
  const dirty = git(path, "status", "--porcelain");
  if (dirty.length > 0) throw new Error("Vira vendored checkout is dirty; refusing to use mutable proof input");
}

function removeLocalWorktree(source) {
  if (!existsSync(target)) return;
  const removed = spawnSync("git", ["-C", source, "worktree", "remove", "--force", target], {
    encoding: "utf8",
  });
  if (removed.status !== 0 && existsSync(target)) rmSync(target, { recursive: true, force: true });
  spawnSync("git", ["-C", source, "worktree", "prune"], { encoding: "utf8" });
}

function prepareFromLocal(source) {
  if (!isGitRepo(source)) throw new Error(`VIRA_SOURCE_DIR is not a Git checkout: ${source}`);
  git(source, "cat-file", "-e", `${release.sha}^{commit}`);
  const sourceTree = git(source, "rev-parse", `${release.sha}^{tree}`);
  if (sourceTree !== release.tree) {
    throw new Error(`Local Vira object tree mismatch: expected ${release.tree}, got ${sourceTree}`);
  }
  removeLocalWorktree(source);
  mkdirSync(dirname(target), { recursive: true });
  git(source, "worktree", "add", "--detach", target, release.sha);
}

function prepareFromRemote() {
  if (existsSync(target)) rmSync(target, { recursive: true, force: true });
  mkdirSync(dirname(target), { recursive: true });
  run("git", ["clone", "--filter=blob:none", "--no-checkout", release.cloneUrl, target], { capture: false });
  git(target, "fetch", "--depth=1", "origin", release.sha);
  git(target, "checkout", "--detach", release.sha);
}

const localSource = sourceOverride ?? (isGitRepo(sibling) ? sibling : undefined);
if (localSource) prepareFromLocal(localSource);
else prepareFromRemote();

assertReleaseCheckout(target);
console.log(`VIRA_BOOTSTRAP_OK ${release.sha} ${release.tree}`);

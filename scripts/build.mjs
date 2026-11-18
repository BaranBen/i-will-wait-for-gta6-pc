// Builds dist/<name>-chrome-<version>.zip and dist/<name>-firefox-<version>.zip
// Usage: node scripts/build.mjs   (needs the `zip` command)
import { readFileSync, writeFileSync, rmSync, mkdirSync, cpSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILES = ["background.js", "content.js", "content.css", "defaults.js", "popup.html", "popup.js", "icons", "_locales"];
const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
const NAME = "i-will-wait-for-gta6-pc";
const dist = join(root, "dist");
// Only clear what this script makes, so other files kept in dist/ (e.g. store assets) survive.
mkdirSync(dist, { recursive: true });
for (const target of ["chrome", "firefox"]) rmSync(join(dist, target), { recursive: true, force: true });

function pack(target, m) {
  const dir = join(dist, target);
  mkdirSync(dir);
  for (const f of FILES) cpSync(join(root, f), join(dir, f), { recursive: true });
  writeFileSync(join(dir, "manifest.json"), JSON.stringify(m, null, 2) + "\n");
  const zip = join(dist, `${NAME}-${target}-${m.version}.zip`);
  rmSync(zip, { force: true });
  execFileSync("zip", ["-qr", zip, "."], { cwd: dir });
  console.log("built", zip);
}

pack("chrome", manifest);

// Firefox: event-page background instead of a service worker, plus the gecko id
// and the data-collection declaration that addons.mozilla.org requires.
const ff = structuredClone(manifest);
ff.background = { scripts: ["background.js"] };
ff.browser_specific_settings = {
  gecko: {
    id: "i-will-wait-for-gta6-pc@gdzali",
    strict_min_version: "128.0",
    data_collection_permissions: { required: ["none"] }
  }
};
pack("firefox", ff);

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";

const build = spawnSync(
  process.execPath,
  [resolve("scripts/build-with-local-supabase.mjs")],
  {
    env: {
      ...process.env,
      AUTHORING_PREVIEW_DIRECTORY: resolve("test/fixtures/authoring"),
    },
    stdio: "inherit",
  },
);

if (build.error) {
  throw build.error;
}

process.exitCode = build.status ?? 1;

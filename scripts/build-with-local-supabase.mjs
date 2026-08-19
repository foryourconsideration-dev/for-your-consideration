import { execFileSync, spawnSync } from "node:child_process";
import process from "node:process";

const status = JSON.parse(
  execFileSync("npx", ["supabase", "status", "-o", "json"], {
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  }),
);

if (!status.API_URL || !status.PUBLISHABLE_KEY) {
  throw new Error("Local Supabase did not report its application credentials.");
}

const build = spawnSync("npm", ["run", "build"], {
  env: {
    ...process.env,
    SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY,
    SUPABASE_URL: status.API_URL,
  },
  stdio: "inherit",
});

if (build.error) {
  throw build.error;
}

process.exitCode = build.status ?? 1;

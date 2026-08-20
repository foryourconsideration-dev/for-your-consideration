import { spawn } from "node:child_process";
import console from "node:console";
import { resolve } from "node:path";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";

import {
  ArticleFileError,
  readAuthoringDirectory,
} from "../src/lib/authoring/article-files.ts";

const authoringDirectory = resolve(process.cwd(), "authoring/articles");

try {
  const articles = await readAuthoringDirectory(authoringDirectory);

  if (articles.length === 0) {
    throw new ArticleFileError("No Markdown article files were found.");
  }

  console.log(
    `Validated ${articles.length} article file${articles.length === 1 ? "" : "s"}.`,
  );
  console.log("Local preview routes:");

  for (const article of articles) {
    console.log(`- /preview/articles/${article.slug}/`);
  }

  const astroCli = fileURLToPath(
    new URL("../node_modules/astro/astro.js", import.meta.url),
  );
  const server = spawn(
    process.execPath,
    [astroCli, "dev", ...process.argv.slice(2)],
    {
      env: {
        ...process.env,
        AUTHORING_PREVIEW_DIRECTORY: authoringDirectory,
      },
      stdio: "inherit",
    },
  );

  server.on("error", () => {
    console.error("The local preview server could not be started.");
    process.exitCode = 1;
  });

  server.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exitCode = code ?? 1;
  });
} catch (error) {
  console.error(
    error instanceof ArticleFileError
      ? error.message
      : "The local article preview could not be started.",
  );
  process.exitCode = 1;
}

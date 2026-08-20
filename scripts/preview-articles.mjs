import { spawn } from "node:child_process";
import console from "node:console";
import { resolve } from "node:path";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";

const authoringDirectory = resolve(process.cwd(), "authoring/articles");
const commandArguments = process.argv.slice(2);
const articleArgument = commandArguments[0]?.startsWith("-")
  ? undefined
  : commandArguments.shift();
const articleFile = articleArgument
  ? resolve(process.cwd(), articleArgument)
  : undefined;

try {
  const [nodeMajorVersion, nodeMinorVersion] = process.versions.node
    .split(".")
    .map(Number);

  if (nodeMajorVersion !== 24 || nodeMinorVersion < 16) {
    throw new Error(
      "Article preview requires Node.js 24.16 through 24.x. Switch Node versions and try again.",
    );
  }

  const { ArticleFileError, readAuthoringArticle, readAuthoringDirectory } =
    await import("../src/lib/authoring/article-files.ts");
  const articles = articleFile
    ? [await readAuthoringArticle(articleFile)]
    : await readAuthoringDirectory(authoringDirectory);

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
    new URL("./bin/astro.mjs", import.meta.resolve("astro/package.json")),
  );
  const previewEnvironment = {
    ...process.env,
    ...(articleFile
      ? {
          AUTHORING_PREVIEW_DIRECTORY: "",
          AUTHORING_PREVIEW_FILE: articleFile,
        }
      : {
          AUTHORING_PREVIEW_DIRECTORY: authoringDirectory,
          AUTHORING_PREVIEW_FILE: "",
        }),
  };
  const server = spawn(
    process.execPath,
    [astroCli, "dev", ...commandArguments],
    {
      env: previewEnvironment,
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
    error instanceof Error
      ? error.message
      : "The local article preview could not be started.",
  );
  process.exitCode = 1;
}

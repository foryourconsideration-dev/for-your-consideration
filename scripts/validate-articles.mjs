import console from "node:console";
import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

import {
  ArticleFileError,
  readAuthoringArticle,
  readAuthoringDirectory,
} from "../src/lib/authoring/article-files.ts";

const input = resolve(process.cwd(), process.argv[2] ?? "authoring/articles");

try {
  let inputStats;

  try {
    inputStats = await stat(input);
  } catch {
    throw new ArticleFileError(
      "The authoring input is missing or could not be read.",
    );
  }

  const articles = inputStats.isDirectory()
    ? await readAuthoringDirectory(input)
    : [await readAuthoringArticle(input)];

  if (articles.length === 0) {
    throw new ArticleFileError("No Markdown article files were found.");
  }

  console.log(
    `Validated ${articles.length} article file${articles.length === 1 ? "" : "s"}.`,
  );
} catch (error) {
  console.error(
    error instanceof ArticleFileError
      ? error.message
      : "The authoring input could not be validated.",
  );
  process.exitCode = 1;
}

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import process from "node:process";
import { describe, it } from "node:test";

const previewScript = resolve("scripts/preview-articles.mjs");
const fixtureDirectory = resolve("test/fixtures/authoring");
const fixtureArticle = resolve(fixtureDirectory, "fixture-article.md");

function runPreview(arguments_: string[], cwd = process.cwd()) {
  return spawnSync(process.execPath, [previewScript, ...arguments_, "--help"], {
    cwd,
    encoding: "utf8",
  });
}

describe("article preview command", () => {
  it("launches Astro after validating the private authoring directory", () => {
    const temporaryRoot = mkdtempSync(join(tmpdir(), "article-preview-test-"));
    const temporaryAuthoringDirectory = join(
      temporaryRoot,
      "authoring",
      "articles",
    );
    mkdirSync(temporaryAuthoringDirectory, { recursive: true });
    copyFileSync(
      fixtureArticle,
      join(temporaryAuthoringDirectory, "fixture-article.md"),
    );

    const result = runPreview([], temporaryRoot);
    rmSync(temporaryRoot, { force: true, recursive: true });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Validated 1 article file\./);
    assert.match(result.stdout, /\/preview\/articles\/fixture-article\//);
    assert.match(result.stdout, /astro dev/);
  });

  it("accepts one Markdown article file", () => {
    const result = runPreview([fixtureArticle]);

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Validated 1 article file\./);
    assert.match(result.stdout, /\/preview\/articles\/fixture-article\//);
    assert.match(result.stdout, /astro dev/);
  });
});

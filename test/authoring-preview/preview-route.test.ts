import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const preview = readFileSync(
  "dist/preview/articles/fixture-article/index.html",
  "utf8",
);

describe("built local authoring preview", () => {
  it("uses the article layout and secure Markdown renderer", () => {
    assert.match(preview, /<h1[^>]*>Fixture article<\/h1>/);
    assert.match(
      preview,
      /class="article-subtitle"[^>]*>A public test fixture<\/p>/,
    );
    assert.match(preview, /<em>emphasis<\/em>/);
    assert.match(preview, /<h2[^>]*>Fixture heading<\/h2>/);
    assert.match(preview, />Notes<\/h2>/);
  });

  it("displays the publication timestamp entered by the author", () => {
    assert.match(preview, /class="article-metadata"/);
    assert.match(
      preview,
      /<time[^>]*datetime="2026-08-20T09:00:00-07:00"[^>]*>August 20, 2026<\/time>/,
    );
  });

  it("does not declare a private authoring preview as canonical", () => {
    assert.doesNotMatch(preview, /rel="canonical"/);
    assert.doesNotMatch(preview, /property="og:url"/);
  });

  it("does not include a private authoring preview in the sitemap", () => {
    const sitemap = readFileSync("dist/sitemap-0.xml", "utf8");

    assert.doesNotMatch(sitemap, /\/preview\//);
    assert.doesNotMatch(sitemap, /fixture-article/);
  });
});

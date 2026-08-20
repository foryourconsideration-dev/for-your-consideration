import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const readOutput = (path: string) => readFileSync(path, "utf8");

describe("built site discovery files", () => {
  it("lists the homepage and published articles in the sitemap", () => {
    const sitemapIndex = readOutput("dist/sitemap-index.xml");
    const sitemap = readOutput("dist/sitemap-0.xml");

    assert.match(
      sitemapIndex,
      /<loc>https:\/\/foryourconsideration\.blog\/sitemap-0\.xml<\/loc>/,
    );
    assert.match(sitemap, /<loc>https:\/\/foryourconsideration\.blog\/<\/loc>/);
    assert.match(
      sitemap,
      /<loc>https:\/\/foryourconsideration\.blog\/articles\/published-article-one\/<\/loc>/,
    );
    assert.match(
      sitemap,
      /<loc>https:\/\/foryourconsideration\.blog\/articles\/published-article-two\/<\/loc>/,
    );
    assert.match(
      sitemap,
      /<loc>https:\/\/foryourconsideration\.blog\/articles\/published-article-three\/<\/loc>/,
    );
  });

  it("keeps non-public and non-page routes out of the sitemap", () => {
    const sitemap = readOutput("dist/sitemap-0.xml");

    assert.doesNotMatch(sitemap, /\/404\//);
    assert.doesNotMatch(sitemap, /\/preview\//);
    assert.doesNotMatch(sitemap, /\/robots\.txt/);
    assert.doesNotMatch(sitemap, /draft-article/);
    assert.doesNotMatch(sitemap, /archived-article/);
  });

  it("allows public crawling and points robots.txt to the sitemap", () => {
    const robots = readOutput("dist/robots.txt");

    assert.equal(
      robots,
      [
        "User-agent: *",
        "Allow: /",
        "",
        "Sitemap: https://foryourconsideration.blog/sitemap-index.xml",
        "",
      ].join("\n"),
    );
  });

  it("advertises the sitemap from public HTML", () => {
    const homepage = readOutput("dist/index.html");

    assert.match(homepage, /<link rel="sitemap" href="\/sitemap-index\.xml">/);
  });
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const homepage = readFileSync("dist/index.html", "utf8");

describe("built article index", () => {
  it("lists published articles newest first", () => {
    const newerArticle = homepage.indexOf("Published article one");
    const olderArticle = homepage.indexOf("Published article two");
    const oldestArticle = homepage.indexOf(
      "Published article three with a longer title",
    );

    assert.notEqual(newerArticle, -1);
    assert.notEqual(olderArticle, -1);
    assert.notEqual(oldestArticle, -1);
    assert.ok(newerArticle < olderArticle);
    assert.ok(olderArticle < oldestArticle);
  });

  it("links to published article routes and omits unavailable articles", () => {
    assert.match(homepage, /href="\/articles\/published-article-one\/"/);
    assert.match(homepage, /href="\/articles\/published-article-two\/"/);
    assert.match(homepage, /href="\/articles\/published-article-three\/"/);
    assert.doesNotMatch(homepage, /Draft article/);
    assert.doesNotMatch(homepage, /Archived article/);
  });

  it("renders article metadata and optional subtitles", () => {
    assert.match(homepage, /Article subtitle/);
    assert.equal(homepage.match(/class="article-list-subtitle"/g)?.length, 1);
    assert.match(
      homepage,
      /<time[^>]+datetime="2025-02-01T12:00:00\+00:00"[^>]*>\s*February 1, 2025\s*<\/time>/,
    );
    assert.match(
      homepage,
      /<time[^>]+datetime="2025-01-01T12:00:00\+00:00"[^>]*>\s*January 1, 2025\s*<\/time>/,
    );
    assert.match(
      homepage,
      /<time[^>]+datetime="2024-12-01T12:00:00\+00:00"[^>]*>\s*December 1, 2024\s*<\/time>/,
    );
  });
});

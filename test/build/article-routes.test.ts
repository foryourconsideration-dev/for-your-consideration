import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";

const articleOutput = (slug: string) => `dist/articles/${slug}/index.html`;

describe("built article routes", () => {
  it("renders published article metadata and Markdown as HTML", () => {
    const html = readFileSync(articleOutput("published-article-one"), "utf8");

    assert.match(
      html,
      /<title>Published article one \| For Your Consideration<\/title>/,
    );
    assert.match(html, /<h1[^>]*>Published article one<\/h1>/);
    assert.match(
      html,
      /<time[^>]+datetime="2025-02-01T12:00:00\+00:00"[^>]*>\s*February 1, 2025\s*<\/time>/,
    );
    assert.match(html, /Article subtitle/);
    assert.match(
      html,
      /<h2 id="user-content-section-heading">Section heading<\/h2>/,
    );
  });

  it("generates routes only for available articles", () => {
    assert.equal(existsSync(articleOutput("published-article-one")), true);
    assert.equal(existsSync(articleOutput("published-article-two")), true);
    assert.equal(existsSync(articleOutput("published-article-three")), true);
    assert.equal(existsSync(articleOutput("draft-article")), false);
    assert.equal(existsSync(articleOutput("archived-article")), false);
    assert.equal(existsSync(articleOutput("missing-article")), false);
  });

  it("omits optional subtitle markup when an article has no subtitle", () => {
    const html = readFileSync(articleOutput("published-article-two"), "utf8");

    assert.doesNotMatch(html, /class="article-subtitle"/);
  });

  it("builds a not-found page with a homepage link", () => {
    const html = readFileSync("dist/404.html", "utf8");

    assert.match(
      html,
      /<title>Page not found \| For Your Consideration<\/title>/,
    );
    assert.match(html, /<h1[^>]*>Page not found<\/h1>/);
    assert.match(html, /<a href="\/"[^>]*>Return to the homepage<\/a>/);
  });
});

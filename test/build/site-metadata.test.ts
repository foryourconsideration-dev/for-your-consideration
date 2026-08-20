import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const publicationDescription =
  "For Your Consideration is a blog featuring opinions, commentary, and reflections on a wide range of topics.";

const readPage = (path: string) => readFileSync(path, "utf8");

describe("built site metadata", () => {
  it("publishes canonical homepage and social metadata", () => {
    const html = readPage("dist/index.html");

    assert.match(
      html,
      new RegExp(
        `<meta name="description" content="${publicationDescription}">`,
      ),
    );
    assert.match(
      html,
      /<link rel="canonical" href="https:\/\/foryourconsideration\.blog\/">/,
    );
    assert.match(html, /<meta property="og:type" content="website">/);
    assert.match(
      html,
      /<meta property="og:site_name" content="For Your Consideration">/,
    );
    assert.match(
      html,
      /<meta property="og:title" content="For Your Consideration">/,
    );
    assert.match(
      html,
      new RegExp(
        `<meta property="og:description" content="${publicationDescription}">`,
      ),
    );
    assert.match(
      html,
      /<meta property="og:url" content="https:\/\/foryourconsideration\.blog\/">/,
    );
    assert.match(html, /<meta name="twitter:card" content="summary">/);
    assert.match(
      html,
      new RegExp(
        `<meta name="twitter:description" content="${publicationDescription}">`,
      ),
    );
  });

  it("uses article metadata and canonical URLs for published articles", () => {
    const html = readPage("dist/articles/published-article-one/index.html");

    assert.match(html, /<meta name="description" content="Article subtitle">/);
    assert.match(
      html,
      /<link rel="canonical" href="https:\/\/foryourconsideration\.blog\/articles\/published-article-one\/">/,
    );
    assert.match(html, /<meta property="og:type" content="article">/);
    assert.match(
      html,
      /<meta property="og:title" content="Published article one">/,
    );
    assert.match(
      html,
      /<meta property="og:description" content="Article subtitle">/,
    );
    assert.match(
      html,
      /<meta property="og:url" content="https:\/\/foryourconsideration\.blog\/articles\/published-article-one\/">/,
    );
    assert.match(
      html,
      /<meta name="twitter:title" content="Published article one">/,
    );
    assert.match(
      html,
      /<meta property="article:published_time" content="2025-02-01T12:00:00\+00:00">/,
    );
  });

  it("uses the publication description when an article has no subtitle", () => {
    const html = readPage("dist/articles/published-article-two/index.html");

    assert.match(
      html,
      new RegExp(
        `<meta name="description" content="${publicationDescription}">`,
      ),
    );
  });

  it("describes the not-found page without declaring it canonical", () => {
    const html = readPage("dist/404.html");

    assert.match(
      html,
      /<meta name="description" content="The page you’re looking for doesn’t exist or is no longer available\.">/,
    );
    assert.doesNotMatch(html, /rel="canonical"/);
    assert.doesNotMatch(html, /property="og:url"/);
  });
});

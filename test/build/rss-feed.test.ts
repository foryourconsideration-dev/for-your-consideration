import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const feed = readFileSync("dist/rss.xml", "utf8");
const items = [...feed.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(
  ([, item]) => item,
);

describe("built RSS feed", () => {
  it("publishes the publication identity and supports auto-discovery", () => {
    const homepage = readFileSync("dist/index.html", "utf8");

    assert.match(feed, /<title>For Your Consideration<\/title>/);
    assert.match(
      feed,
      /<description>For Your Consideration is a blog featuring opinions, commentary, and reflections on a wide range of topics\.<\/description>/,
    );
    assert.match(feed, /<language>en-us<\/language>/);
    assert.match(
      homepage,
      /<link rel="alternate" type="application\/rss\+xml" title="For Your Consideration" href="\/rss\.xml">/,
    );
  });

  it("lists published articles newest first with canonical links and dates", () => {
    assert.equal(items.length, 3);
    assert.match(items[0], /<title>Published article one<\/title>/);
    assert.match(
      items[0],
      /<link>https:\/\/foryourconsideration\.blog\/articles\/published-article-one\/<\/link>/,
    );
    assert.match(items[0], /<pubDate>Sat, 01 Feb 2025 12:00:00 GMT<\/pubDate>/);
    assert.match(items[1], /<title>Published article two<\/title>/);
    assert.match(
      items[2],
      /<title>Published article three with a longer title<\/title>/,
    );
  });

  it("uses optional subtitles without publishing article bodies", () => {
    assert.match(items[0], /<description>Article subtitle<\/description>/);
    assert.doesNotMatch(items[1], /<description>/);
    assert.doesNotMatch(feed, /Section heading/);
  });

  it("excludes unavailable and private articles", () => {
    assert.doesNotMatch(feed, /draft-article/);
    assert.doesNotMatch(feed, /archived-article/);
    assert.doesNotMatch(feed, /fixture-article/);
  });
});

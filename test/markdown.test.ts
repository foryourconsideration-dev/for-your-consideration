import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { renderArticleBodyMarkdown } from "../src/lib/markdown/render-article-body-markdown.ts";

describe("article Markdown rendering", () => {
  it("renders the supported editorial structure as semantic HTML", async () => {
    const html = await renderArticleBodyMarkdown(`
## Section heading

Paragraph with *emphasis*, **importance**, and a [link](https://example.com).

- First item
- Second item

> Quotation.

Statement with a note.[^1]

[^1]: Note text.
`);

    assert.match(html, /<h2 id="user-content-section-heading">/);
    assert.match(html, /<em>emphasis<\/em>/);
    assert.match(html, /<strong>importance<\/strong>/);
    assert.match(html, /<a href="https:\/\/example\.com">link<\/a>/);
    assert.match(html, /<ul>[\s\S]*<li>First item<\/li>/);
    assert.match(html, /<blockquote>[\s\S]*<p>Quotation\.<\/p>/);
    assert.match(html, /<section data-footnotes="" class="footnotes">/);
    assert.match(html, /<h2 id="footnote-label">Notes<\/h2>/);
    assert.match(html, /href="#user-content-fn-1"/);
    assert.match(html, /id="user-content-fn-1"/);
    assert.match(html, /href="#user-content-fnref-1"/);
    assert.match(html, /aria-label="Back to reference 1"/);
    assert.match(html, />↩︎<\/a>/);
  });

  it("drops raw HTML and removes unsafe link destinations", async () => {
    const html = await renderArticleBodyMarkdown(`
Before.

<script>alert("script")</script>

<img src="x" onerror="alert('image')">

[Unsafe](javascript:alert("link")) [safe](https://example.com).

After.
`);

    assert.doesNotMatch(html, /script|onerror|javascript:|<img/i);
    assert.match(html, /<a>Unsafe<\/a>/);
    assert.match(html, /<a href="https:\/\/example\.com">safe<\/a>/);
    assert.match(html, /<p>Before\.<\/p>/);
    assert.match(html, /<p>After\.<\/p>/);
  });

  it("does not render unsupported article elements", async () => {
    const html = await renderArticleBodyMarkdown(`
# Body-level title

![Image description](https://example.com/image.jpg)

| Column |
| --- |
| Cell |
`);

    assert.doesNotMatch(html, /<h1|<img|<table|<thead|<tbody|<tr|<th|<td/);
  });

  it("treats malformed Markdown as text instead of failing", async () => {
    const html = await renderArticleBodyMarkdown(
      "Paragraph with **unclosed emphasis.\n\n[^missing]",
    );

    assert.equal(
      html,
      "<p>Paragraph with **unclosed emphasis.</p>\n<p>[^missing]</p>",
    );
  });
});

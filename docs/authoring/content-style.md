# Content style

Article titles, subtitles, publication dates, and future attribution metadata
belong to the article record. The article body contains Markdown only and starts
with prose or a section heading rather than repeating the article title.

## Local file format

Private local article files use YAML frontmatter followed by the Markdown body:

```md
---
slug: example-article
title: Example article
subtitle: An optional subtitle
publishedAt: "2026-08-20T09:00:00-07:00"
lead_image: harbor-at-dawn
images:
  - ref: harbor-at-dawn
    source: ./example-article/lead.jpg
    alt: A concise description of the image.
    caption: An optional caption.
    credit: An optional image credit.
---

The article body starts here.
```

`slug`, `title`, and `publishedAt` are required. `subtitle`, `lead_image`, and
`images` are optional and should be omitted rather than left blank. Do not add publication
status, author, or byline fields. The complete validation rules and commands are
documented in the [local authoring guide](guide.md).

Frontmatter is not part of `body_markdown`; validation separates it before the
body enters the production renderer.

## Supported Markdown

Article bodies may use:

- paragraphs and line breaks;
- second- and third-level headings;
- emphasis and strong emphasis;
- ordered and unordered lists;
- block quotations;
- thematic breaks;
- links; and
- numbered footnotes.

Footnotes use the following syntax and render under a visible `Notes` heading:

```md
A statement with a note.[^1]

[^1]: The note text.
```

Raw HTML is not supported. The renderer discards raw HTML, removes unsafe link
destinations, and allows only the semantic elements required by the supported
Markdown subset. Inline Markdown images, tables, task lists, embedded media, and
executable content are not supported. Use the optional frontmatter lead image
for article imagery by selecting a reference defined in `images`.

Links open in the current tab. Write descriptive link text that remains useful
outside its surrounding sentence; avoid labels such as “click here.”

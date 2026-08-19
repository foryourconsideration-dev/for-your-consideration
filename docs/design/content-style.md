# Content style

Article titles, subtitles, publication dates, and future attribution metadata
belong to the article record. The article body contains Markdown only and starts
with prose or a section heading rather than repeating the article title.

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
Markdown subset. Images, tables, task lists, embedded media, and executable
content are not supported yet.

Links open in the current tab. Write descriptive link text that remains useful
outside its surrounding sentence; avoid labels such as “click here.”

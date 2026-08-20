# Style guide

## Principles

The interface should feel quiet, editorial, and deliberate. Typography and
spacing create hierarchy; decoration should not compete with the writing.

## Color

| Role           | Value     |
| -------------- | --------- |
| Canvas         | `#FEFEFD` |
| Primary text   | `#1C1B1A` |
| Secondary text | `#55524E` |
| Rules          | `#C9C5BC` |
| Interactive    | `#842F4B` |

Primary text has a WCAG contrast ratio of `17.04:1` against the canvas. The
secondary text ratio is `7.70:1`, and the interactive color ratio is `8.36:1`.
The warmth of the palette is an aesthetic choice; readability depends on its
dark-on-light polarity and strong luminance contrast, not on a claim that these
exact colors prevent eye strain.

## Typography

Libre Franklin is the interface family. Use it for the publication masthead,
navigation, buttons, form labels, categories, and other controls.

Newsreader is the editorial family. Use it consistently for article titles,
descriptions, dates, body copy, headings, quotations, captions, and footnotes.
Create hierarchy through size, weight, style, and spacing rather than introducing
another family.

The fonts are self-hosted from Fontsource packages and use the SIL Open Font
License 1.1. Fallback stacks remain defined in case a font cannot load.

`ArticleLayout.astro` owns the semantic article frame and editorial styles. Test
fixtures and future article routes should use that component rather than copying
article-specific CSS. The supported article markup and authoring rules are
documented in the [content style guide](content-style.md).

## Reading layout

- Keep prose at or below `65ch`.
- Use fluid type that remains at least `18px` on supported screens.
- Use approximately `1.65` line height for body text.
- Left-align prose; do not justify it.
- Let the masthead scale fluidly so the publication name remains on one line.
- Apply the masthead's restrained vertical scaling only to the publication name.

## Article index

List published articles in reverse chronological order. Each entry includes a
linked title, its optional subtitle, and its publication date; omit absent
subtitles without leaving empty space. Keep the whole entry legible at narrow
widths, but make only the title the link so its interactive target is explicit.

Do not display body excerpts or paginate the index until the amount of published
content creates a demonstrated need.

## Links and focus

Inline text links are underlined without relying on color alone. Linked article
titles may omit the underline because their heading and index context identify
them as navigation; they shift to the interactive color on hover and retain a
visible `:focus-visible` outline for keyboard navigation. Every other interactive
element must also have a visible focus indicator with adequate separation. The
masthead uses a heavy underline instead of a surrounding outline so its focus
state remains visible without appearing boxed in.

## Footnotes

Footnote references and return links use semantic anchors. Notes appear after the
article under a rule, remain in Newsreader, and may use a smaller size only while
maintaining sufficient contrast and line spacing.

## Motion

Do not require motion to understand or operate the site. Internal page navigation
uses a brief fade while the shared masthead remains in place. Keep transitions
subtle and disable animation, including smooth scrolling, when the reader requests
reduced motion.

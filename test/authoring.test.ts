import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";

import {
  ArticleFileError,
  parseAuthoringArticle,
  readAuthoringArticle,
  readAuthoringDirectory,
} from "../src/lib/authoring/article-files.ts";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

function articleSource(
  frontmatter = 'slug: example-article\ntitle: Example article\npublishedAt: "2026-08-20T09:00:00-07:00"',
  body = "Body paragraph.",
) {
  return `---\n${frontmatter}\n---\n\n${body}\n`;
}

describe("local article files", () => {
  it("parses required metadata, an optional subtitle, and the Markdown body", () => {
    const article = parseAuthoringArticle(
      articleSource(
        'slug: example-article\ntitle: Example article\nsubtitle: Example subtitle\npublishedAt: "2026-08-20T09:00:00-07:00"',
        "Body with *emphasis*.",
      ),
    );

    assert.deepEqual(article, {
      bodyMarkdown: "Body with *emphasis*.",
      images: [],
      leadImageReference: null,
      publishedAt: "2026-08-20T09:00:00-07:00",
      slug: "example-article",
      subtitle: "Example subtitle",
      title: "Example article",
    });
  });

  it("normalizes an omitted subtitle to null", () => {
    assert.equal(parseAuthoringArticle(articleSource()).subtitle, null);
  });

  it("validates and measures an optional local lead image", async () => {
    const article = await readAuthoringArticle(
      "test/fixtures/authoring/fixture-article.md",
    );

    assert.equal(article.leadImageReference, "lead");
    assert.deepEqual(article.images, [
      {
        alt: "Abstract oxblood quadrilateral on a warm gray background.",
        caption: "A fictional image used to verify local article previews.",
        contentType: "image/png",
        credit: "Test fixture",
        filePath: join(
          process.cwd(),
          "test/fixtures/authoring/fixture-article/lead.png",
        ),
        height: 675,
        path: "fixture-article/addc70685e351486c02902a3b9b5914a5154209bd22ac9daf64f6da42c069402.png",
        reference: "lead",
        width: 1200,
      },
    ]);
  });

  it("keeps lead-image reads inside the article directory", async () => {
    const directory = await mkdtemp(join(tmpdir(), "fyc-authoring-"));
    temporaryDirectories.push(directory);
    const articlePath = join(directory, "article.md");

    await writeFile(
      articlePath,
      articleSource(
        [
          "slug: example-article",
          "title: Example article",
          'publishedAt: "2026-08-20T09:00:00-07:00"',
          "lead_image: lead",
          "images:",
          "  - ref: lead",
          "    source: ../outside.png",
          "    alt: Example alternative text.",
        ].join("\n"),
      ),
    );

    await assert.rejects(
      readAuthoringArticle(articlePath),
      /images\.lead\.source: must remain inside the article directory/,
    );
  });

  it("rejects missing, malformed, or unsupported frontmatter", () => {
    assert.throws(
      () => parseAuthoringArticle("Body paragraph."),
      /expected YAML frontmatter/,
    );
    assert.throws(
      () => parseAuthoringArticle("---\ntitle: [\n---\nBody paragraph."),
      /invalid YAML/,
    );
    assert.throws(
      () =>
        parseAuthoringArticle(
          articleSource(
            'slug: example-article\ntitle: Example\npublishedAt: "2026-08-20T09:00:00-07:00"\nauthor: Someone',
          ),
        ),
      /Unrecognized key/,
    );
  });

  it("enforces database-compatible metadata and a nonempty body", () => {
    assert.throws(
      () =>
        parseAuthoringArticle(
          articleSource(
            'slug: Invalid Slug\ntitle: Example\npublishedAt: "2026-08-20T09:00:00-07:00"',
          ),
        ),
      /lowercase letters and numbers/,
    );
    assert.throws(
      () =>
        parseAuthoringArticle(
          articleSource(
            'slug: example\ntitle: " Example"\npublishedAt: "2026-08-20T09:00:00-07:00"',
          ),
        ),
      /whitespace/,
    );
    assert.throws(
      () => parseAuthoringArticle(articleSource(undefined, "   ")),
      /body: must not be empty/,
    );
    assert.throws(
      () =>
        parseAuthoringArticle(articleSource("slug: example\ntitle: Example")),
      /publishedAt/,
    );
    assert.throws(
      () =>
        parseAuthoringArticle(
          articleSource(
            'slug: example\ntitle: Example\npublishedAt: "2026-08-20T09:00:00"',
          ),
        ),
      /publishedAt/,
    );
    assert.throws(
      () =>
        parseAuthoringArticle(
          articleSource(
            'slug: example\ntitle: Example\npublishedAt: "2026-08-20T09:00:00-07:00"\nlead_image: missing',
          ),
        ),
      /must match an image ref/,
    );
    assert.throws(
      () =>
        parseAuthoringArticle(
          articleSource(
            'slug: example\ntitle: Example\npublishedAt: "2026-08-20T09:00:00-07:00"\nimages:\n  - ref: duplicate\n    source: ./one.png\n    alt: One.\n  - ref: duplicate\n    source: ./two.png\n    alt: Two.',
          ),
        ),
      /each image ref must be unique/,
    );
  });

  it("loads Markdown files in name order and rejects duplicate slugs", async () => {
    const directory = await mkdtemp(join(tmpdir(), "fyc-authoring-"));
    temporaryDirectories.push(directory);

    await writeFile(
      join(directory, "b.md"),
      articleSource(
        'slug: second-article\ntitle: Second article\npublishedAt: "2026-08-20T09:00:00-07:00"',
      ),
    );
    await writeFile(
      join(directory, "a.md"),
      articleSource(
        'slug: first-article\ntitle: First article\npublishedAt: "2026-08-20T09:00:00-07:00"',
      ),
    );
    await writeFile(join(directory, "ignored.txt"), "Not an article.");

    const articles = await readAuthoringDirectory(directory);
    assert.deepEqual(
      articles.map(({ slug }) => slug),
      ["first-article", "second-article"],
    );

    await writeFile(
      join(directory, "duplicate.md"),
      articleSource(
        'slug: first-article\ntitle: Duplicate article\npublishedAt: "2026-08-20T09:00:00-07:00"',
      ),
    );

    await assert.rejects(
      readAuthoringDirectory(directory),
      (error: unknown) =>
        error instanceof ArticleFileError &&
        /Duplicate article slug/.test(error.message),
    );
  });
});

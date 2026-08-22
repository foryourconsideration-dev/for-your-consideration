import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  parseArticlePublicationArguments,
  parsePublishingArguments,
} from "../src/lib/publishing/arguments.ts";
import {
  type ArticlePublishingRepository,
  type ArticlePublishingRecord,
  ArticlePublishingError,
  planPublication,
  planUnpublication,
} from "../src/lib/publishing/articles.ts";
import {
  DeploymentHookError,
  triggerDeployment,
} from "../src/lib/publishing/deployment.ts";
import {
  PublishingConfigurationError,
  readLocalPreviewBuildEnvironment,
  readPublishingEnvironment,
} from "../src/lib/publishing/environment.ts";
import { runGuidedPublication } from "../src/lib/publishing/guided-workflow.ts";
import {
  applyPublicationInstructions,
  previewReviewInstructions,
} from "../src/lib/publishing/messages.ts";
import type { Database } from "../src/types/database.ts";

type ArticleRow = Database["public"]["Tables"]["articles"]["Row"];

const article = {
  bodyMarkdown: "Article body.",
  images: [],
  leadImageReference: null,
  publishedAt: "2026-08-19T12:00:00Z",
  slug: "example-article",
  subtitle: null,
  title: "Example article",
};

function row(overrides: Partial<ArticleRow> = {}): ArticleRow {
  return {
    body_markdown: article.bodyMarkdown,
    created_at: "2026-08-19T12:00:00Z",
    id: "10000000-0000-4000-8000-000000000099",
    lead_image_id: null,
    published_at: article.publishedAt,
    slug: article.slug,
    status: "published",
    subtitle: article.subtitle,
    title: article.title,
    updated_at: "2026-08-19T12:00:00Z",
    ...overrides,
  };
}

function record(overrides: Partial<ArticleRow> = {}) {
  return { ...row(overrides), images: [] };
}

describe("publishing arguments", () => {
  it("uses the guided workflow when given only an article file", () => {
    assert.deepEqual(parseArticlePublicationArguments(["article.md"]), {
      mode: "guided",
      target: "article.md",
    });
  });

  it("defaults to a dry run and requires an explicit environment", () => {
    assert.deepEqual(
      parsePublishingArguments(
        ["article.md", "--environment", "preview"],
        "article file",
      ),
      {
        apply: false,
        environment: "preview",
        target: "article.md",
      },
    );

    assert.throws(
      () => parsePublishingArguments(["article.md"], "article file"),
      PublishingConfigurationError,
    );
  });

  it("recognizes the explicit apply flag", () => {
    assert.equal(
      parsePublishingArguments(
        ["article.md", "--apply", "--environment", "production"],
        "article file",
      ).apply,
      true,
    );
  });

  it("retains targeted publishing for recovery and testing", () => {
    assert.deepEqual(
      parseArticlePublicationArguments([
        "article.md",
        "--environment",
        "preview",
        "--apply",
      ]),
      {
        apply: true,
        environment: "preview",
        mode: "targeted",
        target: "article.md",
      },
    );
  });
});

describe("guided publication", () => {
  function repository(
    current: ArticlePublishingRecord | null,
    writes: string[],
  ): ArticlePublishingRepository {
    return {
      async archive() {},
      async findBySlug() {
        return current;
      },
      async upsertPublished(value) {
        writes.push(value.slug);
      },
    };
  }

  function dependencies(options: {
    continueDecisions?: boolean[];
    previewCurrent?: ArticlePublishingRecord | null;
    productionCurrent?: ArticlePublishingRecord | null;
    publishDecision?: boolean;
    reviewDecision?: boolean;
  }) {
    const previewWrites: string[] = [];
    const productionWrites: string[] = [];
    const messages: string[] = [];
    let deployments = 0;
    const continueDecisions = [...(options.continueDecisions ?? [true])];

    return {
      dependencies: {
        async createRepository(environment: "preview" | "production") {
          return environment === "preview"
            ? repository(options.previewCurrent ?? null, previewWrites)
            : repository(options.productionCurrent ?? null, productionWrites);
        },
        async deployProduction() {
          deployments += 1;
        },
        prompts: {
          async continueOrStop() {
            return continueDecisions.shift() ?? false;
          },
          async publishOrStop() {
            return options.publishDecision ?? true;
          },
        },
        async reviewPreview() {
          return options.reviewDecision ?? true;
        },
        write(message: string) {
          messages.push(message);
        },
      },
      messages,
      productionWrites,
      previewWrites,
      readDeployments: () => deployments,
    };
  }

  it("can stop before uploading to Preview", async () => {
    const workflow = dependencies({ continueDecisions: [false] });

    assert.equal(
      await runGuidedPublication(article, workflow.dependencies),
      "stopped-before-preview",
    );
    assert.deepEqual(workflow.previewWrites, []);
    assert.deepEqual(workflow.productionWrites, []);
    assert.equal(workflow.readDeployments(), 0);
  });

  it("can stop after Preview review without changing Production", async () => {
    const workflow = dependencies({ reviewDecision: false });

    assert.equal(
      await runGuidedPublication(article, workflow.dependencies),
      "stopped-before-production",
    );
    assert.deepEqual(workflow.previewWrites, [article.slug]);
    assert.deepEqual(workflow.productionWrites, []);
    assert.equal(workflow.readDeployments(), 0);
  });

  it("uploads Preview and publishes Production after both confirmations", async () => {
    const workflow = dependencies({});

    assert.equal(
      await runGuidedPublication(article, workflow.dependencies),
      "published",
    );
    assert.deepEqual(workflow.previewWrites, [article.slug]);
    assert.deepEqual(workflow.productionWrites, [article.slug]);
    assert.equal(workflow.readDeployments(), 1);
  });

  it("can stop at the Production confirmation", async () => {
    const workflow = dependencies({ publishDecision: false });

    assert.equal(
      await runGuidedPublication(article, workflow.dependencies),
      "stopped-before-production",
    );
    assert.deepEqual(workflow.previewWrites, [article.slug]);
    assert.deepEqual(workflow.productionWrites, []);
    assert.equal(workflow.readDeployments(), 0);
  });

  it("does not redeploy when Production already matches", async () => {
    const workflow = dependencies({
      previewCurrent: record(),
      productionCurrent: record(),
    });

    assert.equal(
      await runGuidedPublication(article, workflow.dependencies),
      "unchanged",
    );
    assert.deepEqual(workflow.previewWrites, []);
    assert.deepEqual(workflow.productionWrites, []);
    assert.equal(workflow.readDeployments(), 0);
  });
});

describe("publication planning", () => {
  const now = new Date("2026-08-20T12:00:00Z");

  it("distinguishes creates, updates, and idempotent reruns", () => {
    assert.equal(planPublication(null, article, now), "create");
    assert.equal(planPublication(record(), article, now), "unchanged");
    assert.equal(
      planPublication(record({ title: "Previous title" }), article, now),
      "update",
    );
  });

  it("rejects publication before the entered publication time", () => {
    assert.throws(
      () => planPublication(null, article, new Date("2026-08-19T11:59:59Z")),
      ArticlePublishingError,
    );
  });

  it("archives published rows, skips archived rows, and rejects drafts", () => {
    assert.equal(planUnpublication(row(), article.slug), "archive");
    assert.equal(
      planUnpublication(row({ status: "archived" }), article.slug),
      "unchanged",
    );
    assert.throws(
      () => planUnpublication(row({ status: "draft" }), article.slug),
      ArticlePublishingError,
    );
  });
});

describe("publishing guidance", () => {
  it("explains how to review a database-backed Preview article", () => {
    const instructions = previewReviewInstructions("example-article");

    assert.match(instructions, /npm run build/);
    assert.match(instructions, /npm run preview/);
    assert.match(
      instructions,
      /http:\/\/localhost:4321\/articles\/example-article\//,
    );
  });

  it("identifies the explicit action after a dry run", () => {
    assert.match(applyPublicationInstructions(), /--apply/);
  });
});

describe("publishing environment", () => {
  it("loads isolated Preview credentials without requiring a deploy hook", async () => {
    const directory = await mkdtemp(join(tmpdir(), "fyc-publishing-"));
    await writeFile(
      join(directory, ".env.publish.preview"),
      [
        "SUPABASE_URL=https://example.supabase.co",
        "SUPABASE_SECRET_KEY=sb_secret_example",
      ].join("\n"),
    );

    const environment = await readPublishingEnvironment("preview", directory);

    assert.equal(environment.name, "preview");
    assert.equal(environment.deployHookUrl, null);
  });

  it("requires a production deployment hook", async () => {
    const directory = await mkdtemp(join(tmpdir(), "fyc-publishing-"));
    await writeFile(
      join(directory, ".env.publish.production"),
      [
        "SUPABASE_URL=https://example.supabase.co",
        "SUPABASE_SECRET_KEY=sb_secret_example",
      ].join("\n"),
    );

    await assert.rejects(
      readPublishingEnvironment("production", directory),
      PublishingConfigurationError,
    );
  });

  it("does not echo malformed credential-file contents", async () => {
    const directory = await mkdtemp(join(tmpdir(), "fyc-publishing-"));
    await writeFile(
      join(directory, ".env.publish.preview"),
      'SUPABASE_SECRET_KEY="private-value',
    );

    await assert.rejects(
      readPublishingEnvironment("preview", directory),
      (error: unknown) => {
        assert.ok(error instanceof PublishingConfigurationError);
        assert.doesNotMatch(error.message, /private-value/);
        return true;
      },
    );
  });

  it("requires the local review build to use the Preview project", async () => {
    const directory = await mkdtemp(join(tmpdir(), "fyc-publishing-"));
    await writeFile(
      join(directory, ".env.local"),
      [
        "SUPABASE_URL=https://production.supabase.co",
        "SUPABASE_PUBLISHABLE_KEY=sb_publishable_example",
      ].join("\n"),
    );

    await assert.rejects(
      readLocalPreviewBuildEnvironment(
        "https://preview.supabase.co",
        directory,
      ),
      /same Preview Supabase project/,
    );
  });

  it("loads the publishable configuration for Preview review", async () => {
    const directory = await mkdtemp(join(tmpdir(), "fyc-publishing-"));
    await writeFile(
      join(directory, ".env.local"),
      [
        "SUPABASE_URL=https://preview.supabase.co",
        "SUPABASE_PUBLISHABLE_KEY=sb_publishable_example",
      ].join("\n"),
    );

    assert.deepEqual(
      await readLocalPreviewBuildEnvironment(
        "https://preview.supabase.co",
        directory,
      ),
      {
        supabasePublishableKey: "sb_publishable_example",
        supabaseUrl: "https://preview.supabase.co/",
      },
    );
  });
});

describe("deployment hook", () => {
  it("posts without sending article content", async () => {
    const requests: Array<{
      input: string | URL | Request;
      init?: RequestInit;
    }> = [];

    await triggerDeployment(
      "https://example.com/deploy",
      async (input, init) => {
        requests.push({ input, init });
        return new Response(null, { status: 201 });
      },
    );

    assert.equal(String(requests[0]?.input), "https://example.com/deploy");
    assert.deepEqual(requests[0]?.init, { method: "POST" });
  });

  it("reports a rejected deployment without exposing the hook URL", async () => {
    await assert.rejects(
      triggerDeployment("https://example.com/private-hook", async () => {
        return new Response(null, { status: 500 });
      }),
      (error: unknown) => {
        assert.ok(error instanceof DeploymentHookError);
        assert.doesNotMatch(error.message, /private-hook/);
        return true;
      },
    );
  });
});

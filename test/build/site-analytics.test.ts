import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const readPage = (path: string) => readFileSync(path, "utf8");

describe("site analytics", () => {
  for (const path of [
    "dist/index.html",
    "dist/articles/published-article-one/index.html",
    "dist/404.html",
  ]) {
    it(`loads Vercel Web Analytics from ${path}`, () => {
      const html = readPage(path);

      assert.match(html, /\/_vercel\/insights\/script\.js/);
    });
  }
});

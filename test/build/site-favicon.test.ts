import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";

const faviconLink =
  /<link rel="icon" type="image\/x-icon" href="\/favicon\.ico">/;

describe("built site favicon", () => {
  it("includes the icon asset and shared link on every page type", () => {
    assert.equal(existsSync("dist/favicon.ico"), true);

    for (const page of [
      "dist/index.html",
      "dist/articles/published-article-one/index.html",
      "dist/404.html",
    ]) {
      assert.match(readFileSync(page, "utf8"), faviconLink);
    }
  });
});

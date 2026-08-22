import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { GET } from "../src/pages/preview/article-images/[slug].ts";

describe("local authoring image response", () => {
  it("serves the validated image without allowing it to be stored", async () => {
    const response = await GET({
      props: {
        image: {
          alt: "Fictional fixture image.",
          caption: null,
          contentType: "image/png",
          credit: null,
          filePath: "test/fixtures/authoring/fixture-article/lead.png",
          height: 675,
          path: "fixture-article/example.png",
          reference: "lead",
          width: 1200,
        },
      },
    } as never);

    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.equal(response.headers.get("Content-Type"), "image/png");
    assert.ok((await response.arrayBuffer()).byteLength > 0);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatPublicationDate } from "../src/lib/dates/format-publication-date.ts";

describe("publication date formatting", () => {
  it("formats dates consistently in long-form UTC", () => {
    assert.equal(
      formatPublicationDate("2026-01-01T00:30:00+14:00"),
      "December 31, 2025",
    );
  });

  it("rejects invalid dates", () => {
    assert.throws(
      () => formatPublicationDate("not-a-date"),
      /Publication date must be a valid date/,
    );
  });
});

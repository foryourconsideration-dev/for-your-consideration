import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createServerSupabaseClient } from "../src/lib/supabase/server.ts";

describe("server Supabase configuration", () => {
  it("requires the project URL", () => {
    assert.throws(
      () =>
        createServerSupabaseClient({
          SUPABASE_PUBLISHABLE_KEY: "publishable-key",
        }),
      /Missing SUPABASE_URL/,
    );
  });

  it("requires the publishable key", () => {
    assert.throws(
      () =>
        createServerSupabaseClient({
          SUPABASE_URL: "http://127.0.0.1:55321",
        }),
      /Missing SUPABASE_PUBLISHABLE_KEY/,
    );
  });

  it("rejects invalid and non-HTTP project URLs", () => {
    for (const url of ["not a URL", "file:///tmp/supabase"]) {
      assert.throws(
        () =>
          createServerSupabaseClient({
            SUPABASE_URL: url,
            SUPABASE_PUBLISHABLE_KEY: "publishable-key",
          }),
        /valid HTTP or HTTPS URL/,
      );
    }
  });

  it("creates a typed client from valid server configuration", () => {
    const client = createServerSupabaseClient({
      SUPABASE_URL: "http://127.0.0.1:55321",
      SUPABASE_PUBLISHABLE_KEY: "publishable-key",
    });

    assert.equal(typeof client.from, "function");
  });
});

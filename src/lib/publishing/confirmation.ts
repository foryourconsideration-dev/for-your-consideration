import { createInterface } from "node:readline/promises";

import type { PublishingEnvironmentName } from "./environment.ts";

export class PublishingConfirmationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublishingConfirmationError";
  }
}

export async function confirmProductionChange(
  environment: PublishingEnvironmentName,
  operation: "publish" | "unpublish",
  slug: string,
) {
  if (environment !== "production") {
    return;
  }

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new PublishingConfirmationError(
      "Production changes require an interactive terminal confirmation.",
    );
  }

  const expected = `${operation} ${slug}`;
  const prompt = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = await prompt.question(
      `Type "${expected}" to confirm the Production change: `,
    );

    if (answer !== expected) {
      throw new PublishingConfirmationError(
        "Production confirmation did not match. No change was made.",
      );
    }
  } finally {
    prompt.close();
  }
}

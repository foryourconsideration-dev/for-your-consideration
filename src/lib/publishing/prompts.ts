import { createInterface } from "node:readline/promises";

import { PublishingConfirmationError } from "./confirmation.ts";

export interface PublishingPrompts {
  continueOrStop(message: string): Promise<boolean>;
  publishOrStop(slug: string): Promise<boolean>;
}

function requireInteractiveTerminal() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new PublishingConfirmationError(
      "The guided publishing workflow requires an interactive terminal.",
    );
  }
}

async function askUntilRecognized(
  question: string,
  retryMessage: string,
  recognize: (answer: string) => boolean | undefined,
) {
  requireInteractiveTerminal();
  const prompt = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    while (true) {
      const decision = recognize((await prompt.question(question)).trim());

      if (decision !== undefined) {
        return decision;
      }

      console.log(retryMessage);
    }
  } finally {
    prompt.close();
  }
}

export function createPublishingPrompts(): PublishingPrompts {
  return {
    continueOrStop(message) {
      return askUntilRecognized(
        `${message} Type "continue" or "stop": `,
        'Enter "continue" to proceed or "stop" to exit safely.',
        (answer) => {
          if (answer.toLowerCase() === "continue") return true;
          if (answer.toLowerCase() === "stop") return false;
          return undefined;
        },
      );
    },

    publishOrStop(slug) {
      const expected = `publish ${slug}`;

      return askUntilRecognized(
        `Type "${expected}" to publish to Production or "stop": `,
        `Enter "${expected}" to publish or "stop" to exit safely.`,
        (answer) => {
          if (answer === expected) return true;
          if (answer.toLowerCase() === "stop") return false;
          return undefined;
        },
      );
    },
  };
}

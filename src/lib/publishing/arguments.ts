import {
  parsePublishingEnvironmentName,
  type PublishingEnvironmentName,
} from "./environment.ts";

export interface PublishingArguments {
  apply: boolean;
  environment: PublishingEnvironmentName;
  target: string;
}

export type ArticlePublicationArguments =
  | {
      mode: "guided";
      target: string;
    }
  | ({ mode: "targeted" } & PublishingArguments);

export class PublishingArgumentsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublishingArgumentsError";
  }
}

export function parsePublishingArguments(
  values: string[],
  targetDescription: string,
): PublishingArguments {
  let apply = false;
  let environmentValue: string | undefined;
  let target: string | undefined;

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];

    if (value === "--apply") {
      apply = true;
      continue;
    }

    if (value === "--environment") {
      environmentValue = values[index + 1];
      index += 1;
      continue;
    }

    if (value?.startsWith("--")) {
      throw new PublishingArgumentsError(`Unknown option: ${value}.`);
    }

    if (target) {
      throw new PublishingArgumentsError(
        `Provide exactly one ${targetDescription}.`,
      );
    }

    target = value;
  }

  if (!target) {
    throw new PublishingArgumentsError(`Provide one ${targetDescription}.`);
  }

  return {
    apply,
    environment: parsePublishingEnvironmentName(environmentValue),
    target,
  };
}

export function parseArticlePublicationArguments(
  values: string[],
): ArticlePublicationArguments {
  const usesTargetedOption = values.some(
    (value) => value === "--environment" || value === "--apply",
  );

  if (usesTargetedOption) {
    return {
      mode: "targeted",
      ...parsePublishingArguments(values, "Markdown article file"),
    };
  }

  if (values.length !== 1 || values[0]?.startsWith("--")) {
    throw new PublishingArgumentsError(
      "Provide exactly one Markdown article file.",
    );
  }

  return {
    mode: "guided",
    target: values[0],
  };
}

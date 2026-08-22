import {
  readAuthoringArticle,
  readAuthoringDirectory,
  type AuthoringArticle,
  type AuthoringImage,
} from "./article-files.ts";

interface AuthoringPreviewEnvironment {
  AUTHORING_PREVIEW_DIRECTORY?: string;
  AUTHORING_PREVIEW_FILE?: string;
}

export async function readAuthoringPreviewArticles(
  environment: AuthoringPreviewEnvironment = process.env,
): Promise<AuthoringArticle[]> {
  const authoringFile = environment.AUTHORING_PREVIEW_FILE;
  const authoringDirectory = environment.AUTHORING_PREVIEW_DIRECTORY;

  if (!authoringFile && !authoringDirectory) {
    return [];
  }

  return authoringFile
    ? [await readAuthoringArticle(authoringFile)]
    : await readAuthoringDirectory(authoringDirectory!);
}

export function resolveAuthoringLeadImage(
  article: AuthoringArticle,
): AuthoringImage | null {
  if (!article.leadImageReference) {
    return null;
  }

  return (
    article.images.find(
      ({ reference }) => reference === article.leadImageReference,
    ) ?? null
  );
}

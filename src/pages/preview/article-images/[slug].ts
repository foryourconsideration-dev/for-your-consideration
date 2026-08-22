import { readFile } from "node:fs/promises";

import type { APIRoute, GetStaticPaths } from "astro";

import type { AuthoringImage } from "../../../lib/authoring/article-files.ts";
import {
  readAuthoringPreviewArticles,
  resolveAuthoringLeadImage,
} from "../../../lib/authoring/preview-articles.ts";

export const getStaticPaths = (async () => {
  const articles = await readAuthoringPreviewArticles();

  return articles.flatMap((article) => {
    const image = resolveAuthoringLeadImage(article);

    return image
      ? [
          {
            params: { slug: article.slug },
            props: { image },
          },
        ]
      : [];
  });
}) satisfies GetStaticPaths;

export const GET: APIRoute<{ image: AuthoringImage }> = async ({ props }) => {
  const bytes = await readFile(props.image.filePath);

  return new Response(bytes, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": props.image.contentType,
    },
  });
};

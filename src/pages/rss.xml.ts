import rss from "@astrojs/rss";
import type { APIRoute } from "astro";

import { site as publication } from "../config/site.ts";
import { listPublishedArticles } from "../data/articles.ts";

export const prerender = true;

export const GET: APIRoute = async ({ site }) => {
  if (!site) {
    throw new Error("Cannot generate RSS without a configured site URL.");
  }

  const articles = await listPublishedArticles();

  return rss({
    title: publication.title,
    description: publication.description,
    site,
    items: articles.map((article) => ({
      title: article.title,
      description: article.subtitle ?? undefined,
      pubDate: new Date(article.publishedAt),
      link: `/articles/${article.slug}/`,
    })),
    customData: "<language>en-us</language>",
  });
};

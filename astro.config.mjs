import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

export default defineConfig({
  integrations: [
    sitemap({
      filter: (page) => {
        const { pathname } = new globalThis.URL(page);

        return (
          pathname !== "/404/" &&
          pathname !== "/robots.txt" &&
          pathname !== "/rss.xml" &&
          !pathname.startsWith("/preview/")
        );
      },
    }),
  ],
  site: "https://foryourconsideration.blog",
});

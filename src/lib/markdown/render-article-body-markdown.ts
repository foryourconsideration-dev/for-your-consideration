import {
  createMarkdownProcessor,
  rehypeHeadingIds,
  type Node,
} from "@astrojs/markdown-remark";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

import { site } from "../../config/site.ts";

type HastNode = Node & {
  children?: HastNode[];
  properties?: Record<string, unknown>;
  tagName?: string;
  type: string;
};

const articleSanitizationSchema = {
  ...defaultSchema,
  clobberPrefix: "",
  tagNames: [
    "a",
    "blockquote",
    "br",
    "em",
    "h2",
    "h3",
    "hr",
    "li",
    "ol",
    "p",
    "section",
    "strong",
    "sup",
    "ul",
  ],
};

function prefixHeadingIds() {
  return (tree: HastNode) => {
    visit(tree);
  };

  function visit(node: HastNode) {
    if (
      node.type === "element" &&
      (node.tagName === "h2" || node.tagName === "h3") &&
      typeof node.properties?.id === "string" &&
      node.properties.id !== "footnote-label" &&
      !node.properties.id.startsWith("user-content-")
    ) {
      node.properties.id = `user-content-${node.properties.id}`;
    }

    node.children?.forEach(visit);
  }
}

const processor = createMarkdownProcessor({
  gfm: true,
  rehypePlugins: [
    rehypeHeadingIds,
    prefixHeadingIds,
    [rehypeSanitize, articleSanitizationSchema],
  ],
  remarkRehype: {
    footnoteLabel: site.copy.article.notesHeading,
    footnoteLabelProperties: {},
  },
  smartypants: true,
  syntaxHighlight: false,
});

export async function renderArticleBodyMarkdown(markdown: string) {
  const { code } = await (await processor).render(markdown);
  return code;
}

export function previewReviewInstructions(slug: string) {
  return [
    "",
    "Next: build and view the database-backed Preview site:",
    "  npx astro dev stop",
    "  npm run build",
    "  npm run preview",
    "",
    "Then open:",
    `  http://localhost:4321/articles/${slug}/`,
  ].join("\n");
}

export function applyPublicationInstructions() {
  return "Next: rerun this command with --apply after reviewing the dry run.";
}

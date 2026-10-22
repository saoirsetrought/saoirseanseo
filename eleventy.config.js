// Builds the site into _site/. Pages are Nunjucks (.njk) and journal posts are Markdown (.md).
export default function (eleventyConfig) {
  // Files copied as-is
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("styles.css");
  eleventyConfig.addPassthroughCopy("script.js");

  // Not part of the site
  eleventyConfig.ignores.add("README.md");
  eleventyConfig.ignores.add("TikTok examples/**");
  eleventyConfig.ignores.add("Website vibe/**");

  // Journal posts, newest first
  eleventyConfig.addCollection("posts", (api) =>
    api.getFilteredByGlob("journal/*.md").sort((a, b) => b.date - a.date)
  );

  // "22 Oct 2026"
  eleventyConfig.addFilter("readableDate", (date) =>
    new Intl.DateTimeFormat("en-IE", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date)
  );
  eleventyConfig.addFilter("isoDate", (date) => date.toISOString().slice(0, 10));

  // Every topic used across all posts, for the filter chips
  eleventyConfig.addFilter("allTopics", (posts) =>
    [...new Set(posts.flatMap((p) => p.data.topics || []))].sort()
  );

  return {
    dir: { input: ".", includes: "_includes", output: "_site" },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
}

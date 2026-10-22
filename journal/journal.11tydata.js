// Settings shared by every journal post
export default {
  layout: "post.njk",
  permalink: (data) => `/journal/${data.page.fileSlug}/`,
  // Posts are plain Markdown, so text like {{ this }} in a post shows up as written
  templateEngineOverride: "md",
  eleventyComputed: {
    description: (data) => data.teaser || data.title,
    docTitle: (data) => `${data.title} ✿ Saoirse's journal`,
  },
};

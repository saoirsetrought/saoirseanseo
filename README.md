# saoirseanseo.com

My personal portfolio and journal: a digital scrapbook. [Eleventy](https://www.11ty.dev) turns the templates and Markdown posts into plain HTML, and Vercel runs that build automatically on every push.

## Where things live

- `index.njk`: the homepage text (bio, facts, experience, skills, interests, song) and the Portfolio / Journal switch
- `_includes/base.njk`: the parts every page shares (top bar, Email me box, footer)
- `_includes/journal-board.njk`: the pinned board of journal posts
- `_includes/post.njk`: the layout for a single post
- `journal/`: the journal posts, one Markdown file each
- `styles.css`: colours, fonts and layout
- `script.js`: the video list (order and titles), the hover and click behaviour, and the switch
- `assets/videos/`: the TikTok videos
- `assets/me.jpg`: portrait for the polaroid

## Writing a journal post

Add a new file to `journal/`, for example `journal/my-first-camera.md`. The file name becomes the link: `saoirseanseo.com/journal/my-first-camera/`.

```markdown
---
title: Buying my first camera
date: 2026-11-03
teaser: One line that shows on the card.
topics: [creating, tech]
---

Write the post here. Leave a blank line between paragraphs.

## A heading

- a bullet point
- **bold**, *italic*, and [a link](https://example.com)
```

Posts are sorted newest first by `date`. Any `topics` you use automatically become filter buttons on the journal board.

## Updating the live site

Commit and push to GitHub, and Vercel rebuilds within a minute:

```bash
git add -A
git commit -m "Update site"
git push
```

## Previewing locally

```bash
npm install
npm start
```

Then open http://localhost:4321. The page reloads by itself whenever you save a file.

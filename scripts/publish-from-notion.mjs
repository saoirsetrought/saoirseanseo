// Publishes Notion "blog entries" set to "Push to blog" as journal posts.
//
//   node scripts/publish-from-notion.mjs              write posts into journal/ (and images into assets/journal/)
//   node scripts/publish-from-notion.mjs --mark-done  set those entries to "Done" in Notion (run after pushing)
//
// Needs NOTION_TOKEN (an internal integration key with access to the database) and NOTION_DATABASE_ID.
// Run `npm ci` first: images are cleaned with the sharp library.

import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const POSTS_DIR = path.join(ROOT, "journal");
const IMAGES_DIR = path.join(ROOT, "assets", "journal");
const PUBLISHED_LIST = path.join(ROOT, ".notion-published.json");
const SKIPPED_LIST = path.join(ROOT, ".notion-skipped.json");

const STATUS_PROPERTY = "Status";
const READY_STATUS = "Push to blog";
const DONE_STATUS = "Done";

// ============ Notion API ============

async function notion(method, endpoint, body) {
  const res = await fetch(`https://api.notion.com/v1/${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Notion ${method} ${endpoint} failed (${res.status}): ${await res.text()}`);
  return res.json();
}

async function readyEntries(databaseId) {
  const pages = [];
  let cursor;
  do {
    const data = await notion("POST", `databases/${databaseId}/query`, {
      filter: { property: STATUS_PROPERTY, status: { equals: READY_STATUS } },
      start_cursor: cursor,
    });
    pages.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return pages;
}

// All blocks of a page, with nested children attached as block.children
async function fetchBlocks(blockId) {
  const blocks = [];
  let cursor;
  do {
    const query = cursor ? `?start_cursor=${cursor}` : "";
    const data = await notion("GET", `blocks/${blockId}/children${query}`);
    blocks.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  for (const b of blocks) {
    if (b.has_children && b.type !== "child_page" && b.type !== "child_database") {
      b.children = await fetchBlocks(b.id);
    }
  }
  return blocks;
}

// ============ Notion blocks -> Markdown ============

const escapeMd = (s) => s.replace(/([\\`*_[\]<])/g, "\\$1");

// Wrap text in a marker (e.g. **) without swallowing surrounding spaces, which Markdown won't allow
function wrap(text, marker) {
  const m = text.match(/^(\s*)(.*?)(\s*)$/s);
  return m[2] ? `${m[1]}${marker}${m[2]}${marker}${m[3]}` : text;
}

export function richText(items = []) {
  return items
    .map((t) => {
      const a = t.annotations || {};
      let s = a.code ? "`" + t.plain_text + "`" : escapeMd(t.plain_text);
      if (a.bold) s = wrap(s, "**");
      if (a.italic) s = wrap(s, "*");
      if (a.strikethrough) s = wrap(s, "~~");
      const href = t.href || t.text?.link?.url;
      if (href) s = `[${s}](${href})`;
      return s;
    })
    .join("")
    .replace(/\n/g, "  \n");
}

const plainText = (items = []) => items.map((t) => t.plain_text).join("");
const indent = (text, prefix) => text.split("\n").map((l) => (l ? prefix + l : l)).join("\n");
const LIST_TYPES = new Set(["bulleted_list_item", "numbered_list_item", "to_do"]);

// ctx.image(block) -> Promise<string url> lets the caller download Notion-hosted images
export async function blocksToMarkdown(blocks, ctx) {
  const parts = [];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const md = await blockToMarkdown(b, ctx);
    if (md === null) continue;
    // Items of the same list sit on consecutive lines; everything else gets a blank line between
    const prev = blocks[i - 1];
    const sameList = prev && LIST_TYPES.has(b.type) && prev.type === b.type;
    if (sameList && parts.length) parts[parts.length - 1] += "\n" + md;
    else parts.push(md);
  }
  return parts.join("\n\n");
}

async function childrenMd(b, ctx) {
  return b.children?.length ? await blocksToMarkdown(b.children, ctx) : "";
}

async function blockToMarkdown(b, ctx) {
  const v = b[b.type] || {};
  const text = richText(v.rich_text);
  const kids = await childrenMd(b, ctx);
  const withKids = (head, pad) => (kids ? `${head}\n${indent(kids, pad)}` : head);

  switch (b.type) {
    case "paragraph":
      return text || kids ? [text, kids].filter(Boolean).join("\n\n") : null;
    case "heading_1":
      return `## ${text}`; // the post title is the page's only h1
    case "heading_2":
      return `### ${text}`;
    case "heading_3":
    case "heading_4":
      return `#### ${text}`;
    case "bulleted_list_item":
      return withKids(`- ${text}`, "  ");
    case "numbered_list_item":
      return withKids(`1. ${text}`, "   ");
    case "to_do":
      return withKids(`- ${v.checked ? "☑" : "☐"} ${text}`, "  ");
    case "quote":
      return indent([text, kids].filter(Boolean).join("\n\n"), "> ").replace(/\n\n/g, "\n>\n");
    case "callout": {
      const icon = v.icon?.type === "emoji" ? v.icon.emoji + " " : "";
      return indent([icon + text, kids].filter(Boolean).join("\n\n"), "> ").replace(/\n\n/g, "\n>\n");
    }
    case "code":
      return "```" + (v.language && v.language !== "plain text" ? v.language : "") + "\n" + plainText(v.rich_text) + "\n```";
    case "equation":
      return "```\n" + v.expression + "\n```";
    case "divider":
      return "---";
    case "image": {
      const src = await ctx.image(b);
      const alt = plainText(v.caption).replace(/[[\]]/g, "");
      return src ? `![${alt}](${src})` : null;
    }
    case "video":
    case "embed":
    case "bookmark":
    case "link_preview":
    case "file":
    case "pdf": {
      const url = v.url || v.external?.url || v.file?.url;
      if (!url || v.file) return null; // Notion-hosted files expire, so skip them
      const label = plainText(v.caption) || url;
      return `[${escapeMd(label)}](${url})`;
    }
    case "toggle":
      return `<details>\n<summary>${text}</summary>\n\n${kids}\n\n</details>`;
    case "table": {
      const rows = (b.children || []).map((r) => "| " + r.table_row.cells.map((c) => richText(c).replace(/\|/g, "\\|")).join(" | ") + " |");
      if (!rows.length) return null;
      const cols = b.children[0].table_row.cells.length;
      const sep = "| " + Array(cols).fill("---").join(" | ") + " |";
      return [rows[0], sep, ...rows.slice(1)].join("\n");
    }
    case "column_list":
    case "column":
    case "synced_block":
      return kids || null;
    default:
      return null; // child pages, databases and other unsupported blocks are left out
  }
}

// ============ Post files ============

export function slugify(s) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // drop fadas and other accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
}

export function firstSentence(markdown) {
  // Skip headings, lists, quotes etc. and very short openers like "Hi!" so the teaser says something
  const para = markdown
    .split("\n\n")
    .find((p) => /^[^#>\-|!`<\d]/.test(p.trim()) && p.trim().length >= 40);
  if (!para) return "";
  const plain = para.replace(/[*_~`\\]/g, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\s+/g, " ").trim();
  const sentence = plain.match(/^.*?[.!?](\s|$)/)?.[0].trim() || plain;
  return sentence.length > 160 ? sentence.slice(0, 157).trimEnd() + "…" : sentence;
}

export function frontMatter({ title, date, teaser, topics, notionId }) {
  return [
    "---",
    `title: ${JSON.stringify(title)}`,
    `date: ${date}`,
    `teaser: ${JSON.stringify(teaser)}`,
    `topics: ${JSON.stringify(topics)}`,
    `notion_id: ${JSON.stringify(notionId)}`,
    "---",
    "",
  ].join("\n");
}

// Map notion_id -> existing file name, so republishing an entry updates its post instead of duplicating it
async function existingPosts() {
  const byId = new Map();
  const names = new Set();
  for (const f of await readdir(POSTS_DIR)) {
    if (!f.endsWith(".md")) continue;
    names.add(f.replace(/\.md$/, ""));
    const id = (await readFile(path.join(POSTS_DIR, f), "utf8")).match(/^notion_id:\s*"([^"]+)"/m)?.[1];
    if (id) byId.set(id, f.replace(/\.md$/, ""));
  }
  return { byId, names };
}

function pickSlug(base, names) {
  let slug = base;
  for (let n = 2; names.has(slug); n++) slug = `${base}-${n}`;
  names.add(slug);
  return slug;
}

// Re-encode an image so it carries no hidden metadata (phone photos often include the GPS
// location they were taken at). Photos are turned upright and capped at 1600px wide.
export async function cleanImage(buffer) {
  const { format } = await sharp(buffer).metadata();
  if (format === "gif") {
    return { data: await sharp(buffer, { animated: true }).gif().toBuffer(), ext: "gif" };
  }
  const img = sharp(buffer).rotate().resize({ width: 1600, withoutEnlargement: true });
  if (format === "png" || format === "svg") return { data: await img.png().toBuffer(), ext: "png" };
  if (format === "webp") return { data: await img.webp({ quality: 85 }).toBuffer(), ext: "webp" };
  return { data: await img.jpeg({ quality: 85, mozjpeg: true }).toBuffer(), ext: "jpg" };
}

async function downloadImage(url, dir, n) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Image download failed (${res.status})`);
  const { data, ext } = await cleanImage(Buffer.from(await res.arrayBuffer()));
  await mkdir(dir, { recursive: true });
  const name = `image-${n}.${ext}`;
  await writeFile(path.join(dir, name), data);
  return name;
}

async function publishEntry(page, existing) {
  const props = page.properties;
  const title = plainText(Object.values(props).find((p) => p.type === "title")?.title) || "Untitled";
  const date = (props.date?.date?.start || page.created_time).slice(0, 10);
  const topics = (props.topics?.multi_select || []).map((o) => o.name.toLowerCase().replace(/\s+/g, "-"));

  const slug = existing.byId.get(page.id) || pickSlug(slugify(title) || `entry-${date}`, existing.names);
  const imageDir = path.join(IMAGES_DIR, slug);
  await rm(imageDir, { recursive: true, force: true });

  let imageCount = 0;
  const ctx = {
    image: async (b) => {
      const img = b.image;
      if (img.type === "external") return img.external.url;
      const name = await downloadImage(img.file.url, imageDir, ++imageCount);
      return `/assets/journal/${slug}/${name}`;
    },
  };

  const body = await blocksToMarkdown(await fetchBlocks(page.id), ctx);
  const teaser = plainText(props.teaser?.rich_text).trim() || firstSentence(body);
  const file = path.join(POSTS_DIR, `${slug}.md`);
  await writeFile(file, frontMatter({ title, date, teaser, topics, notionId: page.id }) + "\n" + body + "\n");
  return { slug, title };
}

// ============ Entry point ============

async function main() {
  if (!process.env.NOTION_TOKEN || !process.env.NOTION_DATABASE_ID) {
    throw new Error("Set NOTION_TOKEN and NOTION_DATABASE_ID first.");
  }

  if (process.argv.includes("--mark-done")) {
    const ids = JSON.parse(await readFile(PUBLISHED_LIST, "utf8").catch(() => "[]"));
    for (const id of ids) {
      await notion("PATCH", `pages/${id}`, { properties: { [STATUS_PROPERTY]: { status: { name: DONE_STATUS } } } });
      console.log(`Marked ${id} as ${DONE_STATUS}`);
    }
    return;
  }

  const pages = await readyEntries(process.env.NOTION_DATABASE_ID);
  console.log(`${pages.length} entr${pages.length === 1 ? "y" : "ies"} set to "${READY_STATUS}"`);
  const existing = await existingPosts();
  const published = [];
  const skipped = [];
  for (const page of pages) {
    try {
      const { slug, title } = await publishEntry(page, existing);
      published.push(page.id);
      console.log(`✓ "${title}" -> journal/${slug}.md`);
    } catch (err) {
      // Leave this entry as "Push to blog" so it's retried next time
      console.error(`✗ Skipped ${page.id}: ${err.message}`);
      skipped.push(page.id);
    }
  }
  await writeFile(PUBLISHED_LIST, JSON.stringify(published));
  // The workflow checks this at the end and fails (which emails you) if anything was skipped
  if (skipped.length) await writeFile(SKIPPED_LIST, JSON.stringify(skipped));
  else await rm(SKIPPED_LIST, { force: true });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

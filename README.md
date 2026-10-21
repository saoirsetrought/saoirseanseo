# saoirseanseo.com

My personal portfolio: a digital scrapbook. It's plain HTML, CSS and JavaScript with no build step.

## Where things live

- `index.html`: all the text (bio, facts, experience, skills, interests, song)
- `styles.css`: colours, fonts and layout
- `script.js`: the video list (order and titles) and the hover and click behaviour
- `assets/videos/`: the TikTok videos
- `assets/me.png`: portrait for the polaroid (add this file and it shows up automatically)

## Updating the live site

Commit and push to GitHub, and Vercel redeploys within a minute:

```bash
git add -A
git commit -m "Update site"
git push
```

## Previewing locally

```bash
python3 -m http.server 4321
```

Then open http://localhost:4321.

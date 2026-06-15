# Blog Post — Publish Guide

The field notes are written and ready in `docs/field-notes.md`. Publishing on the Hackathon blog unlocks the **Field Notes** bonus quest badge. The HF Hub blog API does not currently expose a clean way to create community blog posts from Python, so this is a 5-minute manual submission via the web UI.

## Steps

1. **Open the new post composer**

   Navigate to: <https://huggingface.co/blog/build-small-hackathon/new>

   (If that exact URL doesn't work, go to <https://huggingface.co/build-small-hackathon> → Articles tab → "Write a post" / "New post" button. As a member of the org you should have write access.)

2. **Title** (already in the draft):

   > What building a 360M health coach taught me about small-model UX

3. **Slug** (the URL fragment):

   > body-debt-field-notes

   So the final URL will be: `https://huggingface.co/blog/build-small-hackathon/body-debt-field-notes`

4. **Cover image** (optional but recommended)

   A 1200×630 PNG of the dark hero number with the system meters below. Extract a 1920×1080 frame from the demo video and crop to 1200×630. If you don't have the video yet, use the Space's hero panel rendered via a screenshot at that resolution.

5. **Body content**

   Copy the entire content of `docs/field-notes.md` **after** the H1 title (which becomes the blog's title field, not part of the body). The first paragraph in the body should be the italic byline already in the draft:

   > *A field note from the Build Small Hackathon — Papajams, June 2026.*

6. **Tags / category** (if the UI offers it)

   Pick: `build-small-hackathon`, `smollm`, `local-ai`, `agent-trace`

7. **Submit for review**

   The hackathon blog is moderated; expect ~24h review. If you want to skip review, you can post on your personal blog at <https://huggingface.co/blog> instead and link to it from the Space. The Field Notes badge is awarded for *any* published writeup, not specifically the org blog.

## Alternative: publish on your personal blog

If the org blog requires approval you don't have time for, publish to your personal HF blog instead:

1. Go to <https://huggingface.co/blog>
2. Click "Write a post"
3. Same title and body
4. Slug: `body-debt-field-notes` (or any unique slug)
5. Publish immediately

Then update the Space README to point to the personal-blog URL.

## After publishing

- Replace the placeholder URL in `hf-space/README.md` with the actual post URL.
- Add the post URL to your X/LinkedIn post copy.
- Commit the README change to the repo.
- Push to `main` so the Space rebuilds with the corrected link.

## If you want me to do this

If you provide an `HF_TOKEN` with write access, I can:

- Publish the personal blog post via `huggingface_hub` (which does support personal blog posts via `HfApi.create_blog_post` if available in your version)
- Push the trained MLP weights to `Papajams/body-debt-stress-mlp`
- Push the agent trace JSONL to `Papajams/body-debt-traces`
- Push the updated Space files to the `build-small-hackathon/body-debt` Space repo

Let me know which of those you want done.

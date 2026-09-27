# NoteAssist AI public learning launch

The public learning library is a first release, not an AdSense approval or search ranking claim. Free reading and browser tools have no AI API cost. Account AI requests use the existing server-side Groq integration; a valid `GROQ_API_KEY` is required. No OpenAI account or paid AI plan is required for this release.

## What ships

- `/study-notes/`: three original Python, Django and SQL notes, each with examples and practice.
- `/blog/`: two study-method guides with practical steps.
- `/learning-paths/`: a linked seven-day Python to Django to SQL route.
- `/tools/`: word counter and focus timer that work locally in the browser; the existing note editor stays free.
- Static HTML pages, canonical metadata, structured Article data, `robots.txt` and `sitemap.xml` are generated during `npm run build`.
- Authenticated AI entry points use one shared allowance: **3 requests per day and 60 per calendar month** per account. Requests reserve allowance before provider calls; failed attempts still count. The allowance resets at the next UTC day and month in the current backend timezone.
- Public code execution returns HTTP 503 and is removed from navigation. Re-enable it only with a separate isolated execution service, strict resource limits, and abuse controls. Code snippets can still be written in the free editor.

## Before publishing or requesting AdSense review

1. Verify the final site origin and set `PUBLIC_SITE_URL=https://your-real-domain` in the frontend build environment; this controls public-page canonical URLs and sitemap. Update the SPA homepage canonical if the domain changes.
2. Apply the new Django migration: `python manage.py migrate`. Set `GROQ_API_KEY` only on the server and verify the provider's current free quota and terms. Never place this key in the frontend.
3. Test a fresh account's three AI actions, its fourth denied action, quota reset, registration, guest view, note editor, privacy page and both public tools against the actual deployed environment. Watch usage and service logs during initial traffic. On database backends without row locking, test concurrent reservations separately; PostgreSQL is recommended.
4. Fetch each public page without JavaScript on the production URL and confirm it returns the actual article HTML, not the SPA shell. Check canonical, sitemap and `robots.txt`; then submit sitemap in Google Search Console. Production routing has explicit collection rewrites, but cannot be proven by local Vite build alone.
5. Edit and verify each note's technical examples, references, byline and date before publishing. Add substantial, original lessons based on learner questions. Avoid near-duplicate location/keyword pages, copied textbooks and bulk AI-generated pages.
6. Verify the privacy policy describes actual analytics, cookies, user text, login and any ads before adding ad code. Add clear author/about/contact information and fix any stale links. Apply for AdSense only after the site has enough useful, working original content and meets its current policies. Do not display ads on user-uploaded private notes without a deliberate policy and UX review.
7. Confirm hosting permits commercial use, monitor hosting and Groq cost/limits, and put a sitewide capacity limit in place before increasing free AI availability. An account quota alone does not cap total usage from many accounts.

## Editorial and revenue cycle

Publish a linked topic cluster each week (example: Python functions → list comprehensions → exceptions → Django views → Django ORM → SQL joins), including a runnable example, a common mistake, practice and checked references. Review Search Console query/page reports after indexing; improve weak explanations and internal links, not just titles. Observe sessions, search clicks, return visits and ad revenue per thousand *page views* separately. AdSense approval, search traffic and daily income are uncertain. Delay paid AI plans until actual demand and provider costs are measured.

To add content, edit `NoteAssist_AI_frontend/content/publications.mjs`, review the rendered article, and rebuild. The static public routes under `NoteAssist_AI_frontend/public` are generated and ignored by git.

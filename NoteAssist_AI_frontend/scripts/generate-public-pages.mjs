import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { articles, studyNotes } from '../content/publications.mjs';

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(frontendRoot, 'public');
const siteUrl = (process.env.PUBLIC_SITE_URL || 'https://noteassistai.vercel.app').replace(/\/$/, '');
if (!/^https:\/\/[a-z0-9.-]+$/i.test(siteUrl)) {
  throw new Error('PUBLIC_SITE_URL must be an HTTPS origin without a path');
}
const paths = new Set(['/']);

const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);

async function output(path, html) {
  const filename = join(out, path.replace(/^\//, ''), 'index.html');
  await mkdir(dirname(filename), { recursive: true });
  await writeFile(filename, html);
  paths.add(path);
}

const navigation = `
  <nav class="site-nav" aria-label="Main navigation">
    <a class="brand" href="/">◈ NoteAssist AI</a>
    <div class="nav-links">
      <a href="/study-notes/">Study notes</a>
      <a href="/learning-paths/">Learning path</a>
      <a href="/blog/">Blog</a>
      <a href="/tools/">Free tools</a>
      <a href="/note-editor">Note editor</a>
      <a class="nav-action" href="/ai-tools">3 free AI requests/day</a>
    </div>
  </nav>`;

function layout({ title, description, path, body, type = 'WebPage', publishedAt }) {
  const canonical = siteUrl + path;
  const schema = {
    '@context': 'https://schema.org',
    '@type': type,
    headline: title,
    description,
    url: canonical,
    ...(type === 'Article' ? {
      datePublished: publishedAt,
      author: { '@type': 'Organization', name: 'NoteAssist AI' },
      publisher: { '@type': 'Organization', name: 'NoteAssist AI' }
    } : {})
  };
  return `<!doctype html>
<html lang="en"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escape(title)} | NoteAssist AI</title>
  <meta name="description" content="${escape(description)}">
  <link rel="canonical" href="${escape(canonical)}">
  <meta property="og:type" content="${type === 'Article' ? 'article' : 'website'}">
  <meta property="og:title" content="${escape(title)}">
  <meta property="og:description" content="${escape(description)}">
  <meta property="og:url" content="${escape(canonical)}">
  <script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>
  <link rel="stylesheet" href="/public-hub.css">
</head><body>
  <a class="skip-link" href="#main">Skip to content</a>
  ${navigation}
  <main id="main" class="page">${body}</main>
  <footer><div class="footer-inner"><strong>NoteAssist AI</strong><p>Free study notes, practical examples and tools. Signed-in accounts can make up to 3 free AI requests per day and 60 per month.</p><p><a href="/privacy-policy">Privacy</a> · <a href="/terms-of-service">Terms</a> · <a href="mailto:shahriyarkhanpk1@gmail.com">Contact</a></p></div></footer>
</body></html>`;
}

function card(entry, collection) {
  return `<a class="card" href="/${collection}/${escape(entry.slug)}/"><span class="eyebrow">${escape(entry.category)} · ${entry.readingMinutes} min read</span><h2>${escape(entry.title)}</h2><p>${escape(entry.excerpt)}</p><span class="card-link">Read free →</span></a>`;
}

function listing(collection, heading, intro, entries) {
  const body = `<div class="hero"><span class="eyebrow">Free learning library</span><h1>${heading}</h1><p>${intro}</p></div>
  <div class="card-grid">${entries.map((entry) => card(entry, collection)).join('')}</div>
  <section class="callout"><h2>Learn by doing</h2><p>Each note includes examples and questions you can try. Make your own notes in the free editor, then use limited AI help when you need it.</p><a class="button" href="/note-editor">Open the note editor</a></section>`;
  return layout({ title: heading, description: intro, path: `/${collection}/`, body });
}

function articlePage(entry, collection) {
  const path = `/${collection}/${entry.slug}/`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.publishedAt)) {
    throw new Error(`Missing valid publishedAt for ${entry.slug}`);
  }
  const publishedLabel = new Date(`${entry.publishedAt}T12:00:00Z`).toLocaleDateString('en-GB', {day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'});
  const other = (collection === 'study-notes' ? studyNotes : articles)
    .filter(({ slug }) => slug !== entry.slug);
  const body = `<div class="breadcrumbs"><a href="/">Home</a> / <a href="/${collection}/">${collection === 'study-notes' ? 'Study notes' : 'Blog'}</a> / ${escape(entry.category)}</div>
  <header class="article-head"><span class="eyebrow">${escape(entry.category)} · ${entry.readingMinutes} min read</span><h1>${escape(entry.title)}</h1><p>${escape(entry.description)}</p><span class="byline">NoteAssist AI · Published ${escape(publishedLabel)}</span></header>
  <article class="prose">${entry.body}</article>
  <section class="callout"><h2>Make this lesson yours</h2><p>Copy the questions into a personal study note, work through the examples, and return to the parts you missed.</p><a class="button" href="/note-editor">Try the free note editor</a><a class="quiet-link" href="/tools/">Browse free study tools</a></section>
  <section class="more"><h2>Keep learning</h2><div class="card-grid">${other.slice(0, 2).map((item) => card(item, collection)).join('')}</div></section>`;
  return layout({ title: entry.title, description: entry.description, path, body, type: 'Article', publishedAt: entry.publishedAt });
}

await output('/study-notes/', listing('study-notes', 'Free study notes', 'Original Python, Django and SQL notes with worked examples, self-check questions and practical exercises.', studyNotes));
await output('/blog/', listing('blog', 'Study methods and learning guides', 'Practical guides for turning class material into explanations, exercises and useful review notes.', articles));

await output('/learning-paths/', layout({
  title: 'A practical Python to Django learning path',
  description: 'A free three-step learning path from Python functions to Django QuerySets and SQL joins, with worked exercises and a weekly study plan.',
  path: '/learning-paths/',
  body: `<div class="hero"><span class="eyebrow">Free learning path</span><h1>From Python functions to real database queries</h1><p>A short route through three connected topics. Read an example, solve a question yourself, and check the answer before moving on.</p></div>
  <section class="prose"><h2>1. Start with functions</h2><p>In Python, practice passing inputs into a function and returning a result. Use the <a href="/study-notes/python-functions-beginner-notes/">functions study note</a> to build a small study-hours calculator. Write two tests: one for a normal session and one for an empty list. The goal is to understand a reusable calculation, not to memorize the example.</p>
  <h2>2. Fetch the right Django records</h2><p>Once you can read a function, learn how a view might fetch one user's notes. In the <a href="/study-notes/django-querysets-study-notes/">QuerySet note</a>, compare a query built with <code>filter(user=request.user)</code> to one without that condition. Ask which notes each could show. Then write a list query that orders the user's notes from newest to oldest. Check when the QuerySet actually talks to the database.</p>
  <h2>3. Understand how rows connect</h2><p>A Django relationship is easier to debug when you can picture its underlying tables. Work through the <a href="/study-notes/sql-joins-practice-notes/">SQL joins note</a>. Predict which rows appear with <code>INNER JOIN</code> and with <code>LEFT JOIN</code>, including a student with no study sessions. Then calculate a per-student session count and explain why <code>COUNT(sessions.student_id)</code> handles an unmatched row correctly.</p>
  <h2>A repeatable week of study</h2><ol><li>Day 1: read functions, type the example, answer the two tasks.</li><li>Day 2: explain parameters and returns without opening the page.</li><li>Day 3: read QuerySets and draw how a note belongs to a user.</li><li>Day 4: write a current-user query; check it with your own data.</li><li>Day 5: read joins and predict each result before looking at the answer.</li><li>Day 6: make one <a href="/note-editor">personal study note</a> summarizing the links between the three topics.</li><li>Day 7: revisit only the questions you missed. A <a href="/tools/focus-timer/">focus timer</a> can help you set a short review window.</li></ol><p>If you get stuck, turn a line of code into a specific question first. The <a href="/blog/how-to-turn-lecture-notes-into-practice/">notes-to-practice guide</a> shows how; limited free AI help is optional.</p></section>`
}));

for (const entry of studyNotes) await output(`/study-notes/${entry.slug}/`, articlePage(entry, 'study-notes'));
for (const entry of articles) await output(`/blog/${entry.slug}/`, articlePage(entry, 'blog'));

await output('/tools/', layout({
  title: 'Free study tools',
  description: 'Use a free word counter and focus timer in your browser. No account or AI credits needed.',
  path: '/tools/',
  body: `<div class="hero"><span class="eyebrow">Free and private</span><h1>Small tools for better study sessions</h1><p>These tools work in your browser. Text entered into the word counter is not uploaded to NoteAssist.</p></div>
    <div class="card-grid"><a class="card" href="/tools/word-counter/"><span class="eyebrow">Writing</span><h2>Study note word counter</h2><p>Check words, characters and an approximate reading time.</p><span class="card-link">Open tool →</span></a>
    <a class="card" href="/tools/focus-timer/"><span class="eyebrow">Focus</span><h2>Focus timer</h2><p>Choose a short study interval and take a deliberate break.</p><span class="card-link">Open tool →</span></a></div>
    <section class="callout"><h2>Prefer a structured note?</h2><p>The note editor remains free; AI writing help is optional and limited per day.</p><a class="button" href="/note-editor">Open note editor</a></section>`
}));

await output('/tools/word-counter/', layout({
  title: 'Free study note word counter',
  description: 'Count words and characters in your notes locally in your browser, with a simple reading-time estimate.',
  path: '/tools/word-counter/',
  body: `<div class="hero"><span class="eyebrow">Free browser tool</span><h1>Study note word counter</h1><p>Paste a paragraph to check its length. The text stays in your browser and is not sent to our server.</p></div>
  <section class="tool-panel"><label for="note-text">Your text</label><textarea id="note-text" data-word-input rows="11" placeholder="Paste or type your study note here..."></textarea><div class="tool-stats"><div><strong data-words>0</strong><span>words</span></div><div><strong data-characters>0</strong><span>characters</span></div><div><strong data-reading>0</strong><span>minutes to read (approx.)</span></div></div></section>
  <section class="prose"><h2>How to use this result</h2><p>A short note is easier to review when it contains a clear idea, one worked example and a question you can answer without looking. Word count alone cannot judge accuracy or quality. Reading time is an approximation based on 200 words per minute.</p><p>Try the <a href="/blog/how-to-turn-lecture-notes-into-practice/">note-to-practice guide</a> when the text feels too long, or start a fresh page in the <a href="/note-editor">free editor</a>.</p></section><script defer src="/public-hub-tools.js"></script>`
}));

await output('/tools/focus-timer/', layout({
  title: 'Free study focus timer',
  description: 'A simple focus timer for short study sessions, with optional 15, 25 and 45 minute intervals.',
  path: '/tools/focus-timer/',
  body: `<div class="hero"><span class="eyebrow">Free browser tool</span><h1>Focus timer</h1><p>Choose one small task, set an interval, and start. Your timer runs in this browser tab; no signup is needed.</p></div>
  <section class="tool-panel" data-focus-timer><div class="duration-choices"><button type="button" data-minutes="15">15 minutes</button><button type="button" data-minutes="25" aria-pressed="true">25 minutes</button><button type="button" data-minutes="45">45 minutes</button></div><div class="timer" role="timer" aria-live="off" data-time>25:00</div><p data-timer-message>Write down one thing you want to finish before you start.</p><div class="timer-controls"><button type="button" data-start>Start</button><button type="button" data-pause>Pause</button><button type="button" data-reset>Reset</button></div></section>
  <section class="prose"><h2>After the timer</h2><p>Close your notes and answer one question from memory. Check the answer and write down what you missed. A short session with feedback can be more useful than leaving a timer running without a clear task. Try the <a href="/blog/cornell-notes-for-programming-classes/">worked note template</a>.</p></section><script defer src="/public-hub-tools.js"></script>`
}));

await writeFile(join(out, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`);
await writeFile(join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...paths].sort().map((path) => `  <url><loc>${siteUrl}${path}</loc></url>`).join('\n')}\n</urlset>\n`);
console.log(`Generated ${paths.size} public pages and sitemap for ${siteUrl}`);

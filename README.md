# Aman Bhatt — Portfolio

A personal portfolio website showcasing my skills, projects, and experience as a Data Scientist & ML Engineer — with a built-in **developer console** for editing content and the resume without touching code.

**Live site:** [amanbhatt97.github.io/portfolio](https://amanbhatt97.github.io/portfolio/)

---

## How it works

```
index.html            The site (static fallback markup + hydration)
content.json          Single source of truth for ALL site text & lists
admin.html            Developer console (login → edit → publish)
assets/
  css/site.css        Site design system & styles
  css/admin.css       Console styles
  js/site.js          Hydration from content.json + interactions
  js/admin.js         Console: GitHub API auth, editor, publishing
Aman_Bhatt_Resume.pdf The resume served by every “Resume” button
images/               Photos, project covers, tech logos
```

The page renders instantly from static markup, then hydrates from `content.json`.
Editing happens in the **developer console**, which commits `content.json` (or a new
resume PDF) to this repository through the GitHub REST API — GitHub Pages redeploys
automatically and changes go live in ~1–2 minutes.

## Developer console

Open **`/admin.html`** (linked as “Developer” in the site footer).

- **Login** — a GitHub *fine-grained personal access token*:
  1. GitHub → Settings → Developer settings → [Fine-grained tokens](https://github.com/settings/personal-access-tokens/new)
  2. Repository access → *Only select repositories* → `portfolio`
  3. Permissions → **Contents: Read and write**
- **Edit** — every section (hero, about, skills, experience, projects, hire banner,
  contact, footer/SEO) with add / remove / reorder for lists. Changes autosave as a
  local draft until you publish.
- **Resume** — drag-and-drop a PDF to replace `Aman_Bhatt_Resume.pdf`; all resume
  buttons keep working since the path never changes.
- **Publish** — commits to the branch GitHub Pages deploys from (`main` by default).

Security model: the console is a static page — there is no server and no shared
password. All writes require your GitHub token, which stays in your browser and is
sent only to `api.github.com`.

## Features

- Production-grade single-page design: buttery smooth scrolling (Lenis), scroll-reveal
  and staggered entrance animations, cursor spotlight cards, logo marquee, light/dark
  theme, auto-hiding glass nav
- Fully content-managed via `content.json` + developer console
- SEO: Open Graph / Twitter cards, canonical URL, JSON-LD person schema
- Accessible: skip link, focus styles, `prefers-reduced-motion` support, semantic markup
- No build step, no framework — deploys as plain static files

## Tech stack

![HTML](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-222222?style=flat&logo=github&logoColor=white)

## Contact

- **Email:** amanbhatt.1997.ab@gmail.com
- **LinkedIn:** [linkedin.com/in/amanbhatt1997](https://www.linkedin.com/in/amanbhatt1997/)
- **GitHub:** [github.com/amanbhatt97](https://github.com/amanbhatt97)

---

> Built with HTML, CSS & vanilla JS. Deployed on GitHub Pages.

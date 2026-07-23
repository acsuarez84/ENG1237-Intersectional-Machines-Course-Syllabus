# ENG1237: Intersectional Machines — Interactive Syllabus

An accessible, multi-page website built from the ENG1237 course syllabus
(*Intersectional Machines: A Feminist Approach to AI*, Ms. Suarez DeJesus).

## What it does

- **A page per section.** The nine numbered syllabus sections each have their own
  page, reachable from the **Home** grid or the **Sections ▾** menu in the top bar.
- **A Home tab on every page.** The top bar carries a persistent **⌂ Home** button so
  students can always return to the landing page.
- **Working reading links.** Every required reading (Section 4) and supplemental case
  study (Section 5), plus all software and video links (Section 6), open their real
  source in a new tab.
- **Cross-reference links.** Wherever the syllabus says “see section …” or refers to a
  numbered section, the phrase is a link that jumps to that section’s page.
- **Light & dark themes.** A **Dark mode / Light mode** toggle in the top bar. The site
  also respects the reader’s operating-system preference on first visit, and remembers
  the choice in `localStorage`.
- **Read aloud (text-to-speech).** A **Read aloud** button speaks the page content using
  the browser’s built-in speech synthesis, with Pause / Restart / Stop, a voice picker,
  and speed control. The sentence being spoken is highlighted and scrolled into view.
- **Accessibility.** Semantic HTML, a “Skip to main content” link, visible keyboard
  focus outlines, ARIA labels, high-contrast colors in both themes, and reduced-motion
  support.

## Files

| Path | Purpose |
|------|---------|
| `index.html` | Home page with course-at-a-glance and section cards |
| `section1.html` … `section9.html` | One page per syllabus section |
| `assets/style.css` | Shared styles, light + dark themes |
| `assets/app.js` | Theme toggle + read-aloud behavior |

## Viewing it

Open `index.html` in any modern browser — no build step or server required.

## Publishing on GitHub Pages

1. Push this branch to GitHub.
2. In the repository, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to *Deploy from a branch*, pick this
   branch and the `/ (root)` folder, and save.
4. Your syllabus will be live at
   `https://<username>.github.io/<repository>/`.

The `.nojekyll` file ensures GitHub Pages serves the files as-is.

> **Note on read-aloud voices:** available voices come from the visitor’s own browser
> and operating system, so the voice list varies by device. The feature degrades
> gracefully and hides itself in browsers without speech-synthesis support.

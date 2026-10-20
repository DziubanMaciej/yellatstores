# Implementation plan

The order follows your answer: **editor scripts + tests first, then the site.** Every phase
ends in a working, tested state. All design questions are answered (see [decisions.md](decisions.md)).
New questions that come up go to the user, and the answers are logged in decisions.md.

Editor UI: a terminal menu, plus a local browser page for drawing and viewing (decided).

## File layout

```
yellatstores/
├── CLAUDE.md
├── package.json              {"type":"module", "scripts":{"test":"node --test"}}, no dependencies
├── .github/workflows/pages.yml   test job → deploy job (site/ + data/)
├── .claude/skills/fill-aliases/SKILL.md
├── data/                     products.json, recipes.json, stores.json
├── docs/
├── site/                     deployed as the site root
│   ├── index.html, style.css
│   ├── app.js                DOM wiring only, no logic
│   └── lib/                  pure ES modules, no DOM; shared with the editor
│       ├── normalize.js      normalize(), used everywhere names are compared
│       ├── parse.js          split input, extract quantity + notes
│       ├── expand.js         recipe expansion
│       ├── resolve.js        name → product, product → section / unknown reason
│       ├── group.js          group + order sections, Unknown last
│       ├── map.js            store → SVG markup string (sections + decorations)
│       └── share.js          list/store ⇄ URL fragment
├── scripts/                  local only, never deployed
│   ├── edit.js               editor entry point: `node scripts/edit.js`
│   ├── serve.js              local static server mirroring the deployed layout (site/ at /, data/ at /data)
│   ├── lib/
│   │   ├── data.js           load / save (validate → canonical formatting → write)
│   │   ├── validate.js       validate(dir) → list of errors
│   │   ├── io.js             terminal I/O (readline) behind a small interface
│   │   ├── browser.js        starts a local page for drawing/viewing, waits for the result
│   │   └── commands/         one file per menu command, logic only
│   └── draw/                 browser page for drawing rects (uses site/lib/map.js)
└── test/
    ├── fixtures/             small valid + deliberately broken data sets
    ├── site/*.test.js
    ├── scripts/*.test.js
    └── data.test.js          validate('data/') on the real data
```

Why `site/lib` is shared: the editor imports `normalize.js` and `map.js` from there. Matching
and map drawing then exist only once, so the editor and the site can't drift apart.

## Testability design (editor)

Every command is a function `async run(data, io)`:
- `data` is the loaded in-memory data.
- `io` is the only way to talk to the user, through `ask(text)`, `choose(text, options)`,
  `print(text)`, `drawSections(store)` and `showStore(store)`.
- The real `io` uses readline and the browser.
- Tests pass a **fake io** with a scripted list of answers, plus a fake `drawSections` that returns
  predefined rects.

Then the test saves to a temp dir and runs **the same `validate()`** on the result. No browser
or terminal is needed in tests. The drawing page itself (mouse handling) isn't unit-tested;
its pure geometry helpers (normalise a dragged rect, overlap check) are.

## Phase 0: Scaffolding
1. `.gitignore`, `package.json` (no dependencies), folder skeleton, `test/` with one trivial
   test. You create the git repo yourself.
2. Update CLAUDE.md with the commands (`npm test`, `node scripts/edit.js`, `node scripts/serve.js`).

*Done when:* the single test command runs and passes.

## Phase 1: Data core
1. `site/lib/normalize.js` + tests (case, whitespace, all Polish diacritics including `ł`).
2. `scripts/lib/validate.js`, implementing every rule in [data_layout.md](data_layout.md#integrity-rules).
   Tests run it on fixtures: one valid set, plus one broken set per rule, each asserting the
   expected error message.
3. `scripts/lib/data.js`: load and save with canonical formatting. Test: load → save
   leaves the files byte-identical.
4. Minimal real `data/` (a few products, one recipe, one store with 2–3 sections typed by hand)
   + `test/data.test.js`.

## Phase 2: Editor, text commands
1. `scripts/lib/io.js` + the menu loop in `edit.js` (numbered options, `q` to quit).
2. Commands, each with tests via the fake io:
   - E3 add product (rejects collisions)
   - E4 add aliases
   - E5 add recipe (ingredients picked from products)
   - E6 assign products: only unassigned ones; options are the sections, "not in store" and quit; saves after every answer
   - E8 validate
3. Each command's test ends with `validate()` on the written output.

*Done when:* you can build up products/recipes and assign them for a hand-made store.

## Phase 3: Map rendering + view store
1. `site/lib/map.js`: store → SVG string (bounding box → `viewBox`, rects, labels, decorations).
   Tests check the structure (viewBox and element counts), not the pixels.
2. `scripts/lib/browser.js` + `serve.js`: a local HTTP server on a free port. It opens Firefox
   with `xdg-open` and, for drawing, receives the result via `POST`.
3. E7 view store: a page with the map and an alphabetical product list per section (plus
   not-in-store / unassigned).

## Phase 4: Drawing
1. `scripts/draw/`: a page showing the current sections (via `map.js`).
   - Drag to create a rect, then enter a name.
   - A toggle switches between drawing a section and drawing a decoration (label + visible checkbox).
     Decorations are drawn dimmer.
   - Rects overlapping any other rect are refused.
   - A **Done** button posts the result back. The editor UI is in English.
2. E1 create store: name in the terminal, then `io.drawSections()`.
3. E2 edit store layout: the terminal asks add / redraw / rename and which section or decoration.
   - Redraw opens the page with that one rect removed from the canvas so you can draw it again.
     A redrawn section keeps its name and products.
   - Rename is terminal-only. A section rename updates `store.products`.
4. Tests: E1/E2 through the fake io, plus pure geometry helpers (normalise a dragged rect,
   overlap check).

*Done when:* you can create a real store from scratch and view it.

## Phase 5: Real data + fill-aliases skill
1. Polish `.claude/skills/fill-aliases/SKILL.md` (draft exists, see [skills.md](skills.md)).
2. You enter the real stores/products/recipes with the editor. The skill fills in aliases.

## Phase 6: Site
1. `scripts/serve.js` for local dev at `http://localhost:8000`.
2. Pure modules + tests, following the pipeline in [requirements.md §2.2](requirements.md#22-processing-pipeline):
   - `parse.js`: split, the quantity table, Polish number words, notes
   - `expand.js`: recipes. An entry with a quantity or notes never expands.
   - `resolve.js`: resolve, merge duplicates (notes concatenated, not summed), locate with an unknown reason
   - `group.js`: JSON section order, Nieznane last
3. `index.html` / `app.js` / `style.css`, with two views switched on `hashchange`:
   - **Input view:** store select (no default), textarea, Dalej → sets the hash.
   - **Result view:** grouped list, SVG map, Kopiuj link.
   - Map: highlighted sections with a count badge, the rest dimmed.
   - Click/tap toggles the linked highlight between map and list; hover outline on PC.
   - Mobile-first: list on top, map below. Polish UI strings.
4. Fetch data with `{cache: 'no-cache'}`.

*Done when:* a real list gives the right grouped list and map locally, on desktop and in
Firefox's mobile view.

## Phase 7: Share link
`share.js`: encode/decode `#sklep=…&lista=…` with `encodeURIComponent`. Tests: round-trip,
Polish characters, newlines, `&`/`=`/`#` inside the list, a store missing from the data.
(Phase 6 already uses it for Dalej. This phase is the hardening and edge cases.)

## Phase 8: Deploy
1. `.github/workflows/pages.yml` with two jobs. On push to `main`:
   - **test**: `node --test`.
   - **deploy** (`needs: test`): copy `site/*` and `data/` into `_site/`, run `upload-pages-artifact`, then `deploy-pages`.
   - If the tests fail, deploy never runs and the **previous version stays live**. The site is never taken down.
2. Follow [hosting.md](hosting.md).

*Done when:* https://stores.yellatcomputers.com works on your phone.

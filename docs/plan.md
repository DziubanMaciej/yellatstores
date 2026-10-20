# Implementation plan

The order follows your answer: **editor scripts + tests first, then the site.** Every phase
ends in a working, tested state. All design questions are answered (see [decisions.md](decisions.md)).
New questions that come up go to the user, and the answers are logged in decisions.md.

Editor UI: a terminal menu, plus a local browser page for drawing and viewing.

## File layout

✅ = exists. The rest is planned.

```
yellatstores/
├── CLAUDE.md ✅
├── package.json ✅           {"type":"module", "scripts":{"test":…}}, no dependencies
├── .github/workflows/pages.yml   test job → deploy job (site/ + data/)
├── .claude/skills/fill-aliases/SKILL.md ✅
├── data/ ✅                  products.json, recipes.json, stores.json
├── docs/ ✅
├── site/                     deployed as the site root
│   ├── index.html, style.css
│   ├── app.js                DOM wiring only, no logic
│   └── lib/                  pure ES modules, no DOM; shared with the editor
│       ├── normalize.js ✅   normalize(), compareNames() (Polish alphabetical order)
│       ├── geometry.js ✅    rect gap/overlap, drag → rect, bounding boxes
│       ├── map.js ✅         store layout → SVG markup string
│       ├── parse.js          split input, extract quantity + notes
│       ├── expand.js         recipe expansion
│       ├── resolve.js        name → product, product → section / unknown reason
│       ├── group.js          group + order sections, Unknown last
│       └── share.js          list/store ⇄ URL fragment
├── scripts/                  local only, never deployed
│   ├── edit.js ✅            editor entry point: `node scripts/edit.js`
│   ├── serve.js              local static server mirroring the deployed layout (site/ at /, data/ at /data)
│   ├── lib/ ✅
│   │   ├── data.js           load / save (validate → canonical formatting → write)
│   │   ├── format.js         canonical JSON formatting
│   │   ├── validate.js       validateData(data), validateDir(dir) → list of errors
│   │   ├── io.js             ask / choose / confirm / print; terminal and scripted versions
│   │   ├── context.js        loaded data + ctx.change(): apply → validate → save
│   │   ├── input.js          name cleanup, lookup by name/alias, store picker
│   │   ├── browser.js        short-lived local server for the browser pages
│   │   ├── store-view.js     data for the "View store" page
│   │   ├── menu.js           main menu loop
│   │   └── commands/         one file per menu command
│   └── web/ ✅               browser pages: draw.html/js, view.html/js, api.js, style.css,
│                             draw-model.js (pure drawing rules, tested in Node)
└── test/ ✅
    ├── helpers/              sample data, scripted editor session (fake io + fake browser)
    ├── site/*.test.js
    ├── scripts/**/*.test.js
    └── data.test.js          validateDir('data/') on the real data
```

Why `site/lib` is shared: the editor imports `normalize.js`, `geometry.js` and `map.js` from
there, so matching, overlap rules and map drawing exist only once. The editor's local server
serves `site/lib` at `/site/lib/`, so the same relative imports work in the browser and in Node.

## Testability design (editor)

- Every command is `async command(ctx)`. `ctx` holds:
  - the loaded `data`
  - `io` with `ask`, `choose`, `confirm` and `print`, the only way to talk to the user
  - `browser` with `drawLayout(params)` and `showStore(view)`
  - `change(mutate)`, which applies a change to a copy, runs `validateData()`, then saves and
    adopts it, or prints the errors and changes nothing
- All rules therefore live in the validator, not in the commands.
- Tests (`test/helpers/editor.js`) build `ctx` with a scripted io (a list of typed answers), a
  fake browser (a list of page results) and a temp data dir. At the end, they run
  **`validateDir()`** on the written files.
- The browser pages:
  - The local server is tested by playing the page's part over HTTP.
  - The pure drawing rules (`draw-model.js`) are unit-tested.
  - The DOM/mouse code was checked by hand in headless Firefox. It has no automated test, because
    that would need a browser-automation dependency.

## Phase 0: Scaffolding ✅
`.gitignore`, `package.json` (no dependencies), `test/setup.test.js` (ES modules, no dependencies),
and the CLAUDE.md commands.

## Phase 1: Data core ✅
- `normalize.js`
- `geometry.js`
- `format.js` (canonical formatting)
- `data.js` (load/save; saving refuses invalid data)
- `validate.js` (every rule in [data_layout.md](data_layout.md#integrity-rules), with one or
  more tests per rule)
- `data/` starts as empty files (`{}`), and `test/data.test.js` validates it.

## Phase 2: Editor, text commands ✅
- `io.js` and the menu loop
- E3 add products, E4 add aliases (products and recipes), E5 add recipes, E6 assign products,
  E8 validate (offers to reformat when formatting is the only problem)
- Each has a test file.

## Phase 3: Map rendering + view store ✅
- `site/lib/map.js`
- `browser.js` (local server, opens pages with `xdg-open`)
- E7 view store: map + alphabetical products per section, not carried, unassigned

## Phase 4: Drawing ✅
- `scripts/web/draw.*`, one layout page:
  - Drag on empty space to draw, then a popup asks for the kind (section/decoration) and the name.
  - Drag a rect to move it. Select it and drag a corner handle to resize.
  - Click a rect to rename it (decorations: label and box/text-only too).
  - Rects closer than 1 unit turn red, and Done refuses to save while any are red.
  - Mouse wheel zooms around the pointer, middle- or right-button drag pans.
  - Also: Undo (covers every change), Cancel, Done. Returns the whole layout plus
    section renames, so that assigned products follow renamed sections.
- E1 create store and E2 edit store layout both open this page directly.

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
   - **test**: `npm test`.
   - **deploy** (`needs: test`): copy `site/*` and `data/` into `_site/`, run `upload-pages-artifact`, then `deploy-pages`.
   - If the tests fail, deploy never runs and the **previous version stays live**. The site is never taken down.
2. Follow [hosting.md](hosting.md).

*Done when:* https://stores.yellatcomputers.com works on your phone.

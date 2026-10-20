# YellAtStores: Requirements

A personal tool for grocery shopping. Input: a free-text grocery list (Polish) and a chosen
store. Output: the list grouped by store section, and a map of the store.

Single user (the author). No accounts, no backend, no database, no stored state. All data is
JSON in this repo.


## 1. Components

| Part | Runs where | Purpose |
|------|------------|---------|
| **Site** | `stores.yellatcomputers.com` (GitHub Pages, deployed by GitHub Actions) | Read-only: grocery list → grouped list + map. |
| **Editor** | Locally: Node terminal menu + browser page for drawing/viewing | Edits the data. Not deployed. |
| **Data** | `data/*.json` | Single source of truth. See [data_layout.md](data_layout.md). |
| **Tests** | Locally and in CI: `npm test` (= `node --test`) | Site logic, editor commands, and validation of the real data. |

Workflow: run the editor locally → run tests by hand → commit → push. GitHub Actions runs the tests
and deploys only if they pass. If they fail, the previous deployment stays live.

**Language rules:** code, identifiers, comments, docs, commit messages and the **editor UI** are in
**English**. The **site UI** and the data content are in **Polish**.

**Dependencies:** none. `package.json` exists only for `"type": "module"` and the test script.
Dependencies are only added if the user explicitly approves them.

## 2. Site

Plain HTML + vanilla JS (ES modules) + CSS. No build step. Mobile-first, but it should look good
on a PC too. No localStorage or any other stored state: the URL is the only state.

### 2.1 Two views, driven by the URL

| URL | View |
|-----|------|
| no fragment | **Input view**: store dropdown (no default; placeholder *Wybierz sklep*), textarea, **"Dalej"** button. |
| `#sklep=<store>&lista=<list>` | **Result view**: grouped list + map + **"Kopiuj link"** and **"Edytuj"** buttons. |

- **Dalej** navigates to `#sklep=…&lista=…`. Both values are `encodeURIComponent`-ed, and the list is
  the raw text as typed. So after Dalej the address bar already holds the share link.
  Dalej is **disabled** until a store is picked and the list is non-empty.
- **Kopiuj link** copies the current URL to the clipboard, for convenience.
- Opening a share link shows the result view directly.
- **Back to editing:** the browser's Back button works (Dalej adds a history entry). **Edytuj**
  returns to the input view with the store and list pre-filled from the link.
- A link whose store doesn't exist in the data shows the **input view**, with the list
  pre-filled and the message *Nie znaleziono sklepu "X"*.

### 2.2 Processing pipeline

1. **Split** the input on newlines, `,` and `;`. Trim and drop empty entries.
2. **Parse each entry** into `{ name, notes[] }`.
   - **Notes**: each `( … )` group in the entry is one note. `mleko (bez laktozy)` → note `bez laktozy`.
   - **Quantity**: becomes the note `Nx`, placed **first** among the entry's notes.

     | Form | Example | Counts as quantity? |
     |------|---------|---------------------|
     | `N name` | `2 mleko`, `12 jajek`, `1 mleko` | ✓ (any number, including 1) |
     | `Nx name`, `xN name` | `2x mleko`, `x2 mleko` | ✓ |
     | `N x name` | `2 x mleko` | ✓ |
     | `name Nx`, `name xN` | `mleko 2x`, `mleko x2` | ✓ |
     | `name N` | `mleko 2` | ✗. Stays part of the name, so it won't match |
     | Polish number word 1–10 | `jedno mleko`, `dwa mleka`, `pięć jajek` | ✓: `jeden`/`jedna`/`jedno`, `dwa`/`dwie`, `trzy`, `cztery`, `pięć`, `sześć`, `siedem`, `osiem`, `dziewięć`, `dziesięć` |
     | Units | `mleko 2l`, `500g mąki` | ✗. Won't match. Write `mleko (2l)` instead |

     `1x` is kept as a note if written (`1x mleko` → `mleko (1x)`). `jedno mleko` → `mleko (1x)`.
     No quantity written → no quantity note.
   - Example: `2 mleko (bez laktozy)` → name `mleko`, notes `2x`, `bez laktozy` →
     displayed `mleko (2x, bez laktozy)`.
   - Inflected names after numbers (`mleka`, `jajek`) only match if they are aliases.
3. **Expand recipes**: if an entry **with no quantity and no notes** matches a recipe name or alias
   (normalised), it's replaced by the recipe's ingredients, each with the note `spaghetti` (the
   recipe's canonical name, no extra words).
   - `2 spaghetti` or `spaghetti (bez sera)` → no match → Unknown (*nieznany produkt*).
   - No nested recipes, and no removing ingredients.
4. **Resolve** the name to a product by exact normalised match on the product name or an alias.
5. **Merge duplicates**: a product appearing more than once becomes one line. Its notes are
   concatenated in order of appearance, quantities included and not summed:
   - `2 mleko` + `3 mleko` → `mleko (2x, 3x)`
   - `2 pomidory` + `spaghetti` → `pomidory (2x, spaghetti)`
   - Only resolved products merge. Unrecognised entries are never merged: `xyz` typed twice is listed twice.
6. **Locate** the product in the chosen store: a section, or Unknown with a reason note:
   *nieznany produkt* / *nieprzypisany w tym sklepie* / *nie ma w tym sklepie*. The reason
   note comes after the other notes.
   - Unresolved items show the name as typed. Resolved ones show the canonical name.
7. **Group**: section groups in the order the sections appear in `stores.json`, then an
   **Nieznane** group last. Only sections with items are listed. Inside a group, items keep the
   order of first appearance.

### 2.3 Result view
- **List**: one group per section: a header with the section name, then items as
  `name (note, note, …)`.
- **Do not show section ids** anywhere on the site (list or map). They are an editor-only aid;
  render the map without the `showIds` option.
- **Map**: SVG built from sections and decorations, labelled.
  - Sections with list items are highlighted and show a **count badge** (a small circle with the
    number of items). Item names are **not** drawn on the map.
  - Other sections are dimmed, in the same style as decorations.
- **Linked highlight**: **click/tap** a highlighted section on the map or a group in the list to
  highlight both.
  - **One at a time**: clicking another one switches to it, and clicking the same one again clears it.
  - Same on phone and PC.
  - On PC, hovering a clickable element shows a slight outline change, as a hint that it's clickable.
  - No scrolling on tap.

## 3. Editor

Node, no dependencies, **English UI**. A **terminal menu** (numbered options) drives everything.
Commands that need visuals open a **local browser page**, and the terminal waits until you click
**Done** there. **Testable:** commands talk to the user only through an injected `io` object, so
tests run them with scripted answers against a temporary data directory.

| # | Command | Description |
|---|---------|-------------|
| E1 | **Create store** | Enter a name, then the layout page opens (see below). |
| E2 | **Edit store layout** | Pick a store; the layout page opens. Products are assigned by section id, so renaming a section keeps its products. No removing. |

**Layout page** (used by E1 and E2):
- Each section shows its **id** in its top-left corner. A new section gets the next free id
  (highest id + 1).
- Drag on empty space to draw a rect. A popup then asks: section or decoration, its name or label,
  and for decorations whether to draw the box or show text only.
- Drag a rect to move it. Select it and drag a corner handle to resize it. Coordinates are whole units.
- Click a rect (without moving it) to rename it in the same popup. For decorations the popup also
  edits the label and the box/text-only setting. The kind of an existing rect can't change.
- Rects closer than 1 unit to another rect are shown **red**, and **Done refuses to save** while any
  are red.
- The mouse wheel zooms in and out around the pointer (no Ctrl needed); dragging with the middle or right mouse button pans (no context menu over the map).
- Undo (drawing, moving, resizing, renaming), Cancel, Done.
| E3 | **Add product** | Name and aliases. Rejects anything that collides after normalisation. |
| E4 | **Add aliases** | Pick a product **or recipe** and add aliases. |
| E5 | **Add recipe** | Name, aliases, ingredients picked from products. |
| E6 | **Assign products to store** | Pick a store; a browser page shows the **unassigned** products one at a time (alphabetically) above the store map with section ids. **Click a section** to assign the product, or use **Not in this store** (`null`), **Skip** (stays unassigned), **Back** (previous product, its answer is cleared) or **Done**. Every click is saved immediately. |
| E7 | **View store** | Browser page: the map with labels and section ids, and beside it the products sorted alphabetically, grouped by section, plus "not in store" and "unassigned" groups. Linked highlight between a section on the map and its group in the list: slight on hover, strong on click (toggle, one at a time, like the site). |
| E8 | **Validate** | Run the integrity checks on `data/` and print the errors. |

Every save validates first and refuses to write invalid data. Nothing can be deleted from the
editor (edit the JSON by hand, or `git checkout data/`).

## 4. Tests

- One command: `npm test` (runs `node --test`). Everything lives in `test/`.
- Site logic: parsing, normalisation, recipe expansion, resolving, merging, grouping,
  share-link encoding, SVG map structure.
- Editor: each command, driven with scripted input against a temp copy of the data. The
  resulting files are then checked with the **same `validate()`**.
- Real data: `validate('data/')` runs as one of the tests.
- No git hook. You run the tests by hand, and CI runs them before deploying.

## 5. Claude skill: fill-aliases

Proposes missing aliases for products **and recipes** (singular/plural, genitive plural, true
synonyms; no English). It shows a table for approval first, then writes and validates. See
[skills.md](skills.md).

## 6. Hosting

GitHub Pages via GitHub Actions, custom subdomain `stores.yellatcomputers.com`, DNS at
Hostinger. Tutorial: [hosting.md](hosting.md).

## 7. Non-goals (for now)
- Walking path or route suggestions.
- Plurals, inflection, fuzzy matching, units, summing quantities.
- Quantities or notes on recipe entries, nested recipes. Suggestions for unmatched items.
- Deleting anything from the editor. Bulk import. Product categories.
- Fixing Unknown items from the site.
- Any stored state on the site (localStorage, cookies). Offline mode, accounts, backend, git hooks.
- Dependencies (unless explicitly approved).

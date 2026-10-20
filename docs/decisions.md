# Decisions log

Short record of what was decided and why. The details live in the other docs.

## Round 1 (2026-10-20)

| Topic | Decision |
|-------|----------|
| Language | JS everywhere: site and editor. Code, identifiers and docs in **English**. UI and data content in **Polish**. |
| Site | Plain HTML + vanilla JS modules + CSS. Zero build, no npm. Mobile-first, and it should look good on a PC too. |
| Editor | Node. Must be testable. |
| Path | **No walking path.** |
| Deploy | Run scripts locally, push by hand. GitHub Actions deploys `site/` + `data/`, so the repo stays tidy and `docs/` stays out of the site. |
| Privacy | Public repo and public data are OK. |
| Repo | The user creates it. No worktree setup. |
| Hosting | Existing site: `DziubanMaciej/yellatcomputers` at yellatcomputers.com (+www). Tutorial in hosting.md. |
| Input | Split on newline, `,` and `;`. Quantities `2 x` / `2x x` / `x 2x` + Polish words 2–10 → note `2x`. Parenthesised notes. All notes merged: `milk (2x, lactose free)`. |
| Matching | Exact match on name/alias, case- and diacritic-insensitive. No plurals, no fuzzy. Missing forms are added as aliases, with help from the `fill-aliases` Claude skill. |
| Recipes | Real requirement. Stored as data. Expansion adds a note `from: <recipe>`. No nesting, no removing ingredients. |
| Unknown | One group at the bottom. Each item gets a note saying why. |
| Site features | Share list via URL (encoding TBD). |
| In-section order | Keep the order typed. |
| Data shape | "Whatever is cleaner" → keyed objects (proposal, to confirm). Single `stores.json`. |
| Coordinates | Abstract units, bounding box defines the canvas. No snap. Rectangles only, no overlap. Extra rects + text on the map. No background image. |
| Product → section | One section per product per store. |
| Product fields | Name + aliases only. |
| Validate | Yes. Before every save, as a test on real data, and as a pre-commit hook. |
| Editor scope | Create store, redraw sections, add products, add aliases, add recipes, assign products, view store, validate. No deleting, no import. |
| Assign flow | Only unassigned products. Pick a section per product. Saves after each answer. |
| View store | Map + products sorted alphabetically, grouped by section. |
| Undo | Git is enough. |
| Tests | Tests for the editor and the site, all in `test/`, one command. `validate()` is reused on the real data and on the editor tests' output. |
| Order of work | Editor scripts + tests first, then the site. |
| Scale | About 5 stores × 15 sections, about 100 products, about 20 recipes. |

## Round 2 (2026-10-20)

| Topic | Decision |
|-------|----------|
| Section order | The order of the sections array in `stores.json`. |
| Editor UI | Hybrid: terminal menu, plus a browser page for drawing and viewing. |
| Share link | `#sklep=…&lista=…` with `encodeURIComponent`. No live URL update. A "Kopiuj link" button copies to the clipboard. Store + list included. |
| Quantities | ✓ `N name`, `Nx`/`xN` before or after the name, `N x name`, Polish words 2–10, and `1`/`1x`. ✗ `name N`. Units don't match unless in parentheses. Digits of any size work. |
| Recipe notes | Note is just the recipe name, e.g. `(spaghetti)`. A recipe with a quantity → no match. Notes on recipe entries aren't supported. |
| Duplicates | Merged into one line, notes combined. |
| Display name | Canonical product name. |
| Unknown wording | *nieznany produkt* / *nieprzypisany w tym sklepie* / *nie ma w tym sklepie*. Header *Nieznane*. |
| Map | Highlight sections with items (others dimmed like decorations), plus a badge. Linked hover between map and list in both directions. No tap-to-scroll. |
| Decorations | Rect + optional label + optional `visible` (false = free-standing text). Dimmer than sections. Can't overlap sections. |
| Edit sections | Redraw a chosen section from scratch (keeps products), add, rename. No remove. |
| Recipe aliases | Yes. |
| fill-aliases | Singular/plural, genitive plural without numbers, true synonyms. No "a bit of" forms, no English. Shows a table with reasons and asks before writing. |
| Git hook | None. Tests are run by hand. |
| CI | Tests gate the deploy. A failure keeps the previous version live. |
| Node | Modern Node (26), no backwards compatibility. |

## Round 3 (2026-10-20)

| Topic | Decision |
|-------|----------|
| Data shape | Objects keyed by name (variant B). |
| Tooling | Minimal `package.json` (`type: module`, `test` script). Keep dependencies to the minimum, and never add one without asking. |
| Site flow | Input view → **Dalej** navigates to the share URL → result view. Kopiuj link copies the current URL. Opening a link shows the result. Supersedes "URL not updated / button generates link". |
| Store default | None, you must pick. No stored state at all. |
| `1x` | Kept if written. `jeden`/`jedna`/`jedno` → `1x`. |
| Merge quantities | Concatenated (`2x, 3x`), not summed. |
| Recipe with notes | No match → Unknown. Suggestions maybe later. |
| Map badge | Count badge. Item names stay in the list, not on the map. |
| Linked highlight | Click/tap toggle on phone and PC. Hover outline hint on PC. |
| Decorations | Editable in E2 like sections. Nothing overlaps anything. |
| Aliases for recipes | E4 and fill-aliases both cover recipes. |
| Editor language | English. |

## Round 4 (2026-10-20)

| Topic | Decision |
|-------|----------|
| Back to editing | Browser Back + an **Edytuj** button (pre-fills from the link). |
| Dalej | Disabled until a store is picked and the list is non-empty. |
| Unknown store in link | Input view, list pre-filled, message *Nie znaleziono sklepu "X"*. |
| Highlight | One at a time. |
| Unrecognised duplicates | Not merged, listed twice. |
| Rect spacing | At least a 1-unit gap between any two rects. Units are abstract and scaled dynamically by every renderer, not tied to pixels. |

## Implementation choices (2026-10-20, Claude, please confirm)

Small choices made while building the editor. Each is easy to change.

| Topic | Choice |
|-------|--------|
| Coordinates | Dragging rounds to whole units. An empty store's drawing area starts at 100×60 units (zoom out for more room). |
| Name characters | Product/recipe names and aliases can't contain `, ; ( )`, because the site parser could never match them (data_layout rule 9). |
| Assign flow | Besides a section number or `0` (not in store), you can type `s` to skip (stays unassigned, asked again next time), `?` to reprint the sections, or `q` to quit. |
| Add commands | Add products/aliases/recipes repeat until you enter an empty name, which makes entering many items quick. Ingredients and aliases-to-extend are typed by name or alias, not picked from a long numbered list. |
| Drawing page | Undo removes rects drawn in the current session only (saved data still can't be deleted). Cancel discards the session. |
| Validate | When formatting is the only problem (after a hand edit), "Validate data" offers to rewrite the files. |
| Initial data | `data/` starts as empty `{}` files; no made-up sample store. |
| End of input | Ctrl+D in the editor exits cleanly (everything is saved after each change anyway). |

## Round 5 (2026-10-21)

| Topic | Decision |
|-------|----------|
| Layout editing | One browser page for create and edit. Drag to draw, then a popup asks for the kind and name (no typing beforehand). Drag to move; corner handles to resize. Replaces the separate "Redraw a section/decoration" options. |
| Collisions | Rects too close together are marked red, and saving is refused until there are none. The same applies to newly drawn rects (Claude's extension of the rule, for consistency). |
| Renaming | Click a rect on the layout page to rename it (decorations: label and box/text-only too). The terminal's "Rename a section" and "Change a decoration label" options were removed as redundant, so "Edit store layout" opens the page directly (Claude's call, following the earlier choice to drop redundant options). |
| Zoom and pan | "More space" button replaced by mouse wheel zoom (around the pointer, no Ctrl needed) and middle- or right-button drag to pan; no context menu over the map. |

## Round 6 (2026-10-21)

| Topic | Decision |
|-------|----------|
| Section ids | Every section has an `id`: a positive integer, unique within its store, assigned automatically (highest id + 1). Existing data was migrated with ids in array order. |
| Assigning products | Store products point to section ids instead of names, and "Assign products" asks for the id. Renaming a section therefore no longer needs to update products (the rename tracking was removed). |
| Showing ids | The editor shows each section's id in the top-left corner of its rect (layout page, View store map) and in group titles. **The site must not show ids.** |

## Round 7 (2026-10-21)

| Topic | Decision |
|-------|----------|
| Assigning products | "Assign products to store" opens a browser page instead of the terminal flow (which was removed): the current product is shown above the map, and clicking a section assigns it. Buttons: Not in this store, Skip, Back (clears the previous answer), Done. Replaces the "Assign flow" implementation choice above. |
| Saving | Every click is saved immediately, as before. Pages can now send messages to the terminal while open (`POST /api/message`). |

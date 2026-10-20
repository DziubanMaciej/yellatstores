# Data layout

All data is in `data/`: three JSON files. The local editor writes them, and the site only reads them.
Content (names, aliases, section names) is in Polish. Field names are in English.

Shape: objects keyed by name (decided). Only store sections and decorations are arrays,
because their order matters. Caveat: if you hand-edit and type the same key twice, `JSON.parse`
silently keeps the last one, and validation can't detect it.

## Name matching

Every comparison of names (product names, aliases, recipe names, user input) goes through
one `normalize()` function:

1. trim, collapse inner whitespace to one space
2. lowercase
3. strip diacritics: `ą→a ć→c ę→e ł→l ń→n ó→o ś→s ź→z ż→z`. Note: `ł` is **not** split
   by Unicode NFD, so it needs an explicit mapping.

No plurals, no inflection, no fuzzy matching. Every form you type must exist as a name or
alias. The `fill-aliases` Claude skill helps with that (see [skills.md](skills.md)).

## `data/products.json`

Store-independent product catalogue. Key = canonical product name (shown on the site).

```json
{
  "makaron": { "aliases": ["makarony", "makaronu"] },
  "passata": { "aliases": [] },
  "pomidory": { "aliases": ["pomidor", "pomidorów"] }
}
```

## `data/recipes.json`

Key = recipe name. A recipe expands into existing products. No nested recipes.

```json
{
  "spaghetti": {
    "aliases": ["spaghetti bolognese", "spaghetti bolońskie"],
    "ingredients": ["pomidory", "passata", "makaron"]
  }
}
```

## `data/stores.json`

Key = store name (shown in the site's dropdown).

```json
{
  "Lidl Główna": {
    "sections": [
      { "name": "Warzywa",  "rect": { "x": 0,  "y": 0, "w": 10, "h": 8 } },
      { "name": "Makarony", "rect": { "x": 12, "y": 0, "w": 4,  "h": 8 } }
    ],
    "decorations": [
      { "rect": { "x": 30, "y": 20, "w": 8, "h": 3 }, "label": "Kasy" },
      { "rect": { "x": 0,  "y": 23, "w": 6, "h": 2 }, "label": "Wejście", "visible": false }
    ],
    "products": {
      "makaron": "Makarony",
      "passata": null,
      "pomidory": "Warzywa"
    }
  }
}
```

### Sections
- An **array**. Its order is the order of section groups in the site's list. The editor appends
  new sections at the end. To reorder, edit the JSON by hand.
- `name` is unique within the store. `rect` is `{x, y, w, h}` in abstract units: top-left origin,
  y grows downwards, `w > 0`, `h > 0`.

### Decorations
Map elements that aren't sections and hold no products: checkouts, entrance, labels.
- `rect` (required), `label` (optional), `visible` (optional, default `true`).
- `visible: false` means the rect isn't drawn and only its label is shown, centred in it. Use this
  for free-standing text.
- Drawn dimmer than sections. On the site, sections with no list items use the same dim style.
- Never overlap anything (see rule 7).

### Products (per store)
`{ productName: sectionName | null }`.

| Entry | Meaning | On the site |
|-------|---------|-------------|
| `"pomidory": "Warzywa"` | In that section | In the "Warzywa" group |
| `"passata": null` | Checked, the store doesn't carry it | Unknown: *nie ma w tym sklepie* |
| key missing | Never assigned | Unknown: *nieprzypisany w tym sklepie* |
| *(input matches nothing)* | | Unknown: *nieznany produkt* |

### Coordinates
Abstract units, no grid, not tied to pixels. Every renderer (site map, editor view, drawing page)
scales them dynamically to the available space. Store size isn't stored. Renderers take the bounding box of all
sections and decorations and fit it to the screen (SVG `viewBox`).

## Integrity rules

`validate(dir)` checks these. It runs as a test on the real `data/`, before every save in the
editor, and on the output of the editor tests.

1. All three files exist and parse. Every value has the shape described above.
2. After normalisation, product names, product aliases, recipe names and recipe aliases are all
   unique together (no alias can mean two things).
3. Every recipe has at least one ingredient. Every ingredient is an existing product, and no ingredient is listed twice.
4. Section names are unique within a store.
5. Every key of a store's `products` is an existing product.
6. Every non-null value of a store's `products` is a section name in that store.
7. Every rect has `w > 0` and `h > 0`. **No two rects in a store overlap or touch**, whether sections,
   decorations, or invisible decorations. Any two rects must be at least **1 unit** apart,
   horizontally or vertically.
8. Files are formatted as the editor writes them: 2-space indent, trailing newline,
   object keys sorted alphabetically, arrays (sections, decorations, aliases, ingredients)
   in their stored order.

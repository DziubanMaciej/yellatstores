---
name: fill-aliases
description: Add missing Polish aliases (inflected forms, synonyms) to YellAtStores products in data/products.json so exact name matching works. Use when the user asks to fill, add, complete or fix aliases, or after new products were added.
---

# fill-aliases

The site matches grocery-list entries to products **exactly**, after `normalize()` (trim,
lowercase, strip Polish diacritics). There is no plural, inflection or fuzzy handling. Aliases
are the only way different forms match.

## Steps

1. Read `docs/data_layout.md` for the current schema, the normalisation rules and the integrity rules.
   It is the source of truth. If it contradicts this file, follow the doc.
2. Read `data/products.json` and `data/recipes.json`. If arguments name specific products or
   recipes, only process those. Otherwise process all products and all recipes.
3. For each product and recipe, work out which aliases are missing. Add **only** these kinds:
   - the singular and plural nominative (`pomidor` / `pomidory`)
   - the genitive plural, as a bare word without numbers (`jajek`, `pomidorów`). These are the
     forms used after counts like `pięć jajek`.
   - **true** synonyms, i.e. words that name the same product in a Polish shop. Not related products:
     `przecier` is **not** `passata`. When in doubt, leave it out.

   Never add:
   - English names
   - "a bit of" genitive singular forms (`trochę mąki` → `mąki`), unless the form is also one of the above
   - variants that differ only by case or diacritics (normalisation already covers them)
   - quantities, numbers or notes
4. **Collision check:** normalise every candidate. Drop it if it equals (normalised) any
   product name or alias, or any recipe name or alias. Never move an alias between products.
5. **Ask before writing.** Show one table:

   | Product / recipe | Existing aliases | Proposed aliases | Why |
   |------------------|------------------|------------------|-----|
   | jajka | jajko | jajek | Genitive plural, e.g. "10 jajek". |
   | spaghetti *(recipe)* | | spaghetti bolońskie | Common Polish name for the dish. |

   - "Why" is at most one sentence.
   - Below the table, list dropped candidates with their collision.
   - Wait for the user to approve, edit or reject (whole table or per row).
6. Write `data/products.json` / `data/recipes.json` back with the project's canonical formatting. Use the editor's
   save function in `scripts/lib/data.js` if it exists; otherwise match the formatting in
   docs/data_layout.md exactly.
7. Run `npm test`. If it fails, fix the problem or revert your change, and report.

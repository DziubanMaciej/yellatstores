# Claude skills

Project skills live in `.claude/skills/`. Claude Code finds them automatically when it runs in
this repo.

| Skill | Purpose |
|-------|---------|
| `fill-aliases` | Proposes missing aliases for products and recipes, asks for approval, then writes them. Exact matching then works for the forms you actually type. |

## fill-aliases

**Why:** the site matches names exactly (case- and diacritic-insensitive) with no plural or
inflection handling. So every form you type, like `pomidor`, `pomidory`, `pomidorów`, `2 jajka`
or `10 jajek`, has to be an alias.

**What it does:**
1. Reads [data_layout.md](data_layout.md) (rules) and `data/*.json`.
2. For each product, proposes missing forms:
   - **Added:** singular/plural nominative (`pomidor`/`pomidory`), genitive plural as a bare
     word (`jajek`, `pomidorów`), and true synonyms only (`przecier` ≠ `passata`).
   - **Not added:** English names, "a bit of" forms (`mąki`), numbers.
3. Drops candidates that collide (after normalisation) with any product or recipe name or alias.
4. **Asks first.** It shows a table (product, existing aliases, proposed aliases, one-sentence
   reason) and waits for approval.
5. Writes the files in canonical formatting and runs `npm test`.

Run it in Claude Code: `/fill-aliases`, or `/fill-aliases makaron passata` to limit it to some products.

# YellAtStores

A personal grocery helper. You type a grocery list (Polish) and pick a store, and you get back the
list grouped by store section plus a store map. A public static site
(`stores.yellatcomputers.com`, GitHub Pages via Actions) reads JSON from `data/`. A local Node
editor (`scripts/`) edits that data.

## Guidelines

- **Simplest thing that works.** This is a tiny private app for one user. Prefer the
  simplest, hassle-free, easy-to-set-up technology. No frameworks, no build step.
- **Keep dependencies to the absolute minimum. Never add a dependency on your own; always ask the
  user first.** Use Node built-ins and the browser platform. `package.json` exists only for
  `"type": "module"` and the test script.
- **English** for code, identifiers, comments, docs, commits and the editor UI. **Polish** for
  the site UI and the data content.
- The site is plain HTML + vanilla JS ES modules + CSS. Logic lives in pure modules in
  `site/lib/` (no DOM), which are shared with the editor and tested in Node.
- The editor must be testable: commands talk to the user only through `ctx.io` / `ctx.browser`,
  and change data only through `ctx.change()` (apply to a copy → validate → save). Tests drive
  commands with `test/helpers/editor.js`. New data rules belong in `scripts/lib/validate.js`,
  not in individual commands.
- `data/` is the single source of truth. Always write it through the editor's save (validate
  first, canonical formatting) so git diffs stay clean.
- Don't add features, options or abstractions that weren't asked for. See the non-goals in
  docs/requirements.md.
- **Don't make design decisions alone.** If something isn't covered by the docs, ask the
  user, with context and trade-offs. Record answers in the docs and in `docs/decisions.md`.

## Commands

| Command | What it does |
|---------|--------------|
| `npm test` | Run all tests: `node --test` on `test/**/*.test.js` |
| `node scripts/edit.js` | Interactive data editor (terminal menu; drawing/viewing opens the browser) |
| `node scripts/serve.js` | Serve the site locally, mirroring the deployed layout *(not implemented yet)* |

Run `npm test` after every change. Only files named `*.test.js` under `test/` are run as tests;
helpers and fixtures in `test/` use other names. No git hooks: the user runs tests by hand, and
CI runs them and only deploys if they pass.

## Layout

| Path | Contents |
|------|----------|
| `data/` | `products.json`, `recipes.json`, `stores.json` |
| `site/` | Deployed site. `site/lib/` holds pure shared logic |
| `scripts/` | Local editor (`edit.js`, `lib/`, browser pages in `web/`), never deployed |
| `test/` | All tests |
| `docs/` | Documentation |
| `.claude/skills/` | Project Claude skills (`fill-aliases`) |

## Docs

| Doc | What's in it |
|-----|--------------|
| [docs/requirements.md](docs/requirements.md) | What the site and editor do, the input syntax, non-goals |
| [docs/data_layout.md](docs/data_layout.md) | JSON schemas, name normalisation, integrity rules |
| [docs/plan.md](docs/plan.md) | File layout, testability design, phased implementation plan |
| [docs/hosting.md](docs/hosting.md) | Tutorial: GitHub Pages + Hostinger DNS for the subdomain |
| [docs/skills.md](docs/skills.md) | Project Claude skills |
| [docs/decisions.md](docs/decisions.md) | Log of decisions made with the user |

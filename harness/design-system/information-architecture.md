# Information Architecture

Owned by `ux-information-architecture`. Reviewed for every new feature during `/new-feature` step 4 and for nav/structure changes during `/pr-review`.

## Principles

- Navigation reflects the user's mental model of the product, not the engineering team's folder structure.
- One way to get to any given screen for the primary journey — avoid redundant paths that fragment usage.
- Naming is consistent across UI, URLs/routes, and code (`docs/context/knowledge-base/glossary.md` is the source of truth for terms).
- Depth over breadth only when it reduces cognitive load — don't bury `demo-critical` actions more than 1-2 clicks from entry.

## Checklist for new features

- [ ] Where does this live in navigation? Does it fit an existing section or need a new one?
- [ ] Does its name match the term used in `docs/context/knowledge-base/glossary.md` and the Epic/Story titles?
- [ ] Is the primary action reachable within 1-2 clicks from the relevant entry point?
- [ ] Does adding this feature make any existing navigation item ambiguous (need renaming)?

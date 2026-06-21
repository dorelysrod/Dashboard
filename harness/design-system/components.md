# Components

`/shared` component conventions. A component goes here only after a 2nd use case (per `ARCHITECTURE.md`).

## Required states

Every interactive component must define, where applicable:

- **Default**
- **Hover / Focus** (focus must be visible — see `a11y.md`)
- **Active/Pressed**
- **Disabled**
- **Loading** (for anything that triggers async work)
- **Error** (for inputs/forms)

## Conventions

- Components are presentational; data fetching/state lives in `logic/` within the owning feature, passed down via props.
- Variants (size, emphasis) are explicit props with a small enum (e.g. `size: 'sm' | 'md' | 'lg'`), not ad-hoc className overrides.
- Every component that renders a list handles populated, empty, and loading list states.
- New components are checked by `ux-design-consistency` against existing `/shared` components before being added — don't create `Button2`.

## Naming

- Component names describe *what they are*, not *where they're used* (`Card`, not `DashboardBox`).
- One component per file; co-locate its tests.

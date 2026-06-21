# Design Principles

The product must read as something a small, exceptional team built with care — closer to Linear, Stripe, Notion, Figma, Vercel, GitHub, Raycast, Arc, or Airbnb than a generic admin-dashboard template. `world-class-product-review` enforces these during `/pr-review`, `/demo-prep`, and `/judge-score`.

## The bar

1. **Clarity over cleverness.** Every screen has one primary action. If a user has to think about what to do next, the design has failed.
2. **Restraint.** No decoration without function. Gradients, shadows, animations, and icons are used only when they communicate state, hierarchy, or affordance — never as default flourish.
3. **Real data or honest empty states.** Never show fabricated metrics ("$1,234 saved!", "98% accuracy") as if real. Use a designed empty state with a clear next action instead.
4. **Consistency via the system, not memory.** Every spacing, type size, and color comes from `typography.md`/`spacing.md` tokens — not eyeballed one-offs.
5. **Every state is designed.** Loading, empty, error, and success states exist for every screen before it's considered done (`ux-user-journey` checks this).
6. **Hierarchy is visual, not just structural.** The most important element on a screen is the most visually prominent one — size, weight, contrast, and position all reinforce it.
7. **Motion has meaning.** Transitions clarify cause-and-effect (this action led to this change) — they don't exist to look "smooth".

## Anti-patterns to reject

- Generic dashboard with 6+ equally-weighted metric cards and no clear primary action
- Unjustified gradient backgrounds or glassmorphism
- Placeholder/lorem-ipsum content left in a "finished" screen
- Multiple competing CTAs of equal visual weight
- Dense forms with no grouping, labels as placeholders only

## How this is enforced

- `world-class-product-review` — runs on every UI PR and during `/demo-prep`/`/judge-score`.
- `ux-design-consistency` — flags hardcoded values vs. design tokens.
- `ux-accessibility` + `testing-accessibility` — accessibility is part of the bar, not separate from it.

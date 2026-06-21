# Typography

A small, deliberate type scale — enough steps for hierarchy, not so many that consistency becomes impossible.

## Scale

| Token | Size | Use |
|---|---|---|
| `text-xs` | 12px / 0.75rem | Captions, metadata, timestamps |
| `text-sm` | 14px / 0.875rem | Secondary text, labels, table cells |
| `text-base` | 16px / 1rem | Body text, default |
| `text-lg` | 18px / 1.125rem | Emphasized body, small headings |
| `text-xl` | 20px / 1.25rem | Section headings |
| `text-2xl` | 24px / 1.5rem | Page headings |
| `text-3xl` | 32px / 2rem | Hero/display headings (use sparingly) |

## Weight

- `font-normal` (400) — body text
- `font-medium` (500) — labels, emphasized body
- `font-semibold` (600) — headings, button text

## Rules

- No font size outside this scale. If a design needs an in-between size, the hierarchy needs rethinking, not a new token.
- Line height: 1.5 for body text, 1.2 for headings.
- One typeface family for UI; a second (optional) for display/marketing headings only if it adds genuine character — not by default.
- `ux-design-consistency` flags any hardcoded `font-size`/`font-weight` not from this scale.

# Spacing

An 8px-based spacing scale (4px for fine adjustments). Consistent spacing is one of the highest-leverage things for "looks expensive".

## Scale

| Token | Value |
|---|---|
| `space-0` | 0 |
| `space-1` | 4px |
| `space-2` | 8px |
| `space-3` | 12px |
| `space-4` | 16px |
| `space-5` | 24px |
| `space-6` | 32px |
| `space-8` | 48px |
| `space-10` | 64px |

## Rules

- Component-internal padding: `space-2`–`space-4`.
- Gaps between related elements (e.g. label and input): `space-1`–`space-2`.
- Gaps between sections: `space-6`–`space-10`.
- Page margins/gutters: at least `space-5` on mobile, `space-8`+ on desktop.
- No arbitrary pixel values (`13px`, `27px`, etc.) — round to the nearest token. `ux-design-consistency` flags violations.
- Generous whitespace is a feature, not wasted space — when in doubt, add more.

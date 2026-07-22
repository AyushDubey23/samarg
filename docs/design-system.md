# SAMARG Design System

This document outlines the visual guidelines, typography, grids, layout scales, and animations for SAMARG v2.

---

## 1. Color Palette (Custom HSL System)

All interface components derive their coloring from semantic HSL custom properties.

| CSS Token | Value | Semantic Use |
| :--- | :--- | :--- |
| `--bg-dark` | `hsl(140, 45%, 6%)` | Ground canvas / primary viewport background |
| `--bg-medium` | `hsl(140, 35%, 11%)` | Pitch panel / core card background |
| `--bg-light` | `hsl(140, 25%, 17%)` | Modals / dropdown listings / active inputs |
| `--primary` | `hsl(140, 50%, 42%)` | Pitch lawn highlight / success indicators |
| `--willow-tan` | `hsl(35, 38%, 52%)` | Cricket wood accent / warning alerts |
| `--accent-gold` | `hsl(45, 90%, 52%)` | Trophy badges / Captain highlights |
| `--accent-red` | `hsl(355, 75%, 55%)` | Wicket triggers / Pace alerts |

---

## 2. Spacing Scale

We use an 8px modular grid system to ensure visual consistency:

- **4px (`0.25rem`)**: Micro-spacing (inner badges, padding between name and chip)
- **8px (`0.5rem`)**: Small gaps (list items, button inner paddings)
- **16px (`1.0rem`)**: Medium blocks (card paddings, grid gutters)
- **24px (`1.5rem`)**: Large gaps (section margins, component headers)
- **32px (`2.0rem`)**: Layout headers (page titles, section spacing)

---

## 3. Typography Scale

Primary sans-serif typeface is **Inter** for clean readability, paired with **JetBrains Mono** / tabular numerals for dynamic scoreboard stats.

- **Display Title**: `2.5rem` / line-height `1.1` (Bold, uppercase)
- **Header 1**: `1.75rem` / line-height `1.2` (Semi-bold, uppercase)
- **Header 2**: `1.25rem` / line-height `1.3` (Medium, uppercase)
- **Body**: `0.95rem` / line-height `1.5` (Regular, standard readability)
- **Caption / Status**: `0.75rem` / line-height `1.4` (Condensed, tabular numbers)

---

## 4. UI Board Structure (Cricketing Ground Grid)

The Playing XI board mimics a stadium layout:
- **Pitch Backdrop**: Concentration oval rings representing infield/outfield boundaries, textured with an SVG grass pattern.
- **Player Cards**: Circular avatar elements grouped by centered uppercase role headers (OPENERS, TOP-ORDER, MIDDLE-ORDER, WICKETKEEPER, ALL-ROUNDERS, SPINNERS, PACERS).
- **Tab Selection**: Horizontal tab icons allowing users to pivot between viewing their roster and their opponents' rosters live.

---

## 5. Animation Standards

Interactive elements trigger transitions based on semantic speed:
- **Fast (`--transition-fast` - 150ms)**: Hover scales, button actions, click triggers.
- **Medium (`--transition-medium` - 250ms)**: Drawer expansions, tab toggles, modal slides.
- **Slow (`--transition-slow` - 400ms)**: Slot-machine rolls, card flying placements, match highlights pulses.
- **Accessibility**: All transition variables default to `0s` if `@media (prefers-reduced-motion: reduce)` is matching.

---
name: Institutional POS & Billing System
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45464d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#0051d5'
  on-secondary: '#ffffff'
  secondary-container: '#316bf3'
  on-secondary-container: '#fefcff'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#002113'
  on-tertiary-container: '#009668'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#b4c5ff'
  on-secondary-fixed: '#00174b'
  on-secondary-fixed-variant: '#003ea8'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 2.25rem
    fontWeight: '700'
    lineHeight: 2.75rem
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Manrope
    fontSize: 1.75rem
    fontWeight: '700'
    lineHeight: 2.25rem
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 1.375rem
    fontWeight: '700'
    lineHeight: 1.75rem
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Manrope
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.75rem
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Manrope
    fontSize: 1rem
    fontWeight: '600'
    lineHeight: 1.5rem
    letterSpacing: -0.01em
  metric-stat:
    fontFamily: Manrope
    fontSize: 1.875rem
    fontWeight: '700'
    lineHeight: 2.25rem
    letterSpacing: -0.02em
  body-lg:
    fontFamily: Public Sans
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: 1.625rem
  body-md:
    fontFamily: Public Sans
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.375rem
  body-sm:
    fontFamily: Public Sans
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: 1.125rem
  label-md:
    fontFamily: Public Sans
    fontSize: 0.875rem
    fontWeight: '600'
    lineHeight: 1.25rem
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Public Sans
    fontSize: 0.75rem
    fontWeight: '600'
    lineHeight: 1rem
    letterSpacing: 0.025em
  table-cell:
    fontFamily: Public Sans
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.25rem
  table-header:
    fontFamily: Public Sans
    fontSize: 0.75rem
    fontWeight: '700'
    lineHeight: 1rem
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  margin: 2rem
  margin-sm: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
---

## Brand & Style

The visual identity embodies an institutional, high-precision SaaS aesthetic tailored for educational environments and foundational enterprise billing. It rejects frivolous ornamentation in favor of crisp administrative clarity, deliberate typographic hierarchy, and structural rigor. The emotional posture is calm, authoritative, and deeply reliable—providing students, educators, and enterprise apprentices with an interface that behaves like mission-critical corporate infrastructure while remaining uncluttered and directly legible.

The aesthetic fuses modern institutional minimalism with functional administrative layout conventions. High data density is managed through deliberate whitespace distribution, strict 8-point baseline pacing, and muted slate-neutral backdrops that eliminate visual fatigue during sustained inventory audits and register shifts.

## Colors

The palette is anchored by deep slate navy (`#0F172A`), providing an unyielding foundation for structural chrome, top-level headings, and primary transactional triggers. Primary accents draw from active corporate cobalt (`#2563EB`) to signal focused states and primary interactive utilities without jarring contrast transitions. 

Surface architecture utilizes a layered neutral spectrum: canvas base starts on cool slate-tinted off-white (`#F8FAFC`), passing through container fills (`#FFFFFF`) with distinct borders (`#E2E8F0`).

Functional status accents follow disciplined semantic tolerances:
- **Pending/Processing (`PENDIENTE`):** Warm amber (`#D97706`) anchored over subtle amber-slate tint (`#FEF3C7`).
- **Settled/Paid (`PAGADA`):** Muted emerald (`#059669`) structured over crisp mint tint (`#D1FAE5`).
- **Voided/Cancelled (`ANULADA`):** Controlled crimson (`#DC2626`) set over restrained rose wash (`#FEE2E2`).

## Typography

The typographic system utilizes a dual-engine architecture:
- **Headlines & Executive Metrics (Manrope):** Geometric precision, neutral aperture, and authoritative presence for financial totals, dashboard summaries, and section headers.
- **Body, Inputs & High-Density Tables (Public Sans):** A strictly engineered institutional workhorse that guarantees distinction between similar glyphs (0 vs O, 1 vs l), essential for barcode cross-checks, SKU lookup, and ledger row parsing.

All numerical tables, receipt amounts, tax breakdowns, and SKU references must be rendered using tabular lining figures (`font-variant-numeric: tabular-nums`) to ensure strict vertical column alignment across records.

## Layout & Spacing

The layout runs on a responsive 12-column fluid grid system pinned inside a standardized maximum container width of 1440px for desktop operations, reflowing to single-column stacking for tablet and mobile register checkpoints.

- **Desktop (1024px+):** 12 columns with `24px` (`1.5rem`) gutters and `32px` (`2rem`) margins. Multi-pane operational views (e.g., live register cart alongside stock selector) use a permanent 8:4 column split.
- **Tablet (768px - 1023px):** 8 columns with `16px` (`1rem`) gutters and `24px` (`1.5rem`) margins. Cart collates into a docked sliding tray.
- **Mobile (< 768px):** 4 columns with `16px` (`1rem`) gutters and `16px` (`1rem`) margins. Tables shift to vertical stack cards.

Vertical rhythm adheres strictly to 4px and 8px intervals. Dense operational contexts (e.g., line-item rows, batch invoice lists) employ compact padding (`space-xs` and `space-sm`), while dashboard analytical cards use spacious breathing room (`space-lg` and `space-xl`).

## Elevation & Depth

Visual hierarchy is articulated using low-contrast hairline borders paired with subtle ambient diffusion. Heavy dropshadows are forbidden to maintain an uncluttered administrative surface.

- **Level 0 (Base Canvas):** Background tone (`#F8FAFC`), entirely flat.
- **Level 1 (Structural Cards & Tables):** Surface white (`#FFFFFF`) bound by a 1px border (`#E2E8F0`) with a quiet ambient shadow: `0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)`.
- **Level 2 (Dropdowns, Popovers & Sub-menus):** Elevated surface with reinforced outline (`#CBD5E1`) and directional containment shadow: `0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.05)`.
- **Level 3 (Modal Dialogs & Confirmation Drawers):** High-priority focus layer backed by a 40% opacity slate-navy wash backdrop (`#0F172A66`). Elevation: `0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.06)`.

## Shapes

The design system implements a controlled shape scale based on roundedness level `2`. This establishes an equilibrium between classic institutional square-cornered forms and modern ergonomics:

- **Base Components (Inputs, Buttons, Badges, Table Rows):** Standard radius of `0.5rem` (`8px`).
- **Cards & Enclosures (`rounded-lg`):** Master bounding radius of `1rem` (`16px`) for KPI tiles, POS cash register cards, and invoice layout frames.
- **Modal Containers & Sliding Sheets (`rounded-xl`):** `1.5rem` (`24px`) for elevated surfaces.
- **Interactive Micro-controls & Status Pills:** Pill shape allowed exclusively on status indicators and contextual role chips.

## Components

### Buttons
- **Primary:** Solid `#0F172A` background, white label text, `0.5rem` radius, 8px/16px padding. Active state darkens to `#020617`. Focus emits an accessible 2px offset ring in `#2563EB`.
- **Secondary / Action:** White background with 1px border in `#CBD5E1`, text `#0F172A`. Hover transitions background to `#F1F5F9`.
- **Destructive:** Solid `#DC2626` background for final deletion or invoice voiding actions (`ANULAR FACTURA`).

### Form Inputs & Selectors
- Background `#FFFFFF`, 1px border `#CBD5E1`, internal padding 8px 12px.
- Focus state explicitly outlines with a 1px border `#2563EB` and a 3px soft outer ring `rgba(37, 99, 235, 0.15)`.
- Numeric input fields for quantities and currency units display prefixed or suffixed invariant currency glyphs (`$ / USD`) in `#64748B`.

### Status Badges
Rendered at `font-size: 0.75rem`, all caps, bold weight, with an internal padding of 2px 8px and a full-pill radius:
- `PAGADA`: Background `#D1FAE5`, text `#065F46`, border 1px solid `#A7F3D0`.
- `PENDIENTE`: Background `#FEF3C7`, text `#92400E`, border 1px solid `#FDE68A`.
- `ANULADA`: Background `#FEE2E2`, text `#991B1B`, border 1px solid `#FECACA`.

### Data Tables & Ledger Grids
- **Header:** Background `#F8FAFC`, uppercase Public Sans `table-header` typography, text `#475569`, border-bottom 2px solid `#E2E8F0`.
- **Rows:** Alternating subtle hover states (`#F8FAFC`), border-bottom 1px solid `#F1F5F9`, vertical cell padding 12px, tabular number formatting for monetary figures and stock tallies.

### Metric / KPI Cards
- White surface base, `1rem` radius, framed with 1px `#E2E8F0`.
- Includes an upper category caption in uppercase Public Sans, a centered Manrope `metric-stat` display value, and a bottom delta tag (e.g., green positive percentage or amber stock warning threshold).

### POS Quick-Register Strip
- Dual-column utility: Left pane hosts lightning-search SKU inputs and item grid; right pane anchors the running invoice ticket with real-time tax calculation (Subtotal, IVA, Total) rendered in prominent Manrope bold typography.
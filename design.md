---
name: LogiRest Design System
description: Operational Elegance for High-Integrity Kitchen Store Management.
colors:
  primary: "#CAAE85"
  primary-container: "#715b38"
  secondary: "#5c5f5e"
  tertiary: "#535f76"
  background: "#F9FAFB"
  foreground: "#1A1A1A"
  surface-lowest: "#ffffff"
  surface-low: "#f9f2ed"
  surface-high: "#eee7e2"
  surface-highest: "#e8e1dc"
  operational-cyan: "#CAAE85"
  operational-red: "#ba1a1a"
  midnight-ledger: "#121212"
typography:
  display:
    fontFamily: "Be Vietnam Pro, Tajawal, sans-serif"
    fontSize: "2rem"
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: "IBM Plex Sans Arabic, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "IBM Plex Sans Arabic, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    letterSpacing: "0.04em"
rounded:
  lg: "16px"
  md: "14px"
  sm: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.lg}"
    padding: "10px 24px"
  card:
    backgroundColor: "{colors.surface-lowest}"
    rounded: "{rounded.lg}"
    padding: "16px"
  input:
    backgroundColor: "{colors.surface-low}"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
---

# Design System: LogiRest

## 1. Overview

**Creative North Star: "The Culinary Architect"**

LogiRest's visual identity is rooted in the philosophy of **Operational Elegance**. It captures the meticulous precision of a world-class Michelin-star kitchen—where every tool has its place, and every movement is intentional. The system prioritizes high-density data legibility and operational speed over decorative flourishes, favoring a "flush" hardware-integrated look that feels like part of the professional kitchen environment.

**Key Characteristics:**
- **Tonal Depth**: Boundaries are established through background color shifts between surface tiers, not borders.
- **RTL-First Integrity**: Visual weight and navigation eye-flow are optimized for Arabic speakers first.
- **Authoritative Density**: High data density without cognitive overload, achieved through clear typographic hierarchy.
- **Zero-Line Discipline**: 1px solid borders are strictly prohibited for sectioning.

## 2. Colors

The palette is anchored by the deep, authoritative tones of professional store management, punctuated by precision-focused action colors.

### Primary
- **Luxury Gold (#CAAE85)**: The primary brand anchor. Used for core navigation, primary actions, and brand identity. It conveys calm authority, warmth, and high status.

### Secondary
- **Nocturne Slate (#121212)**: Used for deep surface backgrounds (especially in dark mode) and high-integrity header regions. It represents the "immutability" of the system.

### Tertiary
- **Bronze Steel (#535f76)**: Used for muted classifications, inactive categories, and auxiliary elements.

### Neutral
- **Base Surface (#F9FAFB)**: The overall application background, providing a clean, low-strain canvas.
- **Surface Container Low (#f9f2ed)**: Used for secondary groupings and sidebars to provide subtle distinction without lines.
- **Surface Container Lowest (#ffffff)**: Used for primary cards and data tables to maximize contrast and "pop" the focus data.

### Named Rules
**The No-Line Rule.** 1px solid borders are strictly prohibited for sectioning. Boundaries are established exclusively through background color shifts between the Surface Tiers.

**The Rare Accent Rule.** The primary accent colors are used on ≤10% of any given screen. Their rarity ensures that when a color appears, it carries operational meaning.

## 3. Typography

LogiRest uses a dual-typeface strategy to balance architectural strength with data legibility.

**Display Font:** Be Vietnam Pro / Tajawal (with sans-serif fallback)
**Body Font:** IBM Plex Sans Arabic (with sans-serif fallback)

**Character:** Be Vietnam Pro and Tajawal provide a geometric, authoritative feel for headlines and large numbers. IBM Plex Sans Arabic offers exceptional clarity for high-density inventory data, especially in the technical context of kitchen store management.

### Hierarchy
- **Display** (600, 2rem, 1.2): Used for primary page titles and high-impact dashboard numbers.
- **Headline** (600, 1.25rem, 1.3): Used for sub-sections and major card titles.
- **Title** (600, 1rem, 1.4): Used for smaller group headers and secondary navigation labels.
- **Body** (400, 0.875rem, 1.7): The primary workhorse for all data entry, tables, and descriptions. Max line length capped at 75ch.
- **Label** (500, 0.75rem, 0.04em): Used for metadata, table headers (uppercase in EN), and status indicators.

## 4. Elevation

LogiRest rejects the "floating card" aesthetic in favor of **Tonal Stacking**. Depth is communicated through the physical stacking of color tiers, creating a solid, grounded feel.

### Shadow Vocabulary
- **Ambient Glow** (`box-shadow: 0 0 24px 0 rgba(24, 28, 32, 0.04)`): A whisper-soft diffused shadow used sparingly for floating elements like popovers or tooltips.

### Named Rules
**The Flush Surface Rule.** Components do not "float" with heavy shadows. They are "inset" or "overlaid" through background contrast, mimicking the precision-fit panels of high-end kitchen equipment.

## 5. Components

### Buttons
- **Shape:** Rounded (16px)
- **Primary:** High-contrast Luxury Gold with a subtle gradient to Primary Container. Used for "Confirm" or "Commit" actions.
- **Hover / Focus:** Subtle scale reduction (0.99) and opacity shift (0.9). Focus uses a high-contrast ring with offset.

### Cards / Containers
- **Corner Style:** Rounded (16px)
- **Background:** Surface Container Lowest (#ffffff) against Base Surface.
- **Shadow Strategy:** Ambient shadow (4%) for very subtle separation if tonal contrast is insufficient.

### Inputs / Fields
- **Style:** Background-filled (Surface Container Low) with no border.
- **Focus:** Internal background glow and border-color shift to Primary.
- **Scan-Input:** Specific styling for barcode-friendly fields with distinct "ready-to-scan" active states.

### Data Tables
- **Invisible Columns:** Vertical dividers are forbidden. Structure is created through the alignment of Arabic text and intentional whitespace.
- **Header:** Label Small typography with 60% opacity for maximum "data-primary" focus.

## 6. Do's and Don'ts

### Do:
- **Do** use tonal backgrounds to separate functional groups.
- **Do** anchor the visual weight at the top right for RTL eye-flow.
- **Do** use Tajawal exclusively for architectural headlines and large metrics.
- **Do** prioritize IBM Plex Sans Arabic for all high-density data entry and table content.

### Don't:
- **Don't** use 1px solid borders for sectioning; this is a strict violation of Operational Elegance.
- **Don't** use neon gradients or heavy drop shadows (Material Design clichés).
- **Don't** use 100% black text; use Tonal Depth (Midnight Ledger) for high-contrast text.
- **Don't** use decorative animations that delay the visibility of inventory data.
- **Don't** use side-stripe borders (border-left/right > 1px) as colored accents on cards.
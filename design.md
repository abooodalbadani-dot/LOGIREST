# Design System Strategy: LogiRest

## 1. Overview & Creative North Star
The "LogiRest" design system is a high-performance framework engineered for the high-stakes environment of restaurant inventory management. It moves beyond the clinical coldness of standard enterprise software to create an experience of **"Operational Elegance."** 

Our Creative North Star is **The Precision Ledger**. Much like a Michelin-star kitchen, the UI must be organized, spotless, and hyper-functional. We break the "template" look of Material Design 3 by replacing rigid grid lines with **Tonal Architecture**. By using varying depths of surface colors and intentional RTL asymmetry, we guide the eye toward critical data points—stock levels, expiration dates, and procurement needs—without the visual noise of traditional borders.

---

2. Colors & Surface Philosophy
The palette is rooted in deep professional teals and crisp blues, conveying authority and calm. 

### The "No-Line" Rule
To achieve a premium, editorial feel, **1px solid borders are strictly prohibited for sectioning.** Boundaries must be defined through background color shifts. For example, a data table (Surface Container Lowest) should sit atop a Surface background. This creates a "flush" look that feels integrated into the hardware.

### Surface Hierarchy & Nesting
Depth is achieved through the physical stacking of tiers. 
- **Base Layer:** `surface` (#f7f9ff) for the overall application background.
- **Sectioning:** Use `surface_container_low` (#f1f4fa) for secondary sidebars or grouping elements.
- **Actionable Content:** Use `surface_container_lowest` (#ffffff) for primary cards and data tables to make them pop against the background.

### The "Glass & Gradient" Rule
For floating elements like "Add New Inventory" modals or quick-action FABs, utilize **Glassmorphism**. Use a semi-transparent `surface_container` with a `backdrop-blur` of 12px. To provide "visual soul," apply a subtle linear gradient to primary buttons, transitioning from `primary` (#004d64) to `primary_container` (#006684) at a 135-degree angle.

---

3. Typography
We use **IBM Plex Sans Arabic** for its mathematical precision and excellent legibility in high-density data environments.

- **Display & Headlines:** Use `headline-lg` (2rem) for dashboard summaries. These should feel like a newspaper headline—bold and authoritative.
- **The Data Scale:** For the inventory tables, the `body-md` (0.875rem) is our workhorse. 
- **Editorial Contrast:** Pair `title-sm` (1rem) in `primary` color for section headers with `label-sm` (0.6875rem) in `on_surface_variant` for metadata. This "Big/Small" contrast creates a clear hierarchy that standard M3 layouts often lack.

---

4. Elevation & Depth

### The Layering Principle
Avoid drop shadows for standard UI components. Instead, "stack" tokens. A `surface_container_high` card placed on a `surface` background provides all the "lift" necessary.

### Ambient Shadows
When a "floating" effect is required (e.g., a critical low-stock alert), use an **Ambient Shadow**:
- **Color:** `on_surface` (#181c20) at 6% opacity.
- **Blur:** 24px.
- **Spread:** 0px.
This mimics natural light reflecting off a polished kitchen surface rather than a digital "glow."

### The "Ghost Border" Fallback
In high-density tables where distinction is mandatory, use a **Ghost Border**: The `outline_variant` token at **15% opacity**. This provides a hint of structure without interrupting the visual flow of the RTL text.

---

5. Components

### High-Density Data Tables
- **Rule:** Forbid horizontal divider lines. 
- **Styling:** Use alternating row fills using `surface_container_low` and `surface_container_lowest`. 
- **RTL Alignment:** Ensure the first column (Item Name) has a generous 24px right-margin to anchor the eye.

### Input Fields
- **Styling:** Use the "Filled" M3 variant but remove the bottom stroke. 
- **Visuals:** Use `surface_container_highest` as the field background. On focus, transition the background to `primary_fixed_dim` with a 10% opacity to create a subtle "glow" within the field.

### Status Chips
- **Success (In Stock):** `tertiary_container` text on `tertiary_fixed_dim` background. 
- **Error (Out of Stock):** `on_error_container` text on `error_container` background.
- **Visual Style:** Use `full` (9999px) roundedness for chips to contrast against the `md` (0.375rem) roundedness of the main containers.

### Inventory Quick-Actions (Custom Component)
A floating, semi-transparent bar at the bottom of the screen using Glassmorphism. It houses "Scan Barcode," "Print Labels," and "Bulk Edit," utilizing `primary` for the background and `on_primary` for icons.

---

6. Do's and Don'ts

### Do
- **Do** prioritize RTL flow. The "visual weight" should start from the top right.
- **Do** use `primary_fixed` for active states in navigation to provide a soft, professional highlight.
- **Do** use `Tajawal` for large numeric displays in dashboards to give them a modern, architectural feel.

### Don'ts
- **Don't** use 100% black text. Always use `on_surface` (#181c20) to maintain tonal depth.
- **Don't** use standard M3 "Elevated Cards" with heavy shadows; they clutter the dense inventory view.
- **Don't** use vertical dividers between table columns. Let the alignment of the Arabic text create the "invisible columns."
- **Don't** ignore the Dark Mode transition; ensure `inverse_surface` is used for high-contrast messaging to maintain readability in low-light kitchen prep areas.
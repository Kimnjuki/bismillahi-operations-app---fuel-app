---
name: Fuelr Enterprise
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#d6c4ac'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#9e8e78'
  outline-variant: '#514532'
  surface-tint: '#ffba38'
  primary: '#ffd79b'
  on-primary: '#432c00'
  primary-container: '#ffb300'
  on-primary-container: '#6b4900'
  inverse-primary: '#7e5700'
  secondary: '#d7ffc5'
  on-secondary: '#053900'
  secondary-container: '#2ff801'
  on-secondary-container: '#0f6d00'
  tertiary: '#dfdddc'
  on-tertiary: '#303030'
  tertiary-container: '#c3c1c1'
  on-tertiary-container: '#4f4f4f'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdeac'
  primary-fixed-dim: '#ffba38'
  on-primary-fixed: '#281900'
  on-primary-fixed-variant: '#604100'
  secondary-fixed: '#79ff5b'
  secondary-fixed-dim: '#2ae500'
  on-secondary-fixed: '#022100'
  on-secondary-fixed-variant: '#095300'
  tertiary-fixed: '#e4e2e1'
  tertiary-fixed-dim: '#c8c6c6'
  on-tertiary-fixed: '#1b1c1c'
  on-tertiary-fixed-variant: '#474747'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 32px
  xl: 48px
  margin-mobile: 20px
  gutter-mobile: 12px
---

## Brand & Style

The design system for Fuelr is engineered for high-stakes enterprise energy and logistics management. The brand personality is **authoritative, high-precision, and hyper-reliable**. It targets B2B decision-makers and field operators who require immediate clarity in complex data environments.

The visual style is a fusion of **Corporate Modern** and **High-Contrast Precision**. It leverages a "Dark Mode First" philosophy to reduce eye strain during extended use and to make critical status indicators pop with mathematical urgency. The aesthetic avoids unnecessary flourishes, focusing instead on structural integrity, clear information hierarchy, and a premium "instrument cluster" feel that evokes the dashboard of a high-end industrial machine.

## Colors

This design system utilizes a high-contrast palette optimized for dark environments.

- **Primary (Electric Amber):** Reserved for primary actions, critical data points, and branding elements. It represents energy and active precision.
- **Secondary (Neon Green):** Used exclusively for "Go" states, successful transactions, and positive status indicators.
- **Background (Matte Black):** A deep `#121212` charcoal creates the foundation, providing a sophisticated, low-glare canvas.
- **Surface Tiers:** Use `#1E1E1E` for primary cards and `#2E2E2E` for elevated interactive elements to create subtle depth without breaking the dark aesthetic.

## Typography

The typography system relies on **Inter** for its exceptional legibility and systematic feel. 

- **Headlines:** Use Bold (700) or Semi-Bold (600) weights with slight negative letter spacing to create a compact, "heavy-duty" appearance.
- **Body Text:** Standardized at 16px for optimal readability in professional contexts. Use a "Regular" weight (400) for general content and "Medium" (500) for emphasis.
- **Labels:** Small labels and captions should use uppercase styling with increased letter spacing to differentiate them from body copy and emphasize their role as metadata or utility text.

## Layout & Spacing

The design system employs a **4px baseline grid** to ensure mathematical precision in element alignment. 

- **Mobile Layout:** Use a fluid column system (typically 4 columns) with 20px side margins to prevent content from feeling cramped on smaller devices.
- **Rhythm:** Vertical spacing between cards and major sections should default to `md` (24px) to maintain a spacious, premium feel. 
- **Touch Targets:** Ensure all interactive elements maintain a minimum hit area of 48x48px, even if the visual representation is smaller.

## Elevation & Depth

Depth is conveyed through **Tonal Layering** rather than heavy shadows, maintaining a sleek, modern enterprise feel.

- **Level 0 (Base):** `#121212` - The canvas.
- **Level 1 (Cards/Surface):** `#1E1E1E` - Standard containers. Use a 1px solid border of `#2E2E2E` to define edges clearly against the background.
- **Level 2 (Active/Overlays):** `#2A2A2A` - Used for modals or high-priority hovered states.
- **Shadows:** When necessary for floating elements (like FABs or sticky headers), use highly diffused, low-opacity black shadows (`offset: 0 8px, blur: 24px, opacity: 0.5`) to avoid a "muddy" appearance on the dark background.

## Shapes

The shape language balances industrial rigidity with modern accessibility. 

- **Primary Elements:** Buttons and main containers use a **0.5rem (8px)** radius to feel approachable yet structured.
- **Large Containers:** Full-width cards or bottom sheets may scale up to **1rem (16px)** for a softer, more premium "app-like" experience.
- **Data Indicators:** Small badges or status dots remain circular (fully rounded) to contrast against the predominantly rectangular layout.

## Components

- **Buttons:** Primary buttons are full-width on mobile, filled with the Electric Amber (`#FFB300`) and use black text for maximum contrast. Secondary buttons use a ghost style with a 1px amber border.
- **Cards:** Minimalist with a `#1E1E1E` fill. Borders are mandatory for definition; use a 1px stroke of `#2E2E2E`. No heavy shadows unless the card is being dragged or elevated in a modal.
- **Input Fields:** Use a "filled" style with a darker background than the card surface. The active state is indicated by a 2px bottom border or a full-focus ring in Electric Amber.
- **Pagination:** Minimalist dots. The active dot is Electric Amber and slightly elongated (pill-shaped), while inactive dots are muted gray.
- **Chips/Status:** Use the Neon Green (`#39FF14`) for "Active" or "Complete" states. Use a low-opacity background tint of the status color with a high-opacity text color for better integration.
- **Lists:** Clean dividers using `#2E2E2E` at 1px height. Ensure ample vertical padding (16px+) for clear separation of enterprise data rows.
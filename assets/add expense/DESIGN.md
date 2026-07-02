---
name: Fuelr
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
  on-surface-variant: '#d4c5ab'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#9c8f78'
  outline-variant: '#504532'
  surface-tint: '#fbbc00'
  primary: '#ffe2ab'
  on-primary: '#402d00'
  primary-container: '#ffbf00'
  on-primary-container: '#6d5000'
  inverse-primary: '#795900'
  secondary: '#d7ffc5'
  on-secondary: '#053900'
  secondary-container: '#2ff801'
  on-secondary-container: '#0f6d00'
  tertiary: '#e8e5e4'
  on-tertiary: '#313030'
  tertiary-container: '#cbc9c8'
  on-tertiary-container: '#555454'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdfa0'
  primary-fixed-dim: '#fbbc00'
  on-primary-fixed: '#261a00'
  on-primary-fixed-variant: '#5c4300'
  secondary-fixed: '#79ff5b'
  secondary-fixed-dim: '#2ae500'
  on-secondary-fixed: '#022100'
  on-secondary-fixed-variant: '#095300'
  tertiary-fixed: '#e5e2e1'
  tertiary-fixed-dim: '#c8c6c5'
  on-tertiary-fixed: '#1c1b1b'
  on-tertiary-fixed-variant: '#474746'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  stat-value:
    fontFamily: JetBrains Mono
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 32px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  container-max-width: 480px
  edge-margin: 1rem
  gutter: 0.75rem
  touch-target-min: 48px
  stack-gap: 1rem
---

## Brand & Style
The design system is engineered for the high-stakes, high-glare environment of fuel station management. It prioritizes utility, rapid data recognition, and physical durability. The brand personality is "Industrial Tech"—combining the ruggedness of heavy machinery with the precision of modern data analytics. 

The aesthetic is a hybrid of **Modern Minimalism** and **High-Contrast Utility**. By utilizing a matte black foundation with vibrant, luminous accents, the UI ensures maximum legibility under direct sunlight and reduced eye strain during night shifts. The interface avoids decorative flourishes, favoring structured data density and clear actionable states.

## Colors
The palette is rooted in a deep charcoal/matte black foundation to provide a "true-black" canvas that eliminates light bleed. 

- **Primary (Electric Amber):** Used for critical calls to action, active fuel pump indicators, and primary navigation. Its high visibility mimics industrial safety signage.
- **Secondary (Neon Green):** Reserved for "Safe" or "Ready" states, successful transactions, and positive inventory levels.
- **Surfaces:** Containers use low-opacity charcoal grays (#1A1A1A) to differentiate from the background without creating harsh contrast jumps. 
- **Feedback:** Use #FF4444 for alerts and critical fuel leaks or errors.

## Typography
This design system utilizes **Inter** for its exceptional legibility and neutral, professional tone. For data-heavy components like pump IDs, meter readings, and timestamps, **JetBrains Mono** is employed to provide a technical, "instrument-panel" feel that ensures individual characters are distinct.

- **Scale:** On mobile, avoid font sizes below 12px to ensure outdoor readability.
- **Emphasis:** Use Semibold (600) for primary interactions and Medium (500) for secondary metadata. 
- **Data:** Statistical values (liters, currency) should always use the monospaced font to prevent layout shifting during real-time updates.

## Layout & Spacing
The layout is **Mobile-First**, optimized for a maximum width of 480px. Content is organized in a single-column vertical stack to facilitate one-handed operation.

- **Grid:** A 4-column fluid grid system with 12px gutters.
- **Touch Targets:** All interactive elements maintain a minimum 48px height. 
- **Sticky Actions:** Primary actions (e.g., "Start Pump," "Finalize Sale") are housed in a sticky bottom bar with a background blur (Backdrop Filter) to ensure they remain accessible regardless of scroll position.
- **Hierarchy:** Use 24px spacing between distinct sections and 8px spacing between elements within a card.

## Elevation & Depth
In this dark-mode system, depth is communicated through **Tonal Layering** and **Subtle Outlines** rather than heavy shadows, which can appear muddy on matte black backgrounds.

- **Level 0 (Background):** #121212 (The base).
- **Level 1 (Cards/Containers):** #1A1A1A with a 1px solid border of #2A2A2A.
- **Level 2 (Modals/Overlays):** #222222 with a primary-colored top-border (2px) to denote activity.
- **Active State:** When an element is pressed, use a subtle inner glow of the primary color (Amber) to simulate a physical backlit button.

## Shapes
The shape language is **Soft-Industrial**. We use 4px (0.25rem) corners for most UI elements to maintain a precise, engineered appearance.

- **Buttons:** 4px radius for standard actions; 8px for large primary call-to-actions.
- **Cards:** 8px (rounded-lg) to create a clear container boundary.
- **Inputs:** 4px radius with a defined 1px stroke.
- **Status Pills:** Fully rounded (pill-shaped) to distinguish them from interactive buttons.

## Components
- **Cards:** Low-opacity charcoal containers. Title is Label-Caps. Content is Body-MD. Borders are mandatory (#2A2A2A) to ensure separation in high-glare environments.
- **Floating Label Inputs:** On focus, the border shifts to Primary Amber (#FFBF00) and the label shrinks to the top-left using JetBrains Mono for a technical feel.
- **Segmented Pickers:** Used for toggling between "Diesel," "Unleaded," and "Premium." The active segment uses a solid Amber fill with black text.
- **Action Bars:** Sticky to the bottom of the viewport. Must use a heavy backdrop blur (20px) and contain no more than two buttons.
- **Status Indicators:** Small circular pips next to pump numbers. Green for "Available," Amber for "In Use," Red for "Error/Empty."
- **Lists:** Clean rows separated by 1px dividers (#2A2A2A). Use chevron-right icons to indicate drill-down capability.
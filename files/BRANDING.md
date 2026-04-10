# Bloo Branding & Design System

This file defines Bloo's visual identity. All rendered boards, the HTML shell, and any UI must follow this system.

---

## Brand Identity

**Name:** Bloo
**Tagline:** "Blueprint your code"
**Personality:** Clean, modern, developer-friendly. Dark-first. Emerald & mint glow aesthetic.

---

## Color System

Bloo uses an emerald-to-mint color system derived from the brand palette. All colors use HSL format.

### Dark Theme (Default)

```css
/* Backgrounds */
--background:           hsl(160 15% 7%);     /* Main canvas */
--background-secondary: hsl(160 10% 10%);    /* Cards, sections */
--background-tertiary:  hsl(160 8% 13%);     /* Elevated surfaces */

/* Text */
--foreground:       hsl(0 0% 95%);           /* Primary text */
--foreground-muted: hsl(155 5% 55%);         /* Secondary text, labels */

/* Brand — Emerald */
--primary:          hsl(155 65% 30%);        /* Primary actions, section borders */
--primary-hover:    hsl(155 60% 35%);

/* Accent — Mint Glow */
--accent:           hsl(152 65% 55%);        /* Highlights, active states, glow */

/* Borders */
--border:           hsl(160 8% 18%);
--border-hover:     hsl(155 15% 25%);

/* Status */
--status-running:   hsl(152 60% 42%);        /* Active, healthy, current */
--status-pending:   hsl(38 92% 50%);         /* Warning, stale */
--status-error:     hsl(0 85% 55%);          /* Error, deprecated */
--status-idle:      hsl(155 5% 45%);         /* Idle, inactive */

/* Glow */
--glow:             hsl(152 65% 55%);        /* Used for box-shadow glow effects */
```

### Light Theme

```css
--background:           hsl(150 10% 97%);
--background-secondary: hsl(150 8% 95%);
--background-tertiary:  hsl(150 6% 92%);

--foreground:       hsl(160 20% 9%);
--foreground-muted: hsl(155 8% 45%);

--primary:          hsl(155 60% 28%);
--primary-hover:    hsl(155 55% 33%);

--accent:           hsl(152 55% 45%);

--border:           hsl(150 8% 88%);
--border-hover:     hsl(155 12% 78%);

--glow:             hsl(152 55% 45%);
```

---

## Section Category Colors

These replace the generic category colors in TEMPLATES.md. They are tuned to work on Bloo's dark background.

| Category | Primary | Light BG | Border |
|---|---|---|---|
| system_structure | `hsl(200 60% 50%)` | `hsl(200 40% 12%)` | `hsl(200 40% 25%)` |
| data_layer | `hsl(152 55% 45%)` | `hsl(152 35% 12%)` | `hsl(152 35% 25%)` |
| api_integration | `hsl(280 45% 55%)` | `hsl(280 25% 12%)` | `hsl(280 25% 25%)` |
| security | `hsl(0 60% 55%)` | `hsl(0 35% 12%)` | `hsl(0 35% 25%)` |
| infrastructure | `hsl(35 80% 55%)` | `hsl(35 50% 12%)` | `hsl(35 50% 25%)` |
| user_flows | `hsl(180 40% 50%)` | `hsl(180 25% 12%)` | `hsl(180 25% 25%)` |
| processes | `hsl(320 40% 55%)` | `hsl(320 25% 12%)` | `hsl(320 25% 25%)` |
| project_meta | `hsl(155 5% 45%)` | `hsl(155 5% 12%)` | `hsl(155 5% 25%)` |

---

## Component Type Colors (Architecture Diagrams)

Tuned for dark backgrounds with subtle glow:

| Type | Fill | Border | Glow on Hover |
|---|---|---|---|
| service | `hsl(200 50% 15%)` | `hsl(200 60% 50%)` | `hsl(200 60% 50% / 0.15)` |
| database | `hsl(152 40% 15%)` | `hsl(152 55% 45%)` | `hsl(152 55% 45% / 0.15)` |
| queue | `hsl(35 50% 15%)` | `hsl(35 80% 55%)` | `hsl(35 80% 55% / 0.15)` |
| cache | `hsl(0 40% 15%)` | `hsl(0 60% 55%)` | `hsl(0 60% 55% / 0.15)` |
| client | `hsl(280 30% 15%)` | `hsl(280 45% 55%)` | `hsl(280 45% 55% / 0.15)` |
| external | `hsl(155 5% 15%)` | `hsl(155 5% 45%)` dashed | — |
| gateway | `hsl(180 30% 15%)` | `hsl(180 40% 50%)` | `hsl(180 40% 50% / 0.15)` |
| worker | `hsl(320 30% 15%)` | `hsl(320 40% 55%)` | `hsl(320 40% 55% / 0.15)` |
| storage | `hsl(152 35% 15%)` | `hsl(152 50% 40%)` | `hsl(152 50% 40% / 0.15)` |
| cdn | `hsl(35 45% 15%)` | `hsl(35 70% 50%)` | `hsl(35 70% 50% / 0.15)` |
| load_balancer | `hsl(180 35% 15%)` | `hsl(180 45% 45%)` | `hsl(180 45% 45% / 0.15)` |
| container | `transparent` | `hsl(155 5% 30%)` dashed | — |

---

## Card & Surface Styles

All elements on the board use the "glass card" pattern:

```css
.bloo-card {
  background: hsl(160 10% 10% / 0.8);
  backdrop-filter: blur(8px);
  border: 1px solid hsl(160 8% 18% / 0.5);
  border-radius: 12px;
  transition: all 0.2s ease-out;
}

.bloo-card:hover {
  border-color: hsl(152 65% 55% / 0.2);
  box-shadow: 0 2px 16px -4px hsl(152 65% 55% / 0.08);
  transform: translateY(-1px);
}
```

---

## Typography

```css
/* Primary font — Almarai (supports Arabic), fallback Inter */
font-family: 'Almarai', 'Inter', system-ui, sans-serif;

/* Monospace — for code, paths, routes */
font-family: 'JetBrains Mono', 'Fira Code', monospace;

/* Sizes */
--text-xs:  10px;    /* Sub-labels, metadata */
--text-sm:  12px;    /* Descriptions, connection labels */
--text-md:  14px;    /* Element names, table columns */
--text-lg:  16px;    /* Section titles */
--text-xl:  20px;    /* Board title */
--text-2xl: 28px;    /* Board header */
```

---

## Glow Effects

Bloo's signature visual — subtle emerald/mint glow:

```css
/* Small glow — element hover */
.glow-sm {
  box-shadow: 0 0 12px -3px hsl(152 65% 55% / 0.15);
}

/* Medium glow — active/selected element */
.glow-md {
  box-shadow: 0 0 24px -4px hsl(152 65% 55% / 0.2);
}

/* Border glow — highlighted connections */
.glow-border {
  border-color: hsl(152 65% 55% / 0.3);
  box-shadow: 0 0 12px -3px hsl(152 65% 55% / 0.15);
}

/* Pulsing glow — live/active status */
@keyframes pulse-glow {
  0%, 100% {
    opacity: 1;
    box-shadow: 0 0 0 0 hsl(152 65% 55% / 0.3);
  }
  50% {
    opacity: 0.7;
    box-shadow: 0 0 8px 2px hsl(152 65% 55% / 0.15);
  }
}
```

---

## Background Pattern

The board canvas uses a subtle dot grid + radial gradient:

```css
/* Canvas background */
.bloo-canvas {
  background-color: hsl(160 15% 7%);
  background-image:
    radial-gradient(ellipse at 85% 15%, hsl(155 65% 30% / 0.06) 0%, transparent 50%),
    radial-gradient(ellipse at 15% 85%, hsl(152 65% 55% / 0.04) 0%, transparent 50%);
}

/* Dot grid overlay */
.bloo-canvas::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: 0.3;
  background-image: radial-gradient(circle, hsl(160 8% 18%) 1px, transparent 1px);
  background-size: 32px 32px;
}
```

---

## Animations

```css
/* Element appear */
@keyframes fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Section slide up */
@keyframes slide-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Value pop (for stats, badges) */
@keyframes count-up {
  from { opacity: 0; transform: scale(0.5); }
  to { opacity: 1; transform: scale(1); }
}

/* Subtle float for highlighted cards */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2px); }
}
```

---

## Note Colors (Dark Theme Adjusted)

| Name | Background | Border | Text |
|---|---|---|---|
| yellow | `hsl(38 50% 15%)` | `hsl(38 70% 45%)` | `hsl(38 60% 70%)` |
| blue | `hsl(210 40% 15%)` | `hsl(210 50% 45%)` | `hsl(210 40% 70%)` |
| green | `hsl(152 40% 15%)` | `hsl(152 50% 40%)` | `hsl(152 40% 70%)` |
| pink | `hsl(340 35% 15%)` | `hsl(340 45% 50%)` | `hsl(340 40% 70%)` |
| orange | `hsl(25 50% 15%)` | `hsl(25 70% 50%)` | `hsl(25 55% 70%)` |
| purple | `hsl(280 35% 15%)` | `hsl(280 40% 50%)` | `hsl(280 35% 70%)` |

---

## API Method Badge Colors

| Method | Background | Text |
|---|---|---|
| GET | `hsl(152 40% 15%)` | `hsl(152 55% 55%)` |
| POST | `hsl(210 40% 15%)` | `hsl(210 50% 55%)` |
| PUT | `hsl(35 45% 15%)` | `hsl(35 70% 55%)` |
| PATCH | `hsl(50 45% 15%)` | `hsl(50 70% 55%)` |
| DELETE | `hsl(0 40% 15%)` | `hsl(0 60% 55%)` |
| WS | `hsl(280 35% 15%)` | `hsl(280 45% 55%)` |
| SSE | `hsl(180 35% 15%)` | `hsl(180 45% 55%)` |
| GRAPHQL | `hsl(320 35% 15%)` | `hsl(320 40% 55%)` |

---

## Board Header

The board header renders as a glass bar at the top:

```css
.bloo-header {
  background: hsl(160 10% 10% / 0.9);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid hsl(160 8% 18%);
  padding: 12px 20px;
}

.bloo-header .board-title {
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(135deg, hsl(155 65% 40%), hsl(152 65% 60%));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

---

## Status Indicators on Elements

Elements use status dots with Bloo's status colors:

| Status | Color | Effect |
|---|---|---|
| current | `hsl(152 60% 42%)` | Solid dot |
| stale | `hsl(38 92% 50%)` | Pulsing dot |
| deprecated | `hsl(0 85% 55%)` | Solid dot + strikethrough name |

---

## Connection Styles

```css
/* Default connection */
stroke: hsl(155 5% 35%);
stroke-width: 1.5;

/* Highlighted connection */
stroke: hsl(152 65% 55%);
stroke-width: 2.5;
filter: drop-shadow(0 0 4px hsl(152 65% 55% / 0.3));

/* Async connection */
stroke-dasharray: 6 4;

/* Cross-reference */
stroke: hsl(155 5% 30%);
stroke-dasharray: 3 3;
stroke-width: 1;
```

---

## Scrollbar

```css
scrollbar-width: thin;
scrollbar-color: hsl(160 8% 18%) transparent;

::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: hsl(160 8% 18%);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: hsl(155 15% 25%);
}
```

---

## Google Fonts Import

The exported HTML must include:

```html
<link href="https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700;800&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

For offline/self-contained exports, the fonts should be inlined as base64 `@font-face` declarations.

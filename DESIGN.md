---
name: ExpenseIt
description: Snap a receipt, see where your money goes.
colors:
  ink: "#111111"
  ink-hover: "#2a2a2a"
  paper: "#ffffff"
  muted: "#5f5f5f"
  rule: "#e4e4e4"
  wash: "#f2f2f0"
  danger: "#c42b1c"
  cat-slate: "#5b6170"
  cat-rose: "#ff5468"
  cat-orange: "#ff7a1a"
  cat-amber: "#ffc530"
  cat-lime: "#b6f23a"
  cat-emerald: "#22b35e"
  cat-teal: "#12a594"
  cat-sky: "#3aa8f0"
  cat-indigo: "#3b4bf5"
  cat-violet: "#6a4bd8"
  cat-fuchsia: "#ff3d8b"
typography:
  display:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(3.5rem, 17vw, 5.5rem)"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "-0.04em"
    fontFeature: "tnum"
  headline:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.03em"
    fontFeature: "tnum"
  title:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: 1.4
    letterSpacing: "-0.025em"
    fontFeature: "tnum"
  body:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "tnum"
  label:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1
    fontFeature: "tnum"
rounded:
  none: "0px"
spacing:
  gutter: "16px"
  card-gap: "8px"
  card-pad: "12px"
  section: "24px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "12px 16px"
  button-primary-hover:
    backgroundColor: "{colors.ink-hover}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "12px 16px"
  button-secondary-hover:
    backgroundColor: "{colors.wash}"
  button-danger:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.danger}"
    rounded: "{rounded.none}"
    padding: "12px 16px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "10px 12px"
  category-tag:
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "6px 8px"
  story-card:
    rounded: "{rounded.none}"
    padding: "{spacing.card-pad}"
    width: "152px"
    height: "152px"
  tab-bar-item:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.muted}"
    height: "64px"
  tab-bar-item-active:
    textColor: "{colors.ink}"
  tab-bar-item-scan:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
---

# Design System: ExpenseIt

## Overview

**Creative North Star: "Month in Colour"**

ExpenseIt tells a month of spending the way a year-in-review tells a year of listening: as a sequence of flat, full-colour cards, each carrying one fact in huge extrabold numerals. Underneath the stories sits an own-brand packaging system. Every category owns one flat ink, its name is printed lowercase on that ink like a supermarket label band, and the month's split appears as a single striped band that recurs at every scale.

The ground is white paper and near-black ink. Everything is square-cornered, ruled in 2px ink, and flat: no gradients, no drop shadows, no rounded cards. Density is high where the user scans (dense recent rows with thin category bands) and poster-scale where the product tells a story (the month block, story cards, the full-screen recap). Colour carries feeling and grouping, never meaning on its own: a category's name is always printed as text next to or on its ink.

Light mode only for now; dark mode is unresolved. The logo is unresolved: the product is represented by the "ExpenseIt" wordmark set in Bricolage extrabold, tight tracking, until a mark is designed.

**Key Characteristics:**
- White paper, #111 ink, one flat ink per category, each paired with an on-colour at 4.5:1 or better.
- Square corners everywhere; 2px ink rules define edges instead of shadows.
- Bricolage Grotesque throughout, extrabold display with tracking pulled to -0.04em, tabular figures on every number.
- The packaging stripe as the recurring device; story cards and the full-screen recap as the signature.
- Hard cuts between colours; motion is short, eased out, and removed entirely under reduced motion.

## Colors

A monochrome paper-and-ink ground lit by a rack of loud, flat packaging inks, one per category.

### Primary
- **Press Ink** (ink): text, 2px rules, the primary button fill, the Scan tab, the ink story card, the focus ring and the dividers between stripe segments. Hover on ink fills lifts to **Warm Graphite** (ink-hover).

### Secondary: the category inks
Each category ink is a flat field for a story card, the month block, a label band or a stripe segment. Text on an ink always uses its paired on-colour (from `src/ui/inks.ts`), chosen for at least 4.5:1:
- **Ink text (#111) on:** Signal Rose (cat-rose), Packet Orange (cat-orange; default Food), Sunflower (cat-amber; Shopping), Highlighter Lime (cat-lime; Grocery), Leaf Emerald (cat-emerald), Pharmacy Teal (cat-teal; Health), Clear Sky (cat-sky; Education), Bubblegum Fuchsia (cat-fuchsia; Entertainment).
- **White text on:** Bus-Stop Slate (cat-slate; Other), Ultramarine (cat-indigo; Transport), Tariff Violet (cat-violet; Bills).
- **Uncategorised** spending prints on Press Ink with white text.

Highlighter Lime doubles as the system's one non-category accent: text selection, the active side-rail item, the scanner sweep line and the demo banner's link on ink.

### Neutral
- **Paper** (paper): the page ground and the fill of outlined surfaces.
- **Pencil Grey** (muted): secondary text, inactive tabs, hints, placeholders (6.4:1 on paper).
- **Hairline** (rule): the 1px dividers between list rows.
- **Wash** (wash): quiet fills for hover rows, secondary-button hover, empty stripe tracks.
- **Correction Red** (danger): error text, invalid field borders, the danger button.

### Named Rules
**The Name-Always Rule.** Colour is never the only carrier of state or category. Every ink appears with the category's name in text: on the band, beside the swatch, or in the stripe's accessible label.

**The Paired Ink Rule.** An ink is never set with arbitrary text colour. Use the on-colour paired with it in `inks.ts`; surfaces whose on-colour is white are marked `data-surface="dark"` so the focus ring flips to white.

**The No-Neighbour Rule.** Adjacent stories never share an ink, and the first story card never repeats the month block's ink directly above it. Where a stripe segment would vanish into its own ground, it prints as paper inside its ink rule.

## Typography

**Display Font:** Bricolage Grotesque (with ui-sans-serif, system-ui, sans-serif), loaded via next/font with the opsz and wdth axes and optical sizing on.
**Body Font:** Bricolage Grotesque, the same family.

**Character:** One grotesque doing everything, from 11px tab labels to 120px totals. Display weight is extrabold with tracking pulled tight so numerals lock into a poster block; body stays plain and readable.

### Hierarchy
- **Display** (800, clamp(3.5rem, 17vw, 5.5rem) on phones up to 7.5rem on desktop, line-height 0.88 to 0.9, -0.04em): the month total and recap headlines only (recap uses clamp(3.25rem, 17vw, 6rem)).
- **Headline** (800, 2.5rem, line-height 1, -0.03em): page titles. Story-card figures use 2rem at the same tracking; the insights lead sentence uses clamp(1.75rem, 6vw, 3rem).
- **Title** (800, 1.25rem to 1.5rem, tight tracking): section headings such as "Latest spending" and "Where it went".
- **Body** (400 to 600, 1rem, 1.5): prose, field values, list titles at 15px bold. Long text caps at max-w-prose.
- **Label** (700, 13px; 11px in tab labels and small tags): day headings, story-card captions, row meta, category tags (lowercase).

### Named Rules
**The Tabular Rule.** `font-variant-numeric: tabular-nums` is set on body and inherited everywhere. Amounts are exact and line up; never switch to proportional figures for money.

**The Weight-Not-Case Rule.** Hierarchy comes from size and weight (800 / 700 / 600), never from uppercase or letter-spaced labels. Category names are lowercase on their bands.

## Layout

Mobile first, designed at 390px and working from 360px. Content runs edge to edge on phones with a 16px gutter; colour blocks bleed to the viewport edge. The in-app content column caps at max-w-5xl (64rem) on desktop with 32px padding.

At the `lg` breakpoint (1024px) the bottom tab bar is replaced by a 240px left rail, the home story rail shows four cards in a row (extra cards stay on the phone's swipe rail), and home splits into a main column and a 20rem category roster. Story cards snap-scroll sideways on phones with an 8px gap.

Spacing rhythm is Tailwind's 4px grid: 8px between cards and buttons, 12px inside cards, 16px gutters, 24px between sections, with larger 28 to 40px drops under the month block's controls.

## Elevation & Depth

Completely flat. There are no drop shadows, no gradients and no blur. Depth and grouping come from flat colour fields, 2px ink rules and the 1px hairline between rows. Story cards rise 2px on hover (`translate`, not shadow).

`box-shadow` appears only as a line-drawing technique, never as depth: the 4px inset ink bar marking the active tab, and a 1px ink outline around the scanner sweep line.

### Named Rules
**The Flat-Field Rule.** Surfaces are printed, not lifted. If an element needs separation, give it an ink rule or a different flat field, never a shadow or gradient.

## Shapes

Square corners everywhere (0 radius): buttons, inputs, cards, tags, stripes, the month switcher. Edges are drawn with 2px ink borders or rings; list rows use a 1px hairline. Category swatches in rows are tall thin bands (14×34px) with a 1px ink ring. Empty states and the "add" option in the category picker use a 2px dashed ink border.

**The Packaging Stripe.** One 12px band split by category share, segments separated by 1px of ink and wrapped in a 2px ink ring (white ring on dark grounds). Segments under 1% keep a sliver so small categories never vanish. It recurs at every scale: the home month block, the insights page, receipt review, and at poster scale in the recap as the month skyline, where the story's category stands full height and the rest sit low.

## Components

### Buttons
Blunt, heavy and square.
- **Shape:** square corners, 2px border, 12px × 16px padding, bold 16px label, optional 20px icon at stroke 2.5.
- **Primary:** ink fill, white text; hover Warm Graphite.
- **Secondary:** paper fill, ink border and text; hover Wash.
- **Ghost:** transparent, no visible border; hover Wash.
- **Danger:** paper fill, danger border and text.
- **Transition:** colour only, 150ms. Disabled at 50% opacity.

### Chips: category tags
- **Style:** the category name, lowercase, bold, on its own ink with the paired on-colour, square, 13px (11px small).
- **On story cards:** a category card carries its name as a small ink band with white extrabold text in the top-left; no other card carries a label.

### Cards / Containers: story cards
- **Corner Style:** square.
- **Background:** a category ink, solid ink, or paper with a 2px inset ink ring (comparison cards).
- **Size:** 152px square on phones, 160px tall and fluid width on desktop; 12px padding; one fact pinned to the bottom (2rem extrabold figure, 13px semibold caption).
- **Shadow Strategy:** none (see Elevation). Linked cards lift 2px on hover over 200ms ease-out-expo.

### Inputs / Fields
- **Style:** 2px ink border, paper fill, square, 10px × 12px padding, 16px text, muted placeholder. Selects share the style with a 16px chevron.
- **Label:** 14px bold above; hint 14px muted below.
- **Focus:** 2px ink outline offset 2px (global `:focus-visible`, white on dark surfaces).
- **Error:** border turns danger; 14px semibold danger message below.

### Navigation
- **Phones:** fixed bottom tab bar, 64px tall, 2px ink top rule, five items with 20px icons over 11px bold labels. Inactive items muted; active ink with a 4px inset ink bar on top; Scan is always an ink-filled cell.
- **Desktop:** 240px left rail with a 2px ink right rule, the wordmark at 24px extrabold, an ink-filled "Scan a receipt" button, and items whose active state is a Highlighter Lime fill.
- **Month switcher:** square 36px arrow cells and a bordered month label, ink or white edges to suit the ground.

### Expense rows
Dense rows: a 14×34px category band with 1px ink ring, a 15px bold title over the category name in 13px muted text, and the amount right-aligned in extrabold. 1px hairline between rows; Wash on hover. Rows group under 13px bold day headings with the day total in muted text.

### Month recap (signature)
A full-screen tap-through of stories, each filling the viewport with one category ink and cutting hard to the next with no fade. Progress bars at the top (4px segments), the title and play/pause/close controls beneath, a display headline, a 1.25 to 1.75rem bold lede, optional ruled rows (3px top rule, 2px row rules), and the month skyline at the foot. Auto-advance runs every 6s; under reduced motion it starts paused and every progress bar shows full.

### Count-up
The home total renders its final value immediately, then counts up once per session over 900ms with an exponential ease-out. Skipped under reduced motion.

## Do's and Don'ts

### Do:
- **Do** set every category ink with its paired on-colour from `inks.ts`, and print the category's name with it.
- **Do** draw edges with 2px ink borders or rings and keep every corner square.
- **Do** use the packaging stripe whenever the month's split needs showing, at any scale.
- **Do** set money in Bricolage with tabular figures; display numerals in extrabold at -0.03em to -0.04em.
- **Do** mark ink-filled surfaces with white on-colour as `data-surface="dark"` so the focus ring flips to white.
- **Do** keep motion short and eased out (ease-out-expo), and use `transition: none` (not a short duration) under reduced motion.

### Don't:
- **Don't** use drop shadows, gradients or blur for depth.
- **Don't** round corners on cards, buttons, inputs or tags.
- **Don't** let colour alone carry a category, state or error.
- **Don't** use uppercase letter-spaced labels or eyebrows above headings; hierarchy is size and weight.
- **Don't** fade between recap stories; cut hard from one ink to the next.
- **Don't** put two stories of the same ink next to each other.
- **Don't** ship a dark theme or a logo mark from this file; both are unresolved.

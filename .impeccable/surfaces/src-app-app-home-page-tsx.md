---
version: 1
slug: "src-app-app-home-page-tsx"
primary_target: "src/app/(app)/home/page.tsx"
related_targets: ["src/app/(app)/layout.tsx"]
---

# Surface brief: app home

Scope: the signed-in home screen and the app shell it establishes (navigation, colour system, type) for every in-app screen. Visitor mode: Operate.

Audience and job: students and young professionals checking what this month has cost and logging a purchase seconds after paying, mostly on a phone. Portfolio visitors land here from "Try the demo" with sample data and must grasp the product in a minute.

Primary action: Scan a receipt. Secondary: Add by hand. Read first: this month's total and where it went.

Constraints: amounts exact and tabular; every AI-read value reviewable; colour never the only carrier of state; works at 360px wide and on desktop.

Chosen direction: Month in Colour home with Own-Brand colour bands (user chose fusion B over A after mock-ups). Critique reference: `.impeccable/mocks/decision/fusion-b.webp`. Build path: code-led (no image generation in this harness).

Memorable moment: the month recap, a full-screen tap-through of story cards in category inks.

Unresolved: whether dark mode ships in v2; the replacement logo mark (the user asked for a new one; wordmark only until designed).

Deferred (recorded after the first finish review): the alert band in FIRST VIEWPORT depends on budgets, which are Phase 4 scope in PRODUCT.md; until then the band has nothing true to say and is not shown. Adaptations: on desktop the story row shows four cards (extra cards stay on the phone's swipe rail); the top category gets no story card of its own because the colour block above already states it, which also keeps the first card from repeating the block's ink.

## Direction contract

THESIS: The home opens like a Wrapped card: the month's total on a full colour block with swipeable story cards, while categories stay readable as own-brand colour bands with bold lowercase tags. It refuses the category default of a white balance card, a donut chart and rounded transaction cards.

OWN-WORLD: White ground and #111 ink. Category inks: violet #6A4BD8 bills, lime #B6F23A grocery, orange #FF7A1A food, ultramarine #3B4BF5 transport, pink #FF3D8B fun, teal #12A594 health, sunflower #FFC530 shopping, plus sky, indigo and slate. Black lowercase tags on ink; 2px ink borders; square corners; flat fields with no gradients or shadows; Bricolage Grotesque from 12px tags to 120px numerals, tabular figures.

STORY: The visitor sees what the month cost and where it went at a glance, trusts that a receipt photo becomes an itemised expense, scans one, reviews and saves it, and at each month's start taps through a recap of the month that just ended.

FIRST VIEWPORT: Phone 390×844. The top ~40% is a colour block in the month's lead category ink: wordmark left, bordered month switcher right, "October so far", the total at 72px, a one-line insight, and a 12px packaging stripe. Below it, snap-scrolling story cards 146×150. Then an alert band when relevant, the actions row with an ink-filled "Scan a receipt" and an outlined "Add by hand", and dense recent rows with 14×34 category bands. A bottom tab bar holds Home, Activity, Scan (ink), Insights and Settings. On desktop a left rail replaces the tabs and the stories sit four in a row.

SIGNATURE: The month told as stories. Story cards on home and a full-screen recap with progress bars, each story filled with its category's ink and cutting hard between colours. The packaging stripe recurs at every scale: home block, receipt, recap footer. Numbers count up once on first view, and not at all under reduced motion.

FORM: Fusion of my grounded candidates #2 (year-in-review story cards, leading) and #3 (own-brand packaging colour systems), chosen by the user from the safer-register hand; seed key b24673c4.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: []
---

# Surface brief: landing page

Scope: the public front page at `/`. Visitor mode: Persuade.

Audience and job: product first for students and young professionals; recruiters and interviewers arriving from a portfolio link must see a real, finished product and reach the demo in one click. Primary action: Try the demo (no sign-up). Secondary: create an account / sign in.

Proof on hand: the real sample receipt (`public/samples/receipt-grocer.jpg`) and its real extraction (Harbour Street Grocer, 14 Sep, 9 items, £24.11; saves as grocery £24.11, or grocery £13.66 + home £10.45 when split); the demo month; the recap. No users, testimonials or statistics exist: none may be invented, and sample data is labelled as sample.

Constraints: the world is DESIGN.md's (inks, Bricolage, square corners, 2px ink rules, no gradients or shadows). A short engineering section links to GitHub. A small "Built by Rui" credit sits in the footer.

Adaptations recorded after the first finish review: the "after" month shows four bands (bills first) rather than three, because without bills the bands don't explain the £838.41 total; the hero's secondary action is "Create an account" (Sign in stays in the nav); on phones the comparison starts at 50% with smaller slips and the handle low, clear of the bands. After the second review: on desktop the divider starts at 60% (not 54%) so the pile left of it is wide enough to read at rest; the sample label sits inside the month panel's flow so it is always in the first viewport.

Chosen structure: Before and after (user's choice of three dealt structures). Critique reference: `.impeccable/mocks/decision/landing-before-after.webp`. Code-led.

## Direction contract

THESIS: The page proves the product in one gesture: drag a divider from a pocket of paper receipts to the colour-coded month they become. It refuses the category default of a headline beside a phone mock-up over a row of feature cards.

OWN-WORLD: DESIGN.md unchanged. Paper and wash ground for the "before": loose receipt slips as set type in a receipt face, never photographs of clutter. Violet month block for the "after", with the packaging stripe and category bands. The 4px ink divider with a square white handle is the only new element.

STORY: The visitor grasps the before and after at a glance, sees a real receipt read into real items, sees the month told as a recap, notes how it's built, and tries the demo with no sign-up.

FIRST VIEWPORT: Desktop 1440×900. A full-bleed comparison: the left wash field holds the scattered slips; the right violet field holds the sample month (£838.41, stripe, three category bands, labelled as sample). The headline "From a pocket of receipts to a month you can read.", the subline, Try the demo and Sign in sit in the left 40% and are never covered. The divider starts at 54% and drags between 40% and 100%. The nav runs along the top. Phones stack it: headline and actions first, then a 4:5 comparison panel with the same divider.

SIGNATURE: Drag to compare. A real range control (keyboard and touch) moves the divider. On first view it nudges once to show it moves, and not at all under reduced motion.

FORM: Grounded surface structure #5 of six (before/after comparison), dealt by concept-seed and chosen by the user; seed key 25cac1e0.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

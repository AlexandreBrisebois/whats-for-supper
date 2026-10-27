# Design

## Context and Existing Ownership

See [proposal](proposal.md) for scope. The two capability deltas define required readability, while this design defines two visual candidates for comparison rather than a palette-wide rule.

Source: `PlannerDragHandle.tsx` uses a 20%-charcoal grip that becomes base sage on hover, with sage/20 grabbed fill. The Planner page uses 45%-charcoal Plan supper text and 30%-charcoal week context; the Plus and dashed outline also use translucent terracotta. Plan supper is hard-coded even though `planner.planSupper` exists in both locales. The relevant `.glass` and `.glass-nav` surfaces are translucent and sit above animated colored backgrounds.

`docs/visual-language-reference.md` board 1 proposes readable existing pairs, preserves the breadth of sage/icon roles and distinguishes source evidence from proposals. Its opaque charcoal-600/cream, terracotta-600 and sage-700 examples are starting points, not measurements of these actual Planner composites. `globals.css` owns implemented values. No global token or shared button-system change is needed.

## Decisions and Tradeoffs

Compare these candidates in the same real Planner rows/header, against baseline:

| Element | A: charcoal-led | B: warm action |
|---|---|---|
| Week-context label | Opaque charcoal-600; retain Outfit, uppercase and tracking | Same as A, so the contextual label remains visually quieter than actions |
| Plan supper label | Opaque charcoal; terracotta-600 Plus and meaningful edge | Opaque terracotta-600 label, Plus and meaningful edge |
| Recipe drag grip | Opaque charcoal-600 at rest; dark sage-700 for applicable hover/grabbed feedback | Dark sage-700 at rest and during applicable hover/grabbed feedback |

Both retain the existing card geometry, label hierarchy, Lucide grip and touch area. Plan supper stays an action within an empty-day row, not a new filled primary button. Candidate A puts recognition primarily in neutral text; B tests whether a stronger warm action cue and broader sage handle role help availability without confusing participation or success.

Start with existing sizes and uppercase week styling. Do not apply the board's entire proposed type scale or force all labels into sentence case. If uppercase tracking clips French text or larger text, make the smallest local wrap/spacing adjustment and record it in the comparison; a general typography redesign is outside scope.

Remove opacity-based foregrounds for the selected elements, including interaction-state overrides. Use darker existing variants for hover/pressed cues, not a return to translucent terracotta or base sage. Focus retains a visible independent indicator; check the actual background and do not let the new default border impersonate focus. Preserve the existing grabbed fill only if the meaningful grip/cue still passes on its composite.

The two candidates can be captured sequentially in one local implementation; no production variant toggle, feature flag, settings control, dependency or Storybook requirement. Keep the selected deliverable reversible. Record the candidate present in the final patch and the alternate comparison before discarding temporary styling. If human review is unavailable, deliver a clearly provisional recommendation rather than claim preference or usability success.

## First Observable Slice

Open a week with one empty planning slot and an eligible recipe handle. Render week context, Plan supper and grip through actual page/components and existing locale modules. Capture baseline, A and B with matched content/viewport/locale, measure text and non-text contrast in each applicable state, open the planning sheet and exercise keyboard/held movement to confirm preserved behavior. HTTP mocks remain at the existing schedule/movement boundary; no API change is introduced.

## User Experience and Validation

For default, hover, pressed, focus and grabbed states where applicable, inspect the actual composited foreground/background at its least favorable rendered position, including active background color changes. Use browser-computed styles plus composite calculations or controlled pixel evidence; record the method, viewport, state, background and ratio. A flat-swatch ratio alone cannot qualify glass/blur. If existing surfaces cannot provide reliable contrast with the proposed foreground, use a bounded stable existing surface behind that control and explain the evidence; do not redesign all cards or remove glass globally.

Normal text, including small bold uppercase week context, needs 4.5:1. The meaningful grip, Plus and any edge needed to identify the action need 3:1; decorative dividers need not be promoted into essential boundaries. Compare unrounded ratios to thresholds. These focused checks establish neither whole-app conformance nor physical-device usability.

Check English/French, phone/iPad, 320 CSS px reflow, text enlargement and pointer-free default state. Render Plan supper with `t('planner.planSupper', 'Plan supper')`; reuse current translations without rewriting copy. Preserve accessible names, focus, hit areas and test IDs.

Review in context: can a person recognize Plan supper as available before interaction, find the handle and read week context without mistaking it for a button? Does the treatment preserve recipe-title/primary-action hierarchy and Solar Earth warmth? Compare past-date surfaces from the separate experiment if available, because quieter past decoration must not fade enabled actions. Do not require implementation of that separate experiment just to complete this one.

Deliver comparison evidence with measured results, attributed review feedback when available and an A/B/revise recommendation. No unreadable candidate can be recommended on aesthetic preference alone. If both qualify, prefer the option that best preserves hierarchy and recognizable action roles; report any unresolved human preference. Reconcile the chosen candidate into this change's notes. Canonical visual-language adoption, publication and broad rollout are separate work.

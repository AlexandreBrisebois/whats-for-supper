# Design

## Context and Existing Ownership

See [proposal](proposal.md) for the combined scope and consolidation of the unimplemented day-emphasis experiment. The capability deltas own observable requirements. No implementation or rendered usability success is claimed by this revision.

Current `planner/page.tsx` owns the week header and `PlannerDayCard`. Dates occupy a fixed `w-10` column outside `planner-meal`; the source outline/label, destination date tint/outline/arrow and overlay move/swap cues already exist. `PlannerDragHandle.tsx` has charcoal/70 grip text, sage-700 hover and sage/20 grabbed fill with a sage-700 ring. Its hold, touch-scroll and keyboard mechanics remain owners of activation, not targets for redesign. The old charcoal/20 grip diagnosis is stale.

Week context is 10px, uppercase, widely tracked charcoal/30. Plan supper remains hard-coded charcoal/45, with translucent terracotta Plus/dashed edge. Weekday/month labels are charcoal/40. Actual foreground/background composites have not been measured. Existing `.glass`/`.glass-nav` and token values in `globals.css` remain implementation authorities.

`todayStore` owns validated calendar context, `calendarAnchor`, `calendarVersion`, `calendarIsFresh`, invalidation and deduplicated `ensureCalendar`. `deployment-calendar.ts` owns civil-date validation and monotonic anchor freshness. The existing schedule-stream resume path refreshes shared context. These mechanisms support orientation without a second calendar policy.

The proposed visual language and North Star favor clear hierarchy, sentence case, readable existing color pairs and returning to life with fewer loose ends. This revision adopts those principles locally, not their entire proposed type scale or a global control redesign.

## Decisions and Tradeoffs

### One quiet treatment

Replace the charcoal-led/warm-action A/B implementation sequence with one baseline/proposed comparison. Keep one local treatment and revise only demonstrated problems. No runtime variants, flags, settings, analytics, new fonts or dependencies.

| Element | Selected starting treatment |
|---|---|
| Week context | Outfit, sentence case, approximately 14px/20px semibold, normal tracking, opaque charcoal-600; date range remains more prominent |
| Plan supper | Existing localized sentence-case label; opaque terracotta-600 text and Plus, darker terracotta feedback; retain the light open action and existing sizes/targets |
| Grip | Opaque charcoal-600 default; sage-700 hover/grabbed; independent visible keyboard focus |
| Fixed weekday/month | Opaque charcoal-600, existing date-column width and hierarchy; adjust local spacing/wrapping only if needed for legibility |
| Today | 2 CSS px terracotta-600 outline around the fixed date marker; one readable terracotta-600 Today label above that row |
| Past | Reduce shadow/glow and use a flatter existing cream surface; preserve essential foregrounds and actions |

Terracotta already carries actions; the Today label and fixed date placement must make its temporal meaning explicit. Sage keeps its broad existing roles and movement feedback. Neither hue alone communicates state. Today gets no filled badge, full-row border, animation or larger meal card.

### Phone space belongs to supper

Keep the existing date column width and meal-content width. Place Today / Aujourd’hui in a compact text line above today's row, outside the drag surface, using available row width rather than putting it beside the date or inside its narrow column. Only today's row gets the line; do not reserve blank label bands on all seven rows. Give the text room to wrap at narrow widths and enlarged text. Keep the marker outline from changing date-column geometry, and keep the label attached to the dated slot while recipes move.

This adds a single line for explicit recognition, rather than widening every row. Its cost is some vertical height on today's row. Review that cost on a phone. If it feels cluttered, return a specific revision recommendation; do not silently remove the agreed explicit label or declare the treatment successful. Layout after accepted calendar refresh may change that one line's location; active drag target/source feedback must itself remain layout-stable under existing rules.

### Readability with distinct states

Remove opacity-based essential foregrounds for the affected elements and interaction overrides. Normal affected text needs 4.5:1, meaningful grip/Plus/control edges and the Today outline need 3:1 on actual adjacent backgrounds. Decorative dashed borders need no independent threshold unless needed to identify the action. Preserve glass where readable; if measurements show a local failure, use an existing stable surface only behind the affected element. No global glass removal.

Focus, drag targeting, grabbed state and success feedback stay independent. Today outlines only the fixed marker; drag targeting retains its existing date tint/outline/arrow and meal outline. Check their combined state explicitly so today is not mistaken for the drop target. No new temporal cues on future rows; past does not mean cooked or disabled.

## First Observable Slice

Render a real Planner week containing an empty slot and eligible recipe using actual components and EN/FR locale modules. Improve week/date context, planning action and grip, then measure affected composites and open the planning sheet/use the keyboard handle. Existing HTTP schedule/movement mocks remain at the API boundary. This first slice changes no API or store movement semantics.

Next add compact Today and quiet past treatment for a Wednesday schedule, using reliable shared calendar data: an uncooked Monday stays uncooked and usable, Wednesday has one label/outlined date, and future dates stay normal. A recipe swap leaves all date-relative cues with their slots.

## State, Concurrency and Recovery

Subscribe reactively to shared calendar/anchor/version; classify validated displayed civil dates against fresh `calendar.today`, not recipe identity, status, offset or browser midnight. Reuse `calendarIsFresh`/`calendarAnchorIsFresh`. On entry use fresh shared data or deduplicated `ensureCalendar`; do not fetch per row.

Reuse shell resume invalidation. A single Planner expiry effect may observe remaining monotonic anchor lifetime, neutralize temporal cues at expiry and request shared refresh. Retire effects on unmount/context replacement. Do not introduce polling, a second clock/store or stale `weekStore.calendar` fallback after shared invalidation. On refresh failure retain readable usable content with neutral temporal appearance; add no orientation-only blocking error or retry workflow.

Recompute from actual displayed dates when reliable context changes, including Sunday-to-Monday, timezone disagreement and retained old-week content during loading. Orientation submits no meal mutation or automatic navigation. Existing shared refresh side effects remain with their owner; broad lifecycle repairs are outside scope. Calendar-read doubles must use the existing approved operation/envelope discovered from `loadCalendarSnapshot`, not a new endpoint.

## User Experience

The review question is: can a person glance at the phone, find today and supper, recognize the next action and leave? Do not add legends, repeated explanatory text, aggregate badges or additional steps. Past rows lose decoration, not usability. Keep existing voting/return controls and no-count-badge behavior intact.

Capture matched baseline/proposed Monday, Wednesday and Sunday views, including uncooked/cooked, empty, pending and non-cooking content, long names, previous/next week, English/French, phone and iPad portrait/landscape. Check 320 CSS px reflow and 200% text enlargement without shrinking controls. Preserve existing hit areas, accessible names/test IDs and focus; use `t('planner.planSupper', 'Plan supper')`, reuse `planner.today` if present or add Today / Aujourd’hui, and put `aria-current="date"` on today's fixed date element.

Measure actual default/hover/pressed/focus/grabbed composites where applicable, including glass/header and sage grabbed/target fills at unfavorable background positions. Record method, state, viewport, locale, foreground/background and unrounded pass/fail comparison. Swatch calculations or class snapshots alone cannot qualify glass. These checks do not establish whole-app conformance or physical-device usability.

Deliver baseline/proposed evidence with a retain/revise recommendation. Ask a reviewer to locate today, identify supper/next action, explain an uncooked past row and use its existing action. Record whether the extra Today line competes with content or makes scanning harder, distinguishing attributed observations from designer judgment. Without human feedback leave usability pending, even if automated checks pass. Canonical visual-language publication, spec sync/archive and implementation authorization are separate from this planning update.

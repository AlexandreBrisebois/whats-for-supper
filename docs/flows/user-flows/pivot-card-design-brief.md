# Design Brief — TonightPivotCard

**Persona:** The Mère-Designer
**Component:** `pwa/src/components/home/TonightPivotCard.tsx`
**Trigger:** User request for ideas to make the pivot card look better.

---

## 1. Button Naming — "Confirm GOTO"

**Why (Design Theory)**
"GOTO" is a developer term borrowed from assembly language. It carries zero meaning for a parent standing in a kitchen at 5:30 pm. The Toddler Rule is clear: if you can't explain it while holding a crying child, rename it. "Confirm" is also weak — it implies a bureaucratic approval step, not a decisive action.

**How (Parental Utility)**
The button should answer the question the parent is already asking: *"Are we making this tonight?"* A label like **"Make This Tonight"** or **"Yes, This One"** is self-explanatory, thumb-friendly, and removes the cognitive pause of decoding jargon.

**Proposed label:** `Make This Tonight`

---

## 2. Visual Hierarchy — Three Buttons, No Clear Winner

**Why (Design Theory)**
When `gotoReady === true`, the card presents three actions: **Confirm GOTO** (ochre, full-width), **Quick Find** (indigo, half-width), and **Order In** (charcoal/muted, half-width). The ochre primary button is correct in principle, but the two secondary buttons sit in a 2-column grid directly below it with near-equal visual weight. The eye has no clear path. This is a three-way tie, not a hierarchy.

**How (Parental Utility)**
The primary action (making the planned meal) should dominate. The two escape hatches should feel like footnotes — present but not competing. The fix is to reduce the secondary buttons to text links or ghost buttons with smaller type, not pill buttons with background fills. The parent's eye should land on the primary action in under 300 ms.

**Proposed hierarchy:**
- Primary: `Make This Tonight` — full-width, ochre, pill button (current size is correct)
- Secondary row: `Quick Find` + `Order In` — ghost/outline style, smaller text, no background fill

---

## 3. Empty State Image Area — Grey Box with Fork Icon

**Why (Design Theory)**
A grey box with a centred icon is a placeholder, not a design. It communicates "nothing here" rather than "something is possible here." The current implementation uses a `<Utensils>` icon at `text-charcoal/10` opacity — nearly invisible. The empty state is the most important state for a new user; it is the first thing they see.

**How (Parental Utility)**
The empty state should be an invitation, not a void. Replace the grey box with a warm, illustrated prompt — a soft terracotta gradient background with a short, human line like *"Your family's go-to meal lives here"* and a visible CTA to set one. The existing `<a href="/profile/settings">` link is already there; it just needs to be styled as a proper call-to-action card rather than an invisible anchor inside a grey box.

**Proposed treatment:** Terracotta/10 gradient background, centred icon at full opacity (`text-terracotta`), label text at `text-sm` (not `text-[11px]`), and a visible underline or arrow on the link.

---

## 4. Card Header — "Tonight's Menu" vs "What's for Supper?"

**Why (Design Theory)**
"Tonight's Menu" is a restaurant term. It implies a fixed, curated list — the opposite of the flexible, family-negotiated reality this app serves. "What's for Supper?" is the product's own name and its core emotional promise. It is also a question, which is exactly the right framing for a card that is asking the family to decide.

**How (Parental Utility)**
Using the product's own tagline as the card header reinforces brand recognition and reduces the mental distance between the app's promise and its UI. It also signals that this card is the answer to that question — the Command Center doing its job.

**Proposed label:** `What's for Supper?`

---

## 5. Overall Card Feel — Command Center or Dead End?

**Why (Design Theory)**
The pivot card currently feels like a fallback — a card that appears when the "real" card (TonightMenuCard) is absent. The layout, typography, and colour choices are nearly identical to TonightMenuCard, which makes the pivot feel like a broken version of it rather than a purposeful state. A Command Center should feel active and directive, not passive and apologetic.

**How (Parental Utility)**
The single highest-impact change is **adding a contextual status line** below the header that tells the parent exactly where they are: *"No meal planned yet"* or *"Your GOTO is ready"* or *"Checking your GOTO…"* — in plain language, not italic muted text. This one line transforms the card from a dead end into a live status display. Pair it with a subtle animated pulse on the GOTO image area when `gotoStatus === 'pending'` (Framer Motion, standard spring profile) to signal that something is happening.

---

## Prioritised Changes

These are the three changes with the highest impact-to-effort ratio, in order:

1. **Rename "Confirm GOTO" → "Make This Tonight"**
   One string change. Zero risk. Immediately reduces cognitive load for every user who has a GOTO set. Apply the Toddler Rule — this is the fastest win on the board.

2. **Redesign the empty state image area**
   Replace the invisible grey box with a warm terracotta-tinted invitation. This is the first thing a new user sees; it should feel like a welcome, not a 404. Effort: ~30 min of Tailwind work.

3. **Flatten the secondary button hierarchy**
   Change `Quick Find` and `Order In` from filled pill buttons to ghost/outline style when a primary GOTO action is present. This makes the visual hierarchy unambiguous and stops the three-button cluster from reading as a menu. Effort: ~20 min of Tailwind work.

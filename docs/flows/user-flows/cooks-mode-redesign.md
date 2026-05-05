# Flow: Cook's Mode — Redesign Brief

**Spec:** `.kiro/specs/00-live-schedule` — Group N tasks
**Reviewed by:** The Mère-Designer
**Context:** Cook's Mode is a full-screen overlay walked by a parent in an active kitchen. Wet hands. Limited attention. Children nearby. Every interaction must be decisive and require zero reading.

---

## Card 0 — Pre-flight Checklist (ingredients)

### Problem: Static icons masquerade as a checklist

Every ingredient has a `CheckCircle2` icon — a filled, sage-green tick. This is a completed-state icon used on an incomplete-state screen. Parents see ✓ and assume "already done." It is visually inert.

**Mère-Designer ruling:** This card is the *gathering ritual* — the moment the cook confirms every ingredient is on the counter before turning on the heat. It must be interactive.

### Fix: Interactive ingredient toggle

**Before (current):**
```tsx
<div className="h-8 w-8 rounded-full bg-terracotta/10 text-terracotta ...">
  <CheckCircle2 size={16} />
</div>
<span className="text-base font-bold text-charcoal/80">{ing}</span>
```

**After:**
```tsx
// Local state: Record<string, boolean> — no server sync
const [gathered, setGathered] = useState<Record<string, boolean>>({});

// Each item:
<motion.button
  onClick={() => setGathered(g => ({ ...g, [ing]: !g[ing] }))}
  className={`flex items-center p-4 rounded-3xl border transition-all w-full text-left
    ${gathered[ing]
      ? 'bg-sage/10 border-sage/20 text-charcoal/40'
      : 'bg-white border-charcoal/5 text-charcoal hover:bg-charcoal/2'
    }`}
>
  <div className={`h-8 w-8 rounded-full flex items-center justify-center mr-4 flex-shrink-0 transition-all
    ${gathered[ing] ? 'bg-sage text-white' : 'bg-terracotta/10 text-terracotta/40 border-2 border-terracotta/20'}`}>
    {gathered[ing] ? <CheckCircle2 size={16} /> : <Circle size={16} />}
  </div>
  <span className={`text-base font-bold transition-all ${gathered[ing] ? 'line-through opacity-50' : ''}`}>
    {ing}
  </span>
</motion.button>
```

**State lives only in CooksMode component local state.** No plannerStore, no API call. This is a pre-flight ritual, not a persistent record.

**"Ready to Cook" gate:** The "Next →" button on Card 0 should change label to **"Let's Cook →"** and remain terracotta regardless of check state — gathering is optional, not a blocker. Parents may skip the list.

Progress counter above the list: "X of Y gathered" (sage green, `text-xs font-bold`) updates as items are tapped. Rewards completionism without mandating it.

### Remove: Dietary badge

Remove the entire "Plant-Powered Choice!" / "Healthy Pick!" badge from Card 0. This is editorial content for Discovery, not operational content for a kitchen. The recipe is already chosen — the badge adds cognitive load with zero utility.

### Card 0 visual identity fix

The ingredient card and step cards share `text-charcoal/60`. Card 0 must feel like a distinct *zone*. Fixes:
- Card 0 heading: `text-charcoal` (full opacity) — "Let's get everything together" replaces current step title
- Ingredient label: `text-charcoal/80` (darker than steps)
- Background of Card 0 content area: soft `bg-terracotta/[0.02]` wash to signal "gathering zone"

---

## Cards 1–N — Cooking steps

### Problem: Instruction text is hard to read at kitchen distance

`text-3xl font-medium text-charcoal/60` fails the arm's-length test. A parent stirring a pot at 60cm from the counter can't resolve `/60` opacity at that size.

**Fix:** `text-3xl font-bold text-charcoal/80` — heavier weight, higher contrast. Same size, dramatically more readable.

### Step indicator

`UtensilsCrossed` icon inside the "Step X of Y" pill is decorative and wastes space. Replace with a minimal dot or just the text — but keep the pill shape for context.

```tsx
// Simpler, faster to parse:
<span className="text-sm font-black uppercase tracking-widest text-terracotta">
  {currentStep + 1} / {steps.length}
</span>
```

### Navigation button proportions

Current grid is `grid-cols-2 gap-6` — Back and Next share equal width. Back is a secondary action that should feel secondary.

**Fix:** `grid-cols-[2fr_3fr] gap-4`
- Back: smaller, `text-lg`, ghost/muted
- Next: larger, `text-2xl font-black`, full terracotta — the parent's thumb WANTS to hit this

---

## Last card — Done moment

Current: user taps "Done" → `onCooked()` fires → overlay closes → navigates to /home. No signal that something important just happened.

**Fix:** Before the overlay closes, show a 600ms in-place celebration:
```tsx
// On the last step, "Done" triggers a celebration overlay layer
<motion.div
  initial={{ opacity: 0, scale: 0.8 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 1.2 }}
  transition={{ duration: 0.3 }}
  className="absolute inset-0 flex flex-col items-center justify-center bg-cream z-10"
>
  <Sparkles size={48} className="text-ochre mb-4" />
  <p className="font-heading text-3xl font-black text-charcoal">Supper's done!</p>
  <p className="text-charcoal/60 mt-2">Nice work.</p>
</motion.div>
```

After 600ms, call `onCooked()` and close. The celebration is brief — it doesn't block.

---

## Progress bar

Current: a series of `flex-1` divs that animate `backgroundColor`. This works but is visually thin (2px). Works fine — keep it. One improvement: on step 0, show 1 segment filled (not 0) — the parent is IN Cook's Mode, they're already at step 1.

---

## Implementation checklist (ordered by impact)

1. Ingredient toggle interactivity (Card 0) — transforms the page from display to tool
2. Remove dietary badge — removes noise
3. Step instruction contrast fix (`/60` → `/80`, `font-medium` → `font-bold`)
4. Button proportion fix (`grid-cols-[2fr_3fr]`)
5. "Let's Cook →" CTA label on Card 0
6. "X of Y gathered" progress counter above ingredient list
7. Celebration moment on Done
8. Card 0 zone differentiation (terracotta/2 background wash)

# What's For Supper — Phase 0 User Walkthrough

A step-by-step guide to capturing your first recipe. The full flow takes 2–3 minutes.

---

## Prerequisites

The app must be running. If you haven't started it yet:

```bash
docker-compose up
# then open http://localhost:3000
```

---

## Step 1 — Open the app and meet the onboarding screen

Navigate to **http://localhost:3000** in any modern browser (Chrome, Safari, Firefox, Edge).

Because you have no saved identity yet, the app redirects you to **Who Are You?**

```
┌─────────────────────────────────┐
│       Who Are You?              │
│  Select your name or add a new  │
│  member                         │
│                                 │
│  [ Alice  ]                     │
│  [ Bob    ]                     │
│  [ Carol  ]                     │
│                                 │
│  Don't see your name? ›         │
└─────────────────────────────────┘
```

> **Tip:** A short hint tour automatically starts on first visit. Follow the prompts or tap **Skip** to dismiss it.

---

## Step 2 — Select your family member (or create a new one)

**Option A — Your name is already in the list**

Tap your name. You are taken directly to the home page (Step 3).

**Option B — Your name is not in the list**

1. Tap **"Don't see your name?"**
2. Type your name in the text field that appears.
3. Tap **Add** (or press Enter).
4. Your name appears in the list — tap it to continue.

```
┌─────────────────────────────────┐
│  Add a new member               │
│                                 │
│  Name: [________________]       │
│                                 │
│         [ Add ]                 │
└─────────────────────────────────┘
```

---

## Step 3 — Home page — your personalised welcome

After selecting a member you land on the **home page**.

```
┌─────────────────────────────────┐
│  Welcome, Alice! 🍽️              │
│                                 │
│  📸  Capture a meal             │
│     Photo + notes in seconds    │
│                                 │
│  📖  Recipes  (coming soon)     │
└─────────────────────────────────┘
```

Your name persists between sessions — next time you open the app you'll skip onboarding and land here directly.

---

## Step 4 — Start capturing a meal

Tap **Capture a meal** to open the capture flow.

The page shows **Step 1 of 4 — Add Your First Recipe**.

---

## Step 5 — Take or select photos (Step 1 of 4)

You have two options:

| Option | How |
|--------|-----|
| **Take a photo** | Point the camera at your meal and tap the shutter button |
| **Choose from gallery** | Tap **Gallery** to pick an existing photo from your device |

You can add **multiple photos** of the same meal. Each appears as a thumbnail below the camera view.

When at least one photo is added, the **Review Photos →** button becomes active.

```
┌─────────────────────────────────┐
│  Step 1 of 4  Add Your First    │
│  Recipe                         │
│                                 │
│  [  camera viewfinder  ]        │
│         [ ● ]                   │
│                                 │
│  1 photo added · tap to review  │
│  [ Review Photos →            ] │
└─────────────────────────────────┘
```

---

## Step 6 — Review your photos (Step 2 of 4)

Swipe through the thumbnails. You can:

- **Delete** a photo by tapping the × icon.
- **Add more** by tapping **+ Add More Photos**.

Tap **Select Meal Photo →** to continue.

---

## Step 7 — Choose the hero image (Step 3 of 4)

One photo will be the primary image for this recipe entry. Tap the photo that best represents the meal.

```
┌─────────────────────────────────┐
│  Step 3 of 4  Select Meal Photo │
│                                 │
│  [photo 1] [photo 2] [photo 3]  │
│                                 │
│  [ Rate the Meal →            ] │
└─────────────────────────────────┘
```

Tap **Rate the Meal →** (or **Skip & Rate →** if you want to continue without selecting).

---

## Step 8 — Rate the meal (Step 4 of 4)

Choose how the meal went:

| Emoji | Rating | Meaning |
|-------|--------|---------|
| ⚪ | Unknown | No opinion yet |
| 🔴 | Dislike | Not making this again |
| 🟡 | Like | Good, would cook again |
| 💚 | Love | Family favourite! |

Tap an emoji to select it. The **Save Recipe** button becomes active.

```
┌─────────────────────────────────┐
│  Step 4 of 4  Rate & Save       │
│                                 │
│  ⚪   🔴   🟡   💚             │
│                                 │
│  [ Save Recipe               ]  │
└─────────────────────────────────┘
```

---

## Step 9 — See the success confirmation

After tapping **Save Recipe** the app uploads your photos and saves the recipe entry.

```
┌─────────────────────────────────┐
│  Recipe Saved! 🎉               │
│                                 │
│  Your meal has been captured.   │
│                                 │
│  [ Add Another Recipe ]         │
│  [ Go Home            ]         │
└─────────────────────────────────┘
```

---

## Step 10 — Return to home

Tap **Go Home** to return to the home page. Your recipe is now stored in the database.

```
┌─────────────────────────────────┐
│  Welcome, Alice! 🍽️              │
│                                 │
│  📸  Capture a meal             │
│  📖  Recipes                    │
└─────────────────────────────────┘
```

---

## Frequently Asked Questions

**What if the camera doesn't work?**

The camera requires browser permission. If the browser asks to allow camera access, tap **Allow**. If you accidentally denied it, open your browser settings and grant the permission for `localhost`.

On desktop browsers that don't have a camera, tap **Gallery** to upload a photo from your computer instead.

**How do I add another family member?**

Go to `/onboarding` (clear your cookies or use a private/incognito tab) and tap **"Don't see your name?"**.

**How do I switch between family members?**

Clear the `member_id` cookie in your browser's developer tools, then reload — you'll be taken back to onboarding to pick a different member.

**Where are my photos stored?**

Photos are saved inside the `recipes_data` Docker volume on the host machine, mounted into the API container at `/data/recipes`. Each recipe gets a folder containing its images and metadata.

**What happens if I close the app mid-capture?**

The capture flow is client-side only until you tap **Save Recipe**. If you close the browser before saving, the draft is lost. There is no auto-save in Phase 0.

**Is my data backed up?**

In Phase 0, data lives in a named Docker volume (`whats-for-supper-postgres`). To back it up:

```bash
docker run --rm -v whats-for-supper-postgres:/data -v $(pwd):/backup \
  alpine tar czf /backup/postgres-backup.tar.gz /data
```

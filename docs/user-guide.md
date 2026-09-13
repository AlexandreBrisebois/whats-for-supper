# What's for Supper? — Family Guide

Welcome to the app that answers the most stressful question of the day before you have to ask it.

---

## Getting Started

Open your household's app link, enter the shared household passphrase if asked, pick your name from the family list, and you're in. No personal account to create or separate password to remember.

The app keeps your whole family on the same page — literally. Whatever anyone plans, cooks, or votes on shows up for everyone instantly. No more "I thought you were making dinner" moments.

---

## What's for Supper? (Home)

The home screen is your command centre. It tells you what's planned for tonight, how long it takes, and what to do next.

If a recipe is set for tonight, you'll see it front and centre with a **Cook's Mode** button. Tap it to work through the recipe one clear, large-text step at a time.

If nothing is planned yet, you'll see a few fast choices. If your family has **GOTO recipes** saved, the app randomly picks one to show as your featured fallback. Tap **Make This Tonight** to put it on the menu in one step. Refreshing may show another recipe from your GOTO list. You can also use **Quick Find** for a short stack of suggestions, or search your library when you already know what you want.

This screen saves you from opening the fridge, staring blankly, and ordering pizza for the third time this week.

---

## Your Family GOTO Recipes

Your **GOTO recipes** are the fallback meals everyone accepts — the ones you can make when the plan falls apart. By keeping a list of multiple GOTOs, the app can rotate through them randomly on your home screen, saving you from "fallback fatigue."

Manage your list from **Settings → Family GOTO**. You can see all your active fallback meals, remove ones you're tired of, or add new ones. 

To add an existing recipe from your library, choose **Search the Library**, open the recipe, and tap the **star** at the top. When the star is selected, it shows **GOTO** beside it. Tapping the star on other recipes will add them to your rotation rather than replacing the old ones.

If you have a new idea that isn't in your library yet, use **Describe it** or **Capture it** directly from the GOTO Settings card. The app will prepare the recipe in the background and automatically add it to your rotation once it is ready.

---

## The Weekly Planner

The planner shows the whole week at a glance. Each day shows what's planned — or a gentle nudge to fill the gap.

Tap any day to assign a recipe, swap one out, or mark a night as "ordered in." Drag a recipe to a different day if plans change.

The **grocery list** lives here too. Check items off as you shop — your partner's phone updates live, so you won't both come home with two bags of onions.

The planner saves you from the Sunday-night panic of figuring out five dinners from scratch.

---

## Discovering New Recipes

Swipe through recipe cards like a family vote. Heart the ones you love, pass on the rest.

When enough family members like the same recipe, it rises to the top of the planner suggestions. No group chat needed.

Discovery saves you from the "I don't know, what do *you* want?" loop that ends in cereal.

---

## Searching Your Library

When you know exactly what you're looking for, or have a specific craving, use the **Search** tab.

You don't need to be precise. Type like you talk: "chicken pasta tonight", "quick fish", or "the salmon bowls we liked." The app uses semantic search to find the best matches even if the words don't match perfectly.

Search is **planner-aware**. If you open search from a day in your planner, it automatically hides recipes you've already planned for other days.

Use the **"Healthy"** filter to quickly find light and nutritious meals.

Tap any search result to open its recipe detail view. From there you can cook it tonight, plan it for later, find similar recipes, edit notes, or tap the **star** to add it to your family's GOTO list.

Search saves you from the "I don't know, what do *you* want?" loop that ends in cereal.

---

## Browsing Your Library

Sometimes you don't know what you want, but you want to be inspired by what you already have. Tap **Browse Library** on the Home screen to enter a full-screen, immersive experience.

Flip through your recipes one by one, just like a physical recipe box. The app shows you recipes you haven't cooked in a while first, helping you rediscover forgotten family favourites.

Tap any card to see the full details, or toggle the **Sparkles** icon to see only the recipes you've marked as "Discoverable" for family voting.

The recipe detail view also has the same **GOTO star** at the top, so you can add a rediscovered favourite to your rotation without going back through Settings.

Browsing saves you from the "we always eat the same three things" rut.

---

## Adding Recipes

You can add a recipe three ways:

- **Photo** — snap a page from a cookbook or a screenshot
- **URL** — share a link from any recipe site
- **Describe it** — type a few words and let the app fill in the details

After you submit, the recipe queues while it's being processed. You'll get a notification the moment it's ready in your library.

Adding recipes saves you from retyping Grandma's lasagna off a crumpled index card.

---

## Automated Recipe Translation

Your household can be configured to process new recipes in a preferred language (for example, French). This applies during the initial processing of **Photo**, **URL**, and **Describe it** recipes.

When translation is active:
- **Consistent Library**: The recipe-processing workflow requests ingredients, steps, and descriptions in your chosen language.
- **Existing recipes**: Open the recipe's gear menu and choose **Report issue**. Choose **Ingredients** or **Steps**, add a note explaining what needs attention, and tap **Save**. For recipes with an original photo or website source, the app may re-read that source and update the recipe in the background.

This feature is controlled by your system administrator via the `IMPORT_TARGET_LANGUAGE` setting.

---

## Reporting a Recipe Issue

If a recipe needs attention, open it, tap the gear menu, and choose **Report issue**. If it already has a report, the same option is named **Review issue**.

Choose what needs a closer look:

- **Ingredients** or **Steps** — add a short, specific note, then tap **Save**. For a recipe that can be re-imported from its original source, the app can start a focused re-import in the background.
- **Duplicate** — this is always saved for manual review and does not re-import the recipe.

You only need to tap **Save**. The app decides the safe next step. A report with no note is still saved for review, but it will not start a re-import.

When a re-import starts, you can close the sheet and keep using the app. The recipe shows **Reimporting in background** while it works. When it finishes, it is marked **Reimported — check recipe**. Review the recipe, then choose **Mark as resolved** when it looks right.

If re-import cannot finish, your report stays saved. Add or change a detail and tap **Save** to request another attempt. Saving unchanged feedback will not repeatedly restart it.

In **Cook's Mode**, use the flag beside ingredients or a step to open this same reporting flow. Check the result later from the recipe detail screen.

---

## Managing Your Library

If you delete a recipe by mistake, don't panic. It goes to the **Recycle Bin** in the recipe library, where you can restore it with one tap.

You can also toggle whether a recipe is "Discoverable" directly from the library or the browse stack. Only discoverable recipes appear in the family voting stack.

Library management saves you from "digital clutter" while keeping your favourites safe.

---

## Real-Time Sync

Everything in the app is shared and live. When Alex assigns a recipe on the planner, Jordan's home screen updates immediately — no refresh, no waiting.

The grocery list works the same way. Two people in the same store, checking things off together in real time.

---

## Showcase (Demo Mode)

Demo Mode is a managed showcase environment. The host captures a master snapshot, and the app restores recipes, plans, and votes from it on a configured schedule.

To keep the showcase predictable and avoid AI costs, AI-powered recipe processing is disabled. You can still use the planner, browse the library, and use regular search.

# Family convergence image brief

## Purpose and reference

Create a warm celebration for the Discovery state where the household has enough recipe matches. The user will try multiple image models and choose the result. This document selects no model or final asset and makes no image-generation API call.

Attach [the original Solar Earth logo](../../../../specs/mockups/solar_earth_logo.png) to every trial as the primary visual reference. [The installed app icon](../../../../pwa/public/android-chrome-512x512.png) is an optional secondary reference for small-size recognizability. Do not use beta/demo-badged variants.

Observed original: a softly sculpted terracotta flame/bowl form cradling a golden ochre sphere, with a sage-green leaf/flame accent, rounded tactile edges, soft shadows and a warm cream background. Preserve that identity; do not reinterpret it as a generic chef hat, trophy, family portrait or new mascot.

## Copy-and-paste prompt: production artwork without text

> Using the attached What's for Supper / Solar Earth app logo as the primary reference, create a special celebratory image for a family meal-planning app. The emotional message is: “We did it! Menu's In!” A household has found its meals together. Make it feel like a small, heartfelt family win: warm, inviting, quietly joyful, reassuring and familiar.
>
> Keep the existing logo as the unmistakable central subject. Preserve the terracotta flame-shaped bowl, the golden ochre sphere it cradles, the sage-green accent, their recognizable silhouette and relative proportions. Match the reference's softly sculpted, tactile ceramic-like material, rounded edges, gentle depth, warm light and soft grounded shadows. Do not redesign the logo or add a face, limbs or characters.
>
> Give the familiar mark a restrained celebratory treatment: a soft warm golden halo or a few broad, gentle sun rays behind it. Keep embellishment secondary and sparse. The image should still read clearly at phone size. Use a calm cream background, generous breathing room and a centered composition. Palette anchors: terracotta #CD5D45, ochre #E1AD01, sage #8A9A5B, cream #FDFCF0. Natural shading is welcome; avoid harsh gradients or neon colors.
>
> Produce one high-quality square image, ideally 1024 by 1024 pixels or larger. Keep the central mark comfortably inside the middle 70 percent of the canvas, with no cropped tips or decorative marks at the edges. Leave the lower area visually quiet so the app can place its own heading below the image. No text, letters, slogans, watermark, border, app screenshot, buttons or navigation in this production artwork. The app will render “We did it!” and “Menu's In!” as accessible, localized text.
>
> No confetti, fireworks, glitter, trophies, medals, ribbons, competitive score, floating recipe cards, food photography, table scene, people, cartoon mascot or busy background. This is a special moment for the existing app logo, not a new brand. It should feel at home beside the supplied logo and the app's warm Solar Earth visual language.

## Optional wording mockup for comparing models

Use the same prompt, replacing the no-text instruction with:

> Below the logo, include exactly two centered lines: “We did it!” followed by “Menu's In!”. Make “Menu's In!” the stronger line. Use friendly rounded contemporary lettering inspired by Outfit, generous spacing, and a dark warm terracotta or charcoal tone with readable contrast on cream. Add no other copy, buttons or calls to action. Do not include “Table's Set!”. Keep the logo as the main visual focus.

This variant is a concept preview. Prefer the text-free image for production so translations, contrast, responsive sizing and screen-reader text stay under app control. If the preferred trial includes lettering, request a matching text-free export rather than displaying duplicate headings.

## Controlled variations

Run the base prompt unchanged across models first. Then change only one visual treatment at a time:

1. **Gentle glow:** soft ochre halo, no rays, closest to the reference.
2. **Warm sunrise:** three to five subtle broad rays behind the mark, preserving its silhouette.
3. **Quiet emblem:** a delicate low-contrast circular halo enclosing the same original mark; no badge ribbon or lettering.

These are options to compare, not three required production assets. Keep the reference, palette, composition and wording constant when comparing models. No provider-specific syntax or negative-prompt feature is required; exclusions are included in the main prompt.

## Selection and delivery checks

- Immediately recognizable as this app's logo; original form and sage accent preserved.
- Feels like shared relief and delight, not competitive achievement or a generic success screen.
- Works at roughly 200–280 CSS pixels wide and at 320px viewport width without tiny essential detail.
- No extra words, typo, fake CTA, family-size assumption or implication that food has already been cooked.
- Soft cream background blends acceptably with the app; alternatively request a truly transparent export if the model supports it, never a baked checkerboard.
- Retain the original full-resolution trial. Record the chosen model/prompt variant alongside the selected asset during implementation, without storing API keys or credentials.
- Export the chosen text-free artwork as an optimized web asset with explicit dimensions. Check real rendering and contrast of HTML headings; visual inspection of a model output alone is not UI validation.

Until a variant is selected, use the existing app logo with the exact two HTML text lines. Do not make final asset selection an implicit prerequisite for implementing and testing the voting behavior.

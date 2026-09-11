# Solar Earth surfaces and motion

Load for relevant WFS surface or transition work. Existing utilities in
[globals.css](../../../pwa/src/app/globals.css), including `.glass`, `.glass-nav`
and `.glass-sage`, own the implemented blur, border and background values.
Use the affected component's established pattern before introducing another utility.

Translucency is useful where it preserves readability; check contrast on the actual
composite background. Retain clear hierarchy and stable layout during asynchronous
updates. Skeletons or spinners should communicate state without moving controls.

Motion should explain an interaction or state change. Reuse existing transitions
and respect reduced-motion preferences; do not add animation, a font, a library or
list staggering just to satisfy an aesthetic checklist. A spring with stiffness
300 and damping 30 is an optional starting example, not a universal constraint.

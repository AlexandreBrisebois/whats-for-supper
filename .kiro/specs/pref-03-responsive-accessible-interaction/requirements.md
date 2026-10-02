# Responsive and Accessible Interaction — Requirements

## Status

**Implemented capability baseline.**

## Current behavior

- **PREF-03-R1.** Shared layout/navigation uses responsive Tailwind layouts, mobile bottom navigation, and safe-area inset padding.
- **PREF-03-R2.** Components commonly provide semantic buttons, labels, pressed/expanded states, dialogs, focus handling, and live status/error regions; tests cover selected controls such as grocery, issue sheet, and capture.
- **PREF-03-R3.** Accessibility is component-owned: there is no repository-wide guarantee that every legacy control is localized, focus-trapped, or keyboard-complete.

## Boundaries and limits

Feature packets own their concrete interaction semantics. PREF-01 owns translated copy and PREF-02 device/install behavior. SSE/API behavior is unchanged by responsive presentation.

# Solar Earth Aesthetic Guidelines

When building UIs, you must adhere to the Solar Earth design language. Avoid generic aesthetics; UIs should feel modern, smooth, and highly responsive.

## Core Principles

1.  **Glassmorphism over Solid Blocks:**
    *   Use semi-transparent backgrounds and backdrop blurs.
    *   Leverage CSS variables defined in `index.css`: `--glass-bg`, `--glass-border`.
    *   **Do not use inline styles or ad-hoc Tailwind classes for opacity/blur unless necessary.**
2.  **Typography & Hierarchy:**
    *   Use modern Google Fonts (Inter, Roboto, Outfit).
    *   Maintain strict heading hierarchy (H1-H6). No skipping heading levels.
3.  **Micro-Animations & Motion (Framer Motion):**
    *   Interactive elements should feel alive. Use Framer Motion for transitions.
    *   **Standard Spring Profile:** `type: "spring", stiffness: 300, damping: 30`
    *   **Lists:** Use `staggerChildren: 0.05` for list rendering.
    *   **Loading:** Implement skeleton loaders or elegant spinners for any async action. Avoid abrupt layout shifts.

## Anti-Patterns

*   **Wrong:** Using hardcoded hex colors (`#FF0000`).
*   **Right:** Using design tokens (`var(--destructive-color)`).
*   **Wrong:** "Jumping" UI elements when state changes.
*   **Right:** Smooth Framer Motion `layoutId` transitions or simple opacity fades.

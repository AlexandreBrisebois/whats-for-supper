# Grocery List Specification: The Efficient Grocer

This document defines the grocery list experience for "What's For Supper". The primary goal is to minimize "store fatigue" by organizing ingredients according to the physical layout of a typical grocery store.

## 1. Overview

The Grocery List is automatically generated from the **Weekly Planner**. It aggregates ingredients across all planned meals and groups them into logical store sections.

## 2. Store-Section Categorization

Every ingredient is assigned a `SectionID` based on its category. The default sort order follows a standard "perimeter-first" store walk:

| Section | Priority | Examples |
| :--- | :--- | :--- |
| **Produce** | 1 | Fruits, Vegetables, Fresh Herbs |
| **Meat & Seafood** | 2 | Chicken, Beef, Fish, Deli |
| **Dairy & Eggs** | 3 | Milk, Cheese, Yogurt, Eggs |
| **Bakery** | 4 | Bread, Tortillas, Pastries |
| **Frozen** | 5 | Frozen veggies, Ice cream |
| **Pantry (Aisles)** | 6 | Oils, Spices, Pasta, Canned goods |
| **Household & Other** | 7 | Paper towels, cleaning supplies |

## 3. Consolidation Logic

- **Unit Normalization**: The agent (`CoordinateFamilyAgent`) attempts to consolidate identical items (e.g., "3 Bell Peppers" + "2 Bell Peppers" = "5 Bell Peppers").
- **Section Fallback**: If an ingredient's section is unknown, it defaults to "Pantry/Other" until categorized by the user or an AI pass.

## 4. UI Design (Solar Earth)

- **Grouping**: Each section is a clear block with a header and a category-specific icon (Sage Green icon for Produce, Terracotta for Meat).
- **Checklist**: Large, thumb-friendly checkboxes.
- **Quantities**: Clearly displayed on the right or below the item name.
- **Persistence**: Checked items are moved to a "Completed" list at the bottom or dimmed.

## 5. User Features

- **Manual Addition**: Users can quickly add one-off items (e.g., "Milk") directly into the correct section.
- **Path Customization (Future)**: Ability to re-order sections to match a specific local store layout.
- **Real-Time Sync**: Ensure that if one family member checks off an item, it reflects on all devices immediately.

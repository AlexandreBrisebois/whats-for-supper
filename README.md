<p align="center">
  <img src="docs/whats-for-supper.webp" alt="What's For Supper?" width="1024" />
</p>

# What's for Supper?

**Swipe, Match, Cook!**

## A supper plan the family helps choose

What's for Supper? helps you **involve the whole family in choosing what’s for supper**. Bring your favourite recipes, weekly meal plan, and shared grocery list together in a self-hosted app for your household.

**Built by your home, for your home.** Your household curates the collection, one recipe at a time. Keep the meals you love, add new favourites, and let it grow with you.

## From family favourites to supper on the table

- **Choose together.** Swipe and vote on recipes in Discovery, then turn those choices into the week’s supper plan.
- **Plan for real life.** See the week at a glance and adjust when plans change.
- **Shop from one shared list.** Planned suppers become a grocery list that stays in sync as the household shops.
- **Cook your way.** Follow the instructions in **Cook's Mode**, or use **View original** to keep the saved recipe card beside you.
- **Find your next supper.** Browse your collection, search for a favourite, or look for similar dishes.

Have a favourite on a handwritten recipe card? Take a photo to add it to your collection. AI helps turn it into a digital recipe and can generate an image of the dish. That image is an illustration, not a photo of a meal you cooked. Check the extracted ingredients and steps against the original before cooking. You can also add recipes from a link or a short description.

Your recipe collection and meal plans are stored on your own server. AI features use Gemini; self-hosting does not mean all processing happens locally. There are no individual accounts to manage; your household shares access through a family passphrase.

## A look inside

These screenshots show the demo app. Select an image to see it at full size.

<table>
  <tr>
    <td align="center" valign="top"><a href="docs/screenshots/demo-discovery.png"><img src="docs/screenshots/demo-discovery.png" alt="Demo Discovery card for Mediterranean Baked Cod with Quinoa, with pass and heart voting controls." width="260" /></a></td>
    <td align="center" valign="top"><a href="docs/screenshots/demo-weekly-planner.png"><img src="docs/screenshots/demo-weekly-planner.png" alt="Demo weekly planner with chosen recipes, a mystery night, and other supper plans." width="260" /></a></td>
    <td align="center" valign="top"><a href="docs/screenshots/demo-cooks-mode.png"><img src="docs/screenshots/demo-cooks-mode.png" alt="Demo Cook's Mode showing quinoa and fish preparation instructions, plus Ingredients and Cooked controls." width="260" /></a></td>
  </tr>
  <tr>
    <td align="center">Choose together.</td>
    <td align="center">Plan your week.</td>
    <td align="center">Cook with your recipe.</td>
  </tr>
</table>

## Run it at home

What's for Supper? is designed for self-hosting with **Docker Compose**. Synology is one way to run it, not a hardware requirement. Start with the public [Compose template](release-template/synology/compose.yaml) and [Synology installation guide](release-template/synology/README.md), adapting host-specific steps if you use another Compose host.

The provided setup needs a Gemini API key, a Cloudflare Tunnel with an HTTPS hostname, and the required secrets in [`.env.example`](release-template/synology/.env.example). It also needs persistent data directories. Follow the guide before deploying, and plan your backups: the template does not configure backup, restore, updates, or rollback. Compatibility and capacity still need checking on your chosen host.

The public installation is available to try. A few last issues remain before v1, and all feedback is welcome.

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-BUSL--1.1-CD5D45?style=flat-square" alt="Business Source License 1.1" /></a>
  <img src="https://img.shields.io/badge/.NET-11_RC2-512BD4?style=flat-square&logo=dotnet" alt=".NET 11 RC2" />
  <img src="https://img.shields.io/badge/Next.js-16.4-black?style=flat-square&logo=next.js" alt="Next.js 16.4" />
  <img src="https://img.shields.io/badge/PostgreSQL-18-336791?style=flat-square&logo=postgresql" alt="PostgreSQL 18" />
  <img src="https://img.shields.io/badge/AI-Gemini_Flash-4285F4?style=flat-square&logo=google" alt="Gemini Flash" />
</p>

## Read on

- [Family guide](docs/user-guide.md) — how planning, shopping, choosing, and cooking fit together.
- [OpenSpec specifications](openspec/specs) — canonical capability requirements; [outstanding baseline work](https://github.com/AlexandreBrisebois/whats-for-supper/issues?q=is%3Aissue+WFS-BL-+in%3Atitle) is tracked in GitHub issues with historical evidence and acceptance criteria.
- [Architecture](docs/architecture.md) — a concise technical view for contributors and operators.
- [Synology installation guide](release-template/synology/README.md) — a concrete Docker Compose setup using Synology Container Manager.
- [Local development guide](LOCAL_DEV_LOOP.md) — contributor setup and day-to-day development.
- [Contributor guide](AGENT.md) — project conventions for human and AI collaborators.

## License

This repository is source-available under the Business Source License 1.1 (BUSL-1.1).

Production use is permitted only for personal, household, or family self-hosting, as described in the [LICENSE](LICENSE).

You may not sell, resell, sublicense, host for third parties, offer as a service, or otherwise operate this project as a commercial or third-party managed service without prior written permission.

On 2030-05-11, this repository will automatically convert to the MIT License.

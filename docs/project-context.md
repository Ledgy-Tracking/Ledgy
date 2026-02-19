# Ledgy — Project Context

> **Status:** Initial Vision / Pre-Planning
> **Owner:** James (sole developer & user)
> **Last Updated:** 2026-02-20

---

## What is Ledgy?

A **personal, AI-powered universal ledger and tracker** — not limited to finances, but capable of tracking *anything*. At its core, it's a ledger-style application enhanced with AI (via Google AI Studio) that can analyze images and auto-generate ledger entries. It features a powerful plugin system, node-based automation, and syncs across platforms using Google/Firebase infrastructure.

**Open source** — designed for personal use with zero profit motive. All hosting/costs borne by the individual user.

---

## Core Principles

| Principle | Details |
|---|---|
| **Single User** | No multi-user accounts, no email/password auth |
| **Multi-Profile** | Multiple isolated profiles per instance (separate data) |
| **Cross-Platform** | Must work across mobile and desktop (stack TBD) |
| **Google Ecosystem** | GCP, Firebase (sync, hosting), Google AI Studio |
| **Open Source** | Community-driven, self-hosted |
| **Plugin-Extensible** | Tailored to any tracking need via installable plugins |

---

## Authentication

- **No email/password** — single-user system
- **TOTP-based security** (Time-based One-Time Password)
- Designed to work seamlessly with **Google Authenticator**
- Lightweight but secure access control

---

## Key Concepts & Terminology

### Projects
- The top-level organizational unit
- Each project has its own **ledger(s)** and **plugin configuration**
- Support for **project templates** (pre-configured starting points)
- Projects can have **multiple ledgers** and **multiple scenes**

### Ledger
- The core data structure — a tracked list of entries
- A project can have **multiple ledgers**
- AI can generate ledger entries from image analysis

### Scenes
- The **parent-most component** — primarily a wrapper for:
  - Navigation
  - Event management
  - State management
- Acts as the top-level container

### Pages
- The **UI parent component** within a scene
- The actual visual layout the user interacts with

### Views
- User-customizable UI components with **parent-child hierarchy**
- Users can create their own views for deep UI customization

### Actions
- **Component-scoped** automation (not to be confused with plugins)
- Triggered by button press or user interaction
- Built using the same **node scripting principle**
- Scoped to a single component level

### Nodes
- A **visual, no/low-code automation scripting** system
- Acts as a **communication layer between two or more projects**
- Example: "Car Maintenance" project auto-links entries to "Expenses" project
- Supports **event-based, schedule-based**, and other trigger types
- Node connections can link projects ↔ projects, and projects ↔ plugins

### Plugins (Two Types)

| Type | Scope | Purpose |
|---|---|---|
| **Project-Scoped** | Bound to a single project | Tailors that project's behavior and capabilities |
| **Nodal/Global-Scoped** | Across projects | System-wide integrations and cross-project functionality |

- Users can **build their own plugins** using:
  - The same node scripting principle
  - **Service integrations** (for advanced plugins)
  - **HTTP requests** (for external API connectivity)

### State Management
- **Global state** — accessible across the entire app
- **Component-to-component state passing** — direct state flow between components

---

## AI Integration

- **Platform:** Google AI Studio (credits-based)
- **Primary Feature:** Analyze a photo/image → AI interprets what the item is and its purpose → auto-generates a new ledger entry
- Future AI capabilities TBD during brainstorming

---

## Infrastructure & Sync

- **Backend/Sync:** Firebase (Firestore or Realtime Database)
- **Hosting:** Google Cloud Platform (GCP) — self-managed by user
- **Auth:** TOTP via Google Authenticator (no Firebase Auth email/pass)
- **Storage:** Firebase Storage for images/media
- Data syncs across all user devices

---

## Cross-Platform Requirement

- Must run on **mobile** (iOS, Android) and **desktop** (Windows, macOS, Linux)
- **Tech stack undecided** — candidates may include:
  - Flutter (Dart)
  - React Native / Expo
  - Kotlin Multiplatform
  - Tauri + web framework
  - Other (to be evaluated)

---

## Open Questions (Pre-Brainstorming)

- [ ] Which cross-platform framework best fits this project's needs?
- [ ] How should the plugin system be architected (sandboxing, API surface, distribution)?
- [ ] How complex should the node scripting editor be for MVP?
- [ ] What's the right data model for universal "track anything" ledgers?
- [ ] How should AI-generated entries be validated/edited by the user?
- [ ] What are the MVP features vs. post-launch features?
- [ ] How should profiles be isolated (separate Firebase projects? Separate collections?)
- [ ] What project templates should ship out of the box?
- [ ] How should plugin marketplace/sharing work (if at all)?
- [ ] How to handle offline-first with sync?

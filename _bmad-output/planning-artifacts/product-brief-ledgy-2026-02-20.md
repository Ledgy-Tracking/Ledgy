---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments: ['brainstorming-session-2026-02-20.md', 'domain-local-first-software-data-sovereignty-research-2026-02-20.md', 'market-personal-tracking-tools-research-2026-02-20.md', 'technical-ledgy-technical-core-research-2026-02-20.md', 'project-context.md']
date: 2026-02-20
author: James
---

# Product Brief: ledgy

<!-- Content will be appended sequentially through collaborative workflow steps -->

## Executive Summary

Ledgy is an open-source, local-first personal data platform designed to break the cycle of "Tracking Abandonment." By moving away from rigid, feature-locked apps and providing a powerful "Toolkit-First" architecture, Ledgy empowers users to build their own tracking systems. It combines flexible ledger structures with a visual node-based scripting engine, allowing for seamless cross-domain correlation (e.g., diet vs. exercise) and leveraging the "ownership effect" to drive long-term engagement.

---

## Core Vision

### Problem Statement

Existing tracking tools suffer from **"Feature Abandonment"**—a cycle where users lose interest as tools hit functional dead-ends or fail to adapt to evolving needs. Rigid schemas and "closed" designs make the act of tracking feel like a tedious chore rather than a creative act of building and discovery.

### Problem Impact

Data remains trapped in disconnected silos (diet, finance, fitness, health), preventing users from gaining holistic insights. Without the ability to correlate data across domains, users are left with "gut feelings" ("I think, I feel") instead of data-driven clarity ("I see it now"). This leads to "productivity theater" and eventual abandonment of tracking altogether.

### Why Existing Solutions Fall Short

- **Specialized Apps:** Feature-rich but rigid; they hit a wall when user needs go beyond the developer's original intent.
- **General Apps (Notion/Obsidian):** Flexible but lack the "ledger-first" structured data engine or the visual automation required for complex tracking.
- **Spreadsheets:** Powerful but high-friction to maintain, difficult to sync reliably, and lack modern UI/AI features.

### Proposed Solution

A **"Toolkit-First" Platform** that prioritizes architectural freedom. Ledgy provides the necessary "building blocks"—flexible relational ledgers, a visual scripting engine, and AI-powered entry—allowing users to compose their own tracking systems. By putting the effort into *building* the system, users are encouraged to stay engaged for the long term.

### Key Differentiators

- **Architectural Freedom:** Not an app with features, but a toolkit for building systems.
- **Cross-Domain Correlation:** The ability to connect disparate project ledgers (e.g., matching heart rate to caffeine intake) to find deep insights.
- **Data Sovereignty:** Local-first architecture (PouchDB/CouchDB) ensures the user owns their data forever.
- **Unified Script Engine:** Visual nodes and plugins share the same powerful engine, enabling complex automation without writing code.
- **AI-Powered Entry:** Leveraging Google AI Studio to reduce data entry friction via image and voice analysis.

---

## Target Users

### Primary Users

**The "Self-Tailored" Tracker (Persona: Alex)**
*   **Context:** Non-tech savvy but highly organized individual who has hit functional "dead ends" with rigid tracking apps (Notion, MyFitnessPal, etc.).
*   **Motivations:** Desires the gratification of owning a system they built themselves. Values freedom over "fancy" pre-built features.
*   **Problem Experience:** Frustrated by data silos; tired of juggling apps and losing interest because the tool doesn't evolve with their needs.
*   **Success Vision:** Long-term usage (6+ months) driven by the "ownership effect." The transition from "tracking is a chore" to "building is a hobby."

### Secondary Users

**The Marketplace Creator / Template Seller**
*   **Context:** Power users who enjoy building sophisticated templates and plugins (similar to the Notion template ecosystem).
*   **Role:** Drives ecosystem growth by providing the "starting points" for primary users. They monetize their expertise by selling complex ledger structures or visual scripting nodes.

### User Journey

1.  **Discovery:** Finds a compelling template online (e.g., "The Ultimate Longevity & Health Tracker") or hears about Ledgy's "Freedom + Tools" philosophy.
2.  **Onboarding:** Installs Ledgy and picks a template. Guided by in-app tutorials and documentation, they make their first "tweak"—adding a custom field or adjusting a view.
3.  **Core Usage:** Starts daily tracking. The AI-powered entry (photo/voice) removes the initial tediousness, keeping them engaged through the first critical 30 days.
4.  **Success Moment:** The "Aha!" moment occurs when they need a feature the template didn't have—and they build it themselves. Whether it's a visual graph correlating two data points or an automation node, they realize they are no longer dependent on a developer's road map.
5.  **Long-term:** Ledgy becomes their "Universal Dashboard." They can no longer look at other tracking apps without feeling restricted. They may begin sharing their own custom "tweak" back to the community.

---

## Success Metrics

### User Success

*   **System Mastery:** A user transitions from using a basic template to successfully building their first custom ledger or visual script node.
*   **Long-Term Utility:** The "Alex" persona (or James) maintains daily tracking for 6+ months without abandonment.
*   **The "Unfair Comparison" Shift:** A user expresses that they "can't go back" to rigid tracking apps after experiencing Ledgy's freedom.

### Project Objectives

*   **Community Growth:** The establishment and steady growth of a dedicated community (e.g., r/Ledgy, Discord) where users share ideas and issues.
*   **Ecosystem Vitality:** A growing repository of community-contributed templates and plugins (the "gratification of sharing").
*   **Self-Utility (The "Dogfooding" Metric):** James utilizes Ledgy as his primary "Universal Ledger" daily for all personal tracking needs.

### Key Performance Indicators (KPIs)

*   **GitHub Engagement:** Stars and forks as a proxy for developer and power-user interest in the "toolkit" aspect.
*   **Template Adoption:** Measurement (qualitative or community-shared) of which templates are most duplicated/customized.
*   **Plugin Diversity:** The number of unique tracking domains covered by community-built plugins (e.g., from car maintenance to mental health).

---

## MVP Scope

### Core Features

*   **Project Engine:** Full lifecycle management (creation, deletion, templates) with multi-profile isolation.
*   **Structured Ledger Engine:** Flexible schema definition with user-defined fields and relational cross-project linking.
*   **Customizable UI (Pages & Views):** Tools to design custom layouts and hierarchical views within each project.
*   **Base Scripting Engine:** Initial visual node-based scripting supporting fundamental arithmetic, string operations, and logical triggers.
*   **AI Capture (Beta):** Image-to-Ledger extraction via Google AI Studio for reducing manual entry friction.
*   **Offline-First Sync:** PouchDB ↔ CouchDB replication with reliable cross-device data persistence.

### Out of Scope for MVP

*   **Advanced Visualizations:** Complex 3D charts or specialized data science widgets (focus on basic graphs/tables first).
*   **Cross-Platform Parity:** While Tauri supports mobile, the first MVP release may focus on Desktop (Windows/macOS) stability before full mobile rollout.
*   **Public Marketplace:** The ability to sell templates/plugins directly in-app (sharing will be manual/GitHub-based initially).
*   **Advanced AI Logic:** Multi-step AI reasoning or autonomous agent workflows (focus on simple extraction first).

### MVP Success Criteria

*   **The "Alex" Test:** A non-technical user can build a custom Diet ↔ Exercise tracking system using only the provided tools and templates.
*   **Stability Gate:** Zero data loss during sync/replication across at least two devices.
*   **Performance:** UI remains responsive (60fps) during node-editor usage and ledger filtering.

### Future Vision

*   **Unified Global Scripting:** Expanding from basic operations to a full-fledged automation ecosystem involving external API house-calls and complex background tasks.
*   **The Ledgy Marketplace:** A central hub for sharing, selling, and discovering community-built templates and plugins.
*   **On-Device AI (Gemini Nano):** Moving from cloud-based extraction to local-first AI for 100% private, zero-latency image analysis.
*   **Enterprise/Shared Projects:** Exploring multi-user or shared-ledger capabilities for household or small-team use.

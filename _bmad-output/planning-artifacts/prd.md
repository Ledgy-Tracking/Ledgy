---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
inputDocuments:
  - 'planning-artifacts\product-brief-ledgy-2026-02-20.md'
  - 'planning-artifacts\research\domain-local-first-software-data-sovereignty-research-2026-02-20.md'
  - 'planning-artifacts\research\market-personal-tracking-tools-research-2026-02-20.md'
  - 'planning-artifacts\research\technical-ledgy-technical-core-research-2026-02-20.md'
  - 'brainstorming\brainstorming-session-2026-02-20.md'
  - 'docs\project-context.md'
documentCounts:
  briefCount: 1
  researchCount: 3
  brainstormingCount: 1
  projectDocsCount: 1
workflowType: 'prd'
classification:
  projectType: 'desktop_app'
  domain: 'general'
  complexity: 'medium'
  projectContext: 'brownfield'
---

# Product Requirements Document - ledgy

**Author:** James
**Date:** 2026-02-20

## Executive Summary

Ledgy is a local-first personal data platform designed to break the cycle of "Tracking Abandonment" caused by rigid, specialized applications. By transitioning from a feature-centric model to a "Toolkit-First" architecture, Ledgy provides the foundational building blocks—relational ledgers, visual scripting, and AI-powered entry—necessary for users to construct bespoke tracking ecosystems. This approach leverages the "ownership effect," transforming status-tracking from a repetitive chore into a creative, evolving hobby.

### Strategic Differentiators
- **Cross-Domain Correlation:** Native ability to link disparate data points (e.g., matching heart rate to caffeine intake) without data silos.
- **Architectural Freedom:** Decoupled relational data engine allows users to define custom schemas without mid-stream logic breakage.
- **Data Sovereignty:** Private, user-controlled sync layer ensures 100% data lifetime insurance and privacy.
- **AI-Powered Entry:** Integration with Google AI Studio for high-accuracy image-to-ledger extraction, reducing data entry friction to a single capture.

## Project Classification

- **Project Type:** Desktop Application (Tauri 2.0 shell, Rust backend, React/TS frontend).
- **Domain:** Personal Productivity / Universal Life-Tracking.
- **Complexity:** Medium-High (Local-first sync, relational data integrity, visual scripting).
- **Project Context:** Brownfield (Built on established architectural research and vision docs).

## Success Criteria

### Measurable Outcomes
- **Sync Performance:** Cross-device data propagation occurs in < 2 seconds on stable connections.
- **AI Accuracy:** > 90% success rate in extraction of structured entries from mobile camera photos via Google AI Studio.
- **System Mastery:** A non-technical user successfully builds a custom relation between two ledgers using visual nodes within their first session.
- **Retention:** User maintains daily engagement 6+ months post-setup, proving the ownership effect overcomes abandonment.
- **Cost Efficiency:** Sync and hosting infrastructure remains within 100% free tiers of GCE/Firebase.

### Technical Benchmarks
- **Zero Data Loss:** 100% reliability in PouchDB ↔ CouchDB replication across three unique device profiles.
- **Node Performance:** Visual editor maintains 60fps with 100+ active nodes.
- **Binary Density:** Desktop installation package remains < 10MB (Windows/Mac/Linux).

## Product Scope

### MVP - Minimum Viable Product (Phase 1)
- **Core Engine:** Project lifecycle management with multi-profile isolation.
- **Relational Ledger:** Flexible schema definition with user-defined fields and bidirectional references.
- **Visual Scripting (Beta):** Node-based editor for arithmetic, logic, and ledger automation.
- **AI Entry (Beta):** Image-to-ledger extraction via Google AI Studio.
- **Offline-First Sync:** PouchDB ↔ CouchDB replication with manual conflict diff UI.
- **Security:** TOTP-based security via Google Authenticator.

### Growth & Vision (Phase 2+)
- **Marketplace:** Public discovery and sharing of community-contributed templates.
- **Advanced Visualizations:** Specialized data science and charting widgets.
- **Advanced AI Agents:** Multi-step reasoning and autonomous background triggers.
- **Private AI:** Migration to **Gemini Nano** for zero-latency, 100% local image analysis.

## User Journeys

### Journey 1: Alex (The "Self-Tailored" Tracker)
- **Problem:** Alex cannot find an app that correlates caffeine intake with sleep quality.
- **Action:** Alex selects the "Wellness" template, adds a custom "Stress" field, and uses **AI Capture** to log their coffee. They use the **Node Editor** to link "Caffeine Ledger" to "Sleep Ledger."
- **Outcome:** A correlation graph reveals that > 200mg caffeine = 20% less deep sleep. Alex feels "Ownership" and continues tracking.

### Journey 2: Jordan (The Marketplace Creator)
- **Problem:** Jordan has a complex "Vehicle Longevity Tracker" in a spreadsheet but lacks mobile sync.
- **Action:** Jordan builds a specialized project in Ledgy with "Parts Inventory" and "Maintenance Logs." They create a "Maintenance Reminder" node based on mileage.
- **Outcome:** Jordan shares the project JSON on Discord. Dozens of users adopt the "Ultra Car-Care Template."

### Journey 3: James (Admin/Ops)
- **Problem:** James needs to ensure data integrity during a device switch.
- **Action:** James receives a "Conflict Pending" warning. He uses the **Manual Conflict Diff UI** to compare mobile vs. desktop entries, identifies a mobile typo, and accepts the desktop version.
- **Outcome:** Data is synced to his private GCE CouchDB instance with 100% accuracy.

## Domain-Specific Requirements (Local-First & Data Sovereignty)

### Compliance & Regulatory
- **Right to be Forgotten:** A "Delete Profile" action must permanently purge local (PouchDB) and remote (CouchDB) replicas.
- **Data Portability:** System must support standardized JSON export/import for all projects to prevent platform lock-in.

### Technical Constraints
- **Zero-Knowledge Encryption:** Remote data must be encrypted client-side with user-controlled keys.
- **Ghost References:** System must handle "Dangling References" (where a linked entry is deleted on another device) via a soft-delete pattern to maintain relational integrity.
- **Schema Versioning:** Every entry must include a `schema_version` metadata field to support JIT migrations and backward compatibility.

## Desktop App Specific Requirements (Tauri 2.0)

### Platform & Update Strategy
- **Targets:** Native binary support for Windows, macOS, and Linux.
- **Auto-Update:** Leveraging Tauri's updater for non-intrusive, "Pull-based" binary and schema updates.
- **Privacy Footprint:** Zero telemetry or mandatory background pushes; no System Tray or Global Hotkeys required for MVP to ensure a non-intrusive OS presence.

### Offline-First Architecture
- **Core Autonomy:** 100% operational without an internet connection. UI and local journals are served locally.
- **Sync Trigger:** Remote replication activates only upon network detection and explicit user configuration of a private endpoint.

## Innovation & Novel Patterns

### The Ownership Moat
- **Toolkit-First Philosophy:** Shifting user retention from passive consumption to active building.
- **Visual Synthesis:** Native node-graph correlation of disparate life domains (e.g., fuel efficiency vs. grocery expenses).
- **Hybrid Local AI:** Combined 100% private storage with JIT Cloud AI extraction, balancing privacy and friction.
- **Conflict Transparency:** Turning technical sync challenges into a human-governed "Data Insurance" feature.

## Functional Requirements (Capability Contract)

### 1. Relational Ledger Engine
- **FR1:** Users can define schemas with custom field types (Text, Number, Date, Relation).
- **FR2:** Users can perform CRUD operations on any ledger.
- **FR3:** Users can establish bidirectional relational links between disparate ledger entries.
- **FR4:** Users can export/import project data as standardized JSON.

### 2. Visual Scripting & Dashboard
- **FR5:** Users can create automation logic via a drag-and-drop node editor.
- **FR6:** Users can connect data points using specialized Correlation Nodes.
- **FR7:** Users can define triggers (On-Create, On-Edit) for autonomous node execution.
- **FR8:** Users can configure custom dashboard layouts with visualization widgets (Charts, Trends).

### 3. AI-Assisted Entry
- **FR9:** Users can upload/capture images for high-accuracy field extraction via Google AI Studio.
- **FR10:** Users can review and edit AI-extracted data before ledger commitment.
- **FR11:** System must treat images as ephemeral unless the user explicitly saves them as attachments.

### 4. Sync, Security & Admin
- **FR12:** System replicates data to user-configured CouchDB/Firebase endpoints.
- **FR13:** Users can resolve sync conflicts via a side-by-side Diff UI.
- **FR14:** Users can protect sensitive data via client-side encryption and TOTP authentication.
- **FR15:** Users can manage multiple isolated project profiles within a single installation.
- **FR16:** Users can package project structures (Schema + Nodes) as shareable template files.

## Non-Functional Requirements (Quality Attributes)

### Performance & Efficiency
- **Input Latency:** Data entry fields must respond in < 50ms.
- **Visual Fluidity:** Node editor must maintain 60fps with 100+ active nodes during pan/zoom.
- **Binary Footprint:** Installation package < 10MB; idle RAM usage < 100MB.

### Security & Reliability
- **Data Integrity:** 100% recovery rate from dangling references via Ghost Reference pattern.
- **Privacy:** Zero mandatory telemetry; encryption must use AES-256 or equivalent.
- **Offline Durability:** All mutations must be written to the local journal before confirmation to ensure zero loss on app crash.

### Accessibility
- **Standards:** Dashboard and ledger views must target WCAG 2.1 Level AA compliance.

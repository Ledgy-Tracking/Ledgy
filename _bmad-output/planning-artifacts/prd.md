---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete', 'step-e-01-discovery', 'step-e-02-review', 'step-e-03-edit']
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
workflow: 'edit'
classification:
  projectType: 'desktop_app'
  domain: 'general'
  complexity: 'medium'
  projectContext: 'brownfield'
date: '2026-02-28'
lastEdited: '2026-02-28'
editHistory:
  - date: '2026-02-28'
    changes: 'Rewrote FRs and NFRs to BMAD standards; added Project-Type section; added test metrics to Success Criteria; covered broken traceability with new User Journeys.'
---

# Product Requirements Document - ledgy

**Author:** James
**Date:** 2026-02-20

## Executive Summary

Ledgy is a local-first personal data platform designed to break the cycle of "Tracking Abandonment" caused by rigid, specialized applications. By transitioning from a feature-centric model to a "Toolkit-First" architecture, Ledgy provides the foundational building blocks—relational ledgers and visual scripting—necessary for users to construct bespoke tracking ecosystems. Functionality is extended through a first-party plugin system; the AI Capture plugin (bundled by default) reduces data entry friction via image analysis, while remaining fully removable and replaceable. This approach leverages the "ownership effect," transforming status-tracking from a repetitive chore into a creative, evolving hobby.

### Strategic Differentiators
- **Cross-Domain Correlation:** Native ability to link disparate data points (e.g., matching heart rate to caffeine intake) without data silos.
- **Architectural Freedom:** Decoupled relational data engine allows users to define custom schemas without mid-stream logic breakage.
- **Data Sovereignty:** Private, user-controlled sync layer ensures 100% data lifetime insurance and privacy.
- **Plugin-First Extensibility:** A first-class plugin system ships with a default AI Capture plugin (Google AI Studio image-to-ledger extraction), with the core engine remaining lean and AI-free by design.

## Project Classification

- **Project Type:** Universal Web Application (Optional: Tauri 2.0 shell).
- **Domain:** Personal Productivity / Universal Life-Tracking.
- **Complexity:** Medium-High (Local-first sync, relational data integrity, visual scripting).
- **Project Context:** Brownfield (Built on established architectural research and vision docs).

## Success Criteria

### Measurable Outcomes
- **Sync Performance:** Cross-device data propagation occurs in < 2 seconds on stable connections as measured by automated end-to-end sync testing logs.
- **AI Capture Plugin Accuracy:** > 90% success rate in extraction of structured entries from mobile camera photos via the default-bundled AI Capture plugin as measured by QA sample image extraction tests.
- **System Mastery:** A non-technical user successfully builds a custom relation between two ledgers using visual nodes within their first session as measured by user testing observation scenarios.
- **Retention:** User maintains daily engagement 6+ months post-setup, proving the ownership effect overcomes abandonment as measured by monthly active usage metrics.
- **Cost Efficiency:** Sync and hosting infrastructure remains within 100% free tiers of cloud providers as measured by monthly cloud billing reports.

### Technical Benchmarks
- **Zero Data Loss:** 100% reliability in local-to-remote database replication across three unique device profiles as measured by multi-device conflict resolution integration tests.
- **Node Performance:** Visual editor maintains 60fps with 100+ active nodes as measured by browser DevTools performance profilers.
- **Browser Compatibility:** Core functions operational in modern web browsers (Chrome/Firefox/Safari) without native OS fallbacks as measured by Playwright cross-browser test suites.

## Product Scope

### MVP - Minimum Viable Product (Phase 1)
- **Core Engine:** Project lifecycle management with multi-profile isolation.
- **Relational Ledger:** Flexible schema definition with user-defined fields and bidirectional references.
- **Visual Scripting (Beta):** Node-based editor for arithmetic, logic, and ledger automation.
- **Plugin Runtime:** First-party plugin system with a default-bundled AI Capture plugin (image-to-ledger extraction via Google AI Studio).
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
- **Outcome:** Data is synced to his private database instance with 100% accuracy.

### Journey 4: Casey (The Security/Privacy Advocate)
- **Problem:** Casey tracks highly sensitive personal data and refuses to use cloud services that can access their tracking habits.
- **Action:** Casey sets up Ledgy, configures client-side encryption with a secure key, and tests the "Data Annihilation" feature to ensure all local and remote data can be instantly wiped if needed.
- **Outcome:** Casey is confident that their data is 100% private, impenetrable, and under their exclusive control.

### Journey 5: Riley (The Plugin Developer)
- **Problem:** Riley wants to create a third-party plugin that logs Spotify listening history, but the Ledgy platform must ensure the plugin cannot access unrelated personal ledgers.
- **Action:** Riley develops a plugin using the provided sandboxed abstraction hooks. The plugin makes external API calls to Spotify but is fundamentally restricted from reading the core database.
- **Outcome:** Riley publishes the plugin successfully, ensuring users can install it knowing it operates securely within the sandboxed runtime.

## Domain-Specific Requirements (Local-First & Data Sovereignty)

### Compliance & Regulatory
- **Right to be Forgotten:** A "Delete Profile" action must permanently purge local (PouchDB) and remote (CouchDB) replicas.
- **Data Portability:** System must support standardized JSON export/import for all projects to prevent platform lock-in.

### Technical Constraints
- **Zero-Knowledge Encryption:** Remote data must be encrypted client-side with user-controlled keys using standard WebCrypto APIs.
- **Ghost References:** System must handle "Dangling References" (where a linked entry is deleted on another device) via a soft-delete pattern to maintain relational integrity.
- **Schema Versioning:** Every entry must include a `schema_version` metadata field to support JIT migrations and backward compatibility.

## Deployment Specific Requirements

### Platform & Update Strategy
- **Targets:** primary deployment via Web Browser, followed by native binaries via Tauri wrapper.
- **Auto-Update:** standard web-deployment caching or PWA strategies for browser; Tauri updater for binaries.
- **Privacy Footprint:** Zero telemetry or mandatory background pushes.

### Offline-First Architecture
- **Core Autonomy:** 100% operational without an internet connection. UI and local journals are served locally (e.g. via Service Workers).
- **Sync Trigger:** Remote replication activates only upon network detection and explicit user configuration of a private endpoint.

## Innovation & Novel Patterns

### The Ownership Moat
- **Toolkit-First Philosophy:** Shifting user retention from passive consumption to active building.
- **Visual Synthesis:** Native node-graph correlation of disparate life domains (e.g., fuel efficiency vs. grocery expenses).
- **Hybrid Plugin AI:** The default-bundled AI Capture plugin pairs 100% private local storage with JIT Cloud AI extraction via Google AI Studio, balancing privacy and friction—without coupling AI to the core engine.
- **Conflict Transparency:** Turning technical sync challenges into a human-governed "Data Insurance" feature.

## Project-Type Requirements (Desktop App)

### Platform Support
- Primary deployment as a native desktop application via Tauri 2.0 (Windows/macOS/Linux).
- Fallback web browser access for universal availability.

### Update Strategy
- Automatic background updates via Tauri updater for native binaries.
- Standard web-deployment caching for the browser version.

### Offline Capabilities
- 100% operational offline. The application must load, allow data entry, processing, and visual scripting without any internet connection.

## Functional Requirements (Capability Contract)

The system requires exhaustive capability specifications to ensure all functional edge cases, workflows, and constraints are met before architecture selection. These capabilities are tracked against the predefined User Journeys.

### 1. General Navigation & Project Management
- **FR1:** Users can create, edit, duplicate, and delete isolated tracking "Projects" (workspaces), ensuring that data schemas and entries do not cross-pollinate between distinct projects.
- **FR2:** Users can quickly switch between active projects within 200ms, preserving the last-viewed state (e.g., active dashboard layout, scroll position) of the previous project upon return.
- **FR3:** Users can perform a global full-text search across all ledger entries, node names, and dashboard widgets within the active project, returning paginated results prioritized by relevance.
- **FR4:** Users can apply multi-layered filters (e.g., "Date > X AND Tag = Y") to any data view, with the system updating the visible entries instantaneously to reflect the filtered dataset.
- **FR5:** Users can securely authenticate their local profile using a secondary authentication factor (TOTP) during the initial device onboarding or sensitive administrative actions.

### 2. Relational Ledger Engine (Core Data Architecture)
- **FR6:** Users can define and modify custom data schemas by adding, renaming, or removing field properties. Allowed field types include: Short Text, Long Text, Number, Date/Time, Boolean, Select (Dropdown), Multi-Select, and Relational Link.
- **FR7:** Users can define strict validation constraints per field within a schema, including minimum/maximum numeric values, required (non-null) flags, character length limits, and custom Regular Expression patterns.
- **FR8:** The system can reject data entries that fail schema validation, instantly presenting specific, localized error messages adjacent to the offending input field.
- **FR9:** Users can establish bidirectional, "many-to-many" relational links between entries residing in disparate ledgers via a searchable, auto-completing selection interface.
- **FR10:** The system can preserve historical data integrity during deletion events; when a referenced entry is deleted, the system applies a soft-deletion flag rather than executing cascading deletes, ensuring historic correlations remain intact.
- **FR11:** Users can execute bulk modifications (e.g., update a specific field value across 500 selected entries) and bulk deletions simultaneously, with the system providing a progress indicator or immediate confirmation.
- **FR12:** Users can undo and redo up to 50 sequential ledger modifications (creates, updates, deletes) made during their current active session, reverting the data state incrementally.
- **FR13:** Users can initiate a complete export of their project's structural schemas, visual layouts, and ledger datasets into a standardized, unencrypted JSON archive format.
- **FR14:** Users can import a valid JSON archive into a new project workspace, with the system accurately reconstructing the schemas, entries, and visual nodes.
- **FR15:** The system can automatically retrieve and flatten deeply nested relational data (up to 3 levels deep) for continuous, lag-free UI presentation in data tables.

### 3. Workspace Views & Dashboard Visualizations
- **FR16:** Users can toggle raw ledger data between multiple presentation views: Tabular (Spreadsheet), Grid (Gallery/Cards), and Time-Series (Calendar/Timeline).
- **FR17:** Users can configure custom sorting hierarchies (e.g., "Sort by Date Descending, then by Amount Ascending") and grouping logic within any ledger view.
- **FR18:** Users can configure personalized dashboard layouts containing multiple visualization widgets (e.g., Bar Charts, Line Trends, Scatter Plots, Metric Counters).
- **FR19:** The system can dynamically update dashboard visualization widgets in real-time as the underlying ledger data or visual logic flows are modified.
- **FR20:** Users can resize and position dashboard widgets on a persistent, visually-guided grid system, with the application serializing and restoring the exact layout across user sessions.
- **FR21:** Users can pin frequently accessed ledger views, specific node graphs, or individual dashboards to a persistent navigation sidebar for single-click access.

### 4. Node Forge (Visual Scripting & Graph Engine)
- **FR22:** Users can construct complex custom logic flows and automated data transformations by placing, connecting, and configuring functional nodes on an infinite two-dimensional canvas.
- **FR23:** Users can navigate large node graphs using an interactive minimap overlay, execute zoom-to-fit commands, and seamlessly pan across the canvas space.
- **FR24:** The system can explicitly prevent the connection of incompatible node inputs and outputs (e.g., barring a Text array output from connecting to a Boolean input port) via rigid edge-snapping validation rules.
- **FR25:** Users can select multiple interconnected nodes and collapse them into a single, labeled "Sub-Graph Container" to abstract complexity and organize the visual workspace.
- **FR26:** The system can identify and instantly sever cyclic dependencies (infinite loops) during the edge wiring process, preventing execution lockups.
- **FR27:** The system can explicitly isolate heavy node computations (e.g., iterating through multiple ledger entries for correlation plotting) to an asynchronous execution layer, guaranteeing the primary UI remains responsive.
- **FR28:** Users can insert specific "Trigger Nodes" that autonomously initiate logic flow executions based on defined events (e.g., "On Entry Created in Ledger X", "On Scheduled Interval").
- **FR29:** Users can insert "Operator Nodes" providing native support for arithmetic (Add, Subtract), logic (If/Else, AND/OR), temporal calculations (Date Diff), and string manipulation capabilities.
- **FR30:** Users can interact with nodes seamlessly; canvas panning, zooming, and node repositioning must execute without lagging the underlying application state.

### 5. Sync Engine, Administration & Security
- **FR31:** The system can automatically detect the presence of network connectivity and resume the replication of incremental data deltas to the user's configured remote storage endpoint.
- **FR32:** The system can detect disparate data modifications between the local and remote stores, automatically pausing the sync process when a direct conflict occurs.
- **FR33:** Users can manually inspect sync conflicts through a dedicated "Diff Guard" UI interface, comparing the local and remote objects side-by-side and explicitly choosing which version to accept and propagate.
- **FR34:** Users can configure client-side data encryption by supplying a master passphrase, utilizing industry-standard symmetric cryptography (e.g., AES-256) to secure data prior to remote transmission.
- **FR35:** The authentication system can automatically enforce exponentially escalating temporal delays following multiple failed login attempts to definitively thwart brute-force password guessing.
- **FR36:** Users can execute a specialized "Total Annihilation" routine that systematically unlinks, overwrites, and permanently purges both local storage replica clusters and remote endpoint replicas upon explicit confirmation.
- **FR37:** The system can export a human-readable, chronological audit log detailing all major administrative actions (e.g., sync errors, destructive deletes, plugin installations) taken by the user.

### 6. Plugin Runtime & AI Capture (External I/O)
- **FR38:** Users can browse, install, and disable distinct third-party plugins that extend system functionality (e.g., custom chart types, external API connectors).
- **FR39:** The system can execute installed plugins within a secured, restricted sandbox environment that explicitly blocks direct reading, writing, or deletion operations against the core database.
- **FR40:** The system requires plugins to interface exclusively through permissioned, abstract API hooks explicitly granted by the user at installation time.
- **FR41:** Users can interface with the bundled "AI Capture" plugin by supplying photographic image inputs from their device camera or filesystem.
- **FR42:** The system can transmit user-supplied images to the integrated AI inference endpoint solely via ephemeral memory buffers, guaranteeing the source media is explicitly discarded post-analysis without being saved to local persistent storage.
- **FR43:** The system can present structured data payloads drafted by the AI plugin to the user in a staging review format, requiring the user to explicitly confirm ("Show Before Save") or discard the draft before any entries are committed to the ledger.

## Non-Functional Requirements (Quality Attributes)

### Performance & Efficiency
- **NFR1:** The system shall process data entry field inputs with an interaction latency of under 50ms as measured by automated UI performance profiling, ensuring responsive typing.
- **NFR2:** The system shall render the visual logic canvas at consistently 60 frames per second while displaying up to 100 active nodes during panning and zooming, as measured by browser rendering timelines.
- **NFR3:** The system shall maintain an idle RAM footprint of under 100MB and an installation package size of under 10MB as measured by OS resource monitoring tools.

### Security & Reliability
- **NFR4:** The system shall successfully resolve 100% of dangling reference scenarios natively via the soft-deletion pattern, as measured by automated relational integrity tests.
- **NFR5:** The system shall encrypt private user data at rest and in transit using cryptographic standards without transmitting telemetry, as measured by security code audits.
- **NFR6:** The system shall write all data mutations to a local persistent journal before confirming the action to the user, ensuring zero data loss during application crashes, as measured by simulated crash recovery tests.

### Accessibility
- **NFR7:** The system shall meet WCAG 2.1 Level AA compliance for the core dashboard and ledger entry views as measured by automated accessibility scanning tools and manual keyboard navigation tests.

---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories']
inputDocuments:
  - 'planning-artifacts/prd.md'
  - 'planning-artifacts/architecture.md'
  - 'planning-artifacts/ux-design-specification.md'
---

# ledgy - Comprehensive Epic Breakdown

## Overview

This document provides the deeply granular epic and atomic story breakdown for ledgy, completely decomposing the advanced "Toolkit-First" architecture into highly specific, implementable, and testable units.

## Epic List

1. **Epic 1: App Foundation & Core Security** (11 Stories)
2. **Epic 2: Profiles & Project Management** (8 Stories)
3. **Epic 3: Relational Ledger Engine** (16 Stories)
4. **Epic 4: Node Forge (Visual Scripting Engine)** (15 Stories)
5. **Epic 5: Dashboard & Live Widgets** (7 Stories)
6. **Epic 6: Offline Sync, Conflicts & Data Sovereignty** (10 Stories)
7. **Epic 7: Plugin Runtime & AI Capture** (8 Stories)
8. **Epic 8: Technical Debt & System Stability** (5 Stories)

---

## Epic 1: App Foundation & Core Security
Establish the bare-metal architecture, routing, encryption wrappers, and shell layout.

- **1.1 Scaffold & Dependency Tree:** Initialize Tauri + React + Vite + Tailwind CSS. Verify build sizes (<10MB).
- **1.2 React Router & Error Boundaries:** Set up the global routing shell and catch-all error boundaries delegating to `<ErrorToast />`.
- **1.3 Zustand Store Topology:** Implement the strict global store initialization pattern (No local `useState` for async layers).
- **1.4 Three-Panel Shell Layout:** Implement the responsive sidebar, main canvas, and inspector rail with collapsible states.
- **1.5 PouchDB Core Initialization:** Wrap the browser IndexedDB layers into the primary `db.ts` abstraction.
- **1.6 TOTP Registration UI:** Build the QR code generation and Google Authenticator scanning hook.
- **1.7 WebCrypto AES-256 Engine:** Implement the HKDF key derivation from the TOTP secret and expose in-memory encrypt/decrypt primitives.
- **1.8 Auth Guard & Session Routing:** Wrap all routes to bounce unauthenticated users back to the `/unlock` screen.
- **1.9 Global App Settings Store:** Allow toggle of Dark/Light modes and UI density.
- **1.10 GitHub Actions CI/CD Automations:** Configure the yaml workflows for native Windows/macOS/Linux builds on tag pushes.
- **1.11 Auth Rate Limiting & Escalating Delays:** Implementing exponential temporal delays on failed login attempts to thwart brute-force guessing.

---

## Epic 2: Profiles & Project Management
Isolated sub-databases for distinct domains of a user's life.

- **2.1 Profile DB Segregation Logic:** Ensure `create_profile` generates a distinctly named PouchDB instance isolated from others.
- **2.2 Profile Selector Canvas:** The main hub screen showing cards for all existing profiles.
- **2.3 Profile Creation Flow:** The UI/UX for capturing profile name and icon.
- **2.4 First-Launch Empty State Experience:** Interactive onboarding guidance for brand-new installations.
- **2.5 Profile Deletion & Safety Lock:** Destructive action dialog requiring user to type the profile name to confirm hard purge.
- **2.6 Cross-Profile Storage Memory Sweeps:** Ensure that loading a new profile forcefully drops the previous profile's data from React memory to prevent leaks.
- **2.7 Template Engine (JSON Export):** Serializing a profile's schema metadata into a portable JSON structure.
- **2.8 Template Engine (JSON Import):** Scaffold a fresh profile by parsing an external `.ledgy.json` template.

---

## Epic 3: Relational Ledger Engine (Core Data)
The absolute core of the data layer. 15 atomic stories capturing the validation, tables, relations, and offline-durability.

- **3.1 PouchDB Document Adapters:** Strict generic wrappers forcing the `{type}:{uuid}` ID scheme and date stamping.
- **3.2 Schema Strict Validation Engine:** The Zod or Yup validation runner that blocks PouchDB writes if entries violate constraints.
- **3.3 Schema Builder - Type Configuration Store:** The state machine managing active editing of a new schema before saving.
- **3.4 Schema Builder - Text & Number UI:** The inspector forms to define limits, max lengths, and RegEx rules for basic types.
- **3.5 Schema Builder - Date & Relation UI:** The inspector forms for relational targeting (preventing self-target loops).
- **3.6 Schema Migration JIT Engine:** Function to automatically bump older entries to the newest version schema upon read.
- **3.7 Data Lab - Tanstack Virtualized Core:** The main grid utilizing `@tanstack/react-virtual` to handle 10,000+ rows smoothly.
- **3.8 Data Lab - Header & Custom Sorting:** Drag-to-resize columns and multi-column sorting state.
- **3.9 Data Lab - Keyboard-First Inline Entry Row:** The `N` hotkey listener spawning the top row for <50ms rapid entry.
- **3.10 Data Lab - Relation Combobox Querying:** The optimized fuzzy-search dropdown to link distant ledger entries without lag.
- **3.11 Data Lab - Focus Management:** `Tab`, `Shift+Tab`, `Enter`, and `Escape` handlers locking focus entirely within the grid cells.
- **3.12 Data Lab - Bulk Selection & Edit States:** Checkbox column to allow mass-deletion or tag assignment.
- **3.13 Bidirectional Link Writing:** The sync logic ensuring if A links to B, B's document is updated with A's backlink.
- **3.14 Ghost Reference Fallback Rendering:** The UI safety mechanism preventing crashes when a cell points to a deleted UUID.
- **3.15 Local Undo/Redo Stack:** Intercepting PouchDB actions within a 15-minute window to allow `Ctrl+Z` rollbacks.

---

## Epic 4: Node Forge (Visual Scripting Engine)
The drag-and-drop workspace where schemas talk to each other.

- **4.1 React Flow Canvas Core & Viewport:** The main infinite `<ReactFlow>` wrapper spanning the screen layout.
- **4.2 Node Store & Debounced Persistence:** The global state tracking X/Y coordinates, serializing to PouchDB 1 second after drag stop.
- **4.3 Minimap & Zoom-to-Fit Controls:** The HUD elements allowing fast navigation of massive 100+ node graphs.
- **4.4 Ledger Source Node Component:** Visual block exposing a ledger's schema fields as hookable outputs.
- **4.5 Correlation Node (Math) Component:** Visual block defining basic arithmetic or Pearson's coefficient targets.
- **4.6 Complex Edge Connection Snapping:** The magnetic wire logic connecting node handles.
- **4.7 Strict Edge Type Validation:** Logic to explicitly reject wiring a Text output into a Date input, dropping the dragged wire gracefully.
- **4.8 Sub-Graph Container Grouping:** Ability to lasso 5 nodes and bundle them into a single parent folder node for workspace tidiness.
- **4.9 Graph PouchDB Hydration Hooks:** The real-time queries pushing live ledger numbers into the visual Graph memory.
- **4.10 Web Worker Computation Offloading:** Thread isolation so complex Pearson correlation math on 10k rows doesn't freeze the canvas pan/zoom thread.
- **4.11 Cyclic Dependency Prevention Engine:** The traversal algorithm executing on wire-drop that throws an error if A triggers B triggers A.
- **4.12 Autonomous Trigger Nodes (On-Create):** Nodes listening to the global event bus for specific Ledger mutations to fire.
- **4.13 Autonomous Trigger Action Nodes:** The final tail nodes that successfully write *new* data back into PouchDB autonomously.
- **4.14 Trigger Execution Depth Limiter:** The safety circuit breaker stopping rogue scripts after 100 recursive hops.
- **4.15 Node Engine Keyboard Shortcuts & Group Ops:** `Shift+Click` multi-select, copy (`Cmd+C`), paste (`Cmd+V`) graph segments, and `Delete`.

---

## Epic 5: Dashboard & Live Widgets
Where the computed Node outputs become glanceable health indicators.

- **5.1 CSS Grid Layout Serialization:** The persistent array saving the X/Y width/height positions of user-arranged blocks.
- **5.2 Widget Drag & Drop Resizing Shell:** The interactive frame allowing users to customize their view.
- **5.3 Bar & Line Trend Component Kernels:** The wrapper implementing D3 or Recharts to visualize the node arrays.
- **5.4 Metric Counter & Delta Components:** Simple text-based widgets showing "Total Sleep: -5% from last week".
- **5.5 Widget to Node Forge Data Piping:** The listener hooks subscribing widgets to specific Node Store `Output` handles.
- **5.6 Dashboard Read-Only Safeguard:** Ensuring no ledger mutations can occur from the dashboard grid.
- **5.7 Pinned Views Navigation Sidebar:** Pin frequently accessed ledger views, node graphs, or dashboards to a persistent sidebar.

---

## Epic 6: Offline Sync, Conflicts & Data Sovereignty
The core value prop: own your data, sync it safely.

- **6.1 Remote CouchDB Socket Connectors:** The polling hooks checking network activity and auth status against a distant endpoint.
- **6.2 Delta-Chunk Transmission Logic:** The PouchDB replicator initialized in `sync` mode.
- **6.3 Sync Status Global HUD Badge:** The pulse/color indicators showing Synced, Pending, or Conflict counts globally in the shell.
- **6.4 Conflict Detection Store Traversal:** Background checker searching the local DB for the generic `_conflicts` flag array from Pouch.
- **6.5 Diff Guard Layout Modal:** The intense side-by-side GUI showing "Desktop Version" against "Mobile Version".
- **6.6 Diff Guard Field-Level Merging:** Allowing the user to accept the "Sleep" number from Mobile, but the "Notes" text from Desktop.
- **6.7 Exponential Backoff Network Retry:** The silent failover logic ensuring failed remote servers don't drain laptop battery spam-pinging.
- **6.8 Total Remote Annihilation (Right to be Forgotten):** A specific payload executing an administrative DB-Wipe remote command.
- **6.9 E2E Payload Envelope Wrapping:** The interceptor grabbing PouchDB docs *just before* transmission and applying AES-GCM wrapping.
- **6.10 Manual HTML/CSV Export Adapters:** Plaintext data dumps for users paranoid about app lock-in.

---

## Epic 7: Plugin Runtime & AI Capture
The extension points to bring data in without fatiguing the user.

- **7.1 Plugin Sandbox Isolation Proxy:** The Javascript runtime preventing third-party codes from reading global Zustand stores directly.
- **7.2 AI Capture Overlay UI Shell:** The quick-capture `Cmd+Shift+A` modal prompting for an image paste or webcam snap.
- **7.3 Image Ephemerality Blobs:** Memory optimization wiping the camera feed payload from RAM immediately when the modal closes (zero disk writes).
- **7.4 Google AI Studio Payload Configurator:** The REST caller passing the active ledger schema + image bytes securely to the Gemini API.
- **7.5 API Key Local Vault:** Storage adapter saving user's keys locally without syncing them globally.
- **7.6 Dynamic Prompt Formulation:** AI engine script that reads the strict schema definitions and creates a JSON execution map to enforce AI type safety.
- **7.7 Review Draft Card UI (Show Before Save):** The explicit visual barrier forcing users to review the AI's parsed numbers before confirming.
- **7.8 Draft Committer Adapter:** The final bridge moving the confirmed Draft JSON into a real Ledger `create_entry` action.

---

## Epic 8: Technical Debt & System Stability
To ensure 60fps performance and long-term maintainability.

- **8.1 Zustand & React Flow Bridge Standardization:** Forcing `useShallow` and `onNodeDragStop` debouncing to stop circular re-renders in the Node Forge.
- **8.2 PouchDB DB-Compaction Scheduler:** Background task to vacuum old revision histories to keep local IndexedDB storage sizes minimal.
- **8.3 Vite Tree-Shaking Guardrails:** CI/CD step ensuring the bundle size map doesn't bloat past 5MB from heavy D3/Graph dependencies.
- **8.4 Vitest Test Coverage Minimums:** Enforcing 80% coverage on core data layer functions in `src/lib/`.

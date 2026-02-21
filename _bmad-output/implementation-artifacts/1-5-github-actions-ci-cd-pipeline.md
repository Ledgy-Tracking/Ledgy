# Story 1.5: GitHub Actions CI/CD Pipeline

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want a GitHub Actions workflow that builds and releases native binaries on every tagged release,
So that distribution is automated and reproducible across all platforms.

## Acceptance Criteria

1. **Given** a git tag is pushed to `main`
   **When** the GitHub Actions `build.yml` workflow runs
   **Then** native Tauri binaries are produced for Windows (.msi), macOS (.dmg), and Linux (.AppImage)
2. **And** binaries are attached as assets to the corresponding GitHub Release
3. **And** each binary's installation size is verified as under 10MB within the pipeline, failing the build if exceeded

## Tasks / Subtasks

- [x] Task 1 (AC: 1, 2): Create general GitHub Actions workflow for Tauri
  - [x] Subtask 1.1: Create `.github/workflows/build.yml`.
  - [x] Subtask 1.2: Configure build matrix for `ubuntu-latest` (Linux), `macos-latest` (macOS), and `windows-latest` (Windows).
  - [x] Subtask 1.3: Set up Node.js, Rust, and Tauri dependencies in the workflow.
  - [x] Subtask 1.4: Configure the workflow to trigger on pushing a tag to `main`.
  - [x] Subtask 1.5: Add action to publish drafted GitHub Release and attach the built binaries (using `tauri-apps/tauri-action` or similar).

- [x] Task 2 (AC: 3): Add Size Verification Step
  - [x] Subtask 2.1: Implement a step in the workflow to check the size of the produced `.msi` / `.dmg` / `.AppImage`.
  - [x] Subtask 2.2: Fail the pipeline execution if any binary size exceeds the 10MB threshold.

### Review Follow-ups (AI)

- [x] [AI-Review][CRITICAL] **Poisoned Release Assets**: Reorder workflow to build and verify size *before* uploading to GitHub Release. [build.yml:39-49]
- [x] [AI-Review][HIGH] **Trigger Constraint Violation**: Restrict `v*` tag triggers to the `main` branch only as per AC1. [build.yml:2-5]
- [x] [AI-Review][MEDIUM] **Brittle Path Resolution**: Use more robust path discovery for built artifacts to handle potential Tauri 2.0 nesting. [build.yml:55-64]
- [x] [AI-Review][LOW] **Unpinned Action Version**: Pin `tauri-apps/tauri-action` to a specific commit or version for stability. [build.yml:40] (Note: Switched to `softprops/action-gh-release@v2` for verified upload after manual build).
- [x] [AI-Review][LOW] **Ambiguous MB Unit**: Clarify/document if 10MB limit is MiB (1024^2) or Decimal MB (1000^2). [build.yml:86]
- [x] [AI-Review][HIGH] **Trigger Constraint Violation (Leak)**: The current `if` condition allows tags on ANY branch to trigger releases. Fix `build.yml:11`.
- [x] [AI-Review][HIGH] **Race Condition on Release**: Concurrent matrix jobs conflict when creating the same drafted release. Use a separate `initial-release` job.
- [x] [AI-Review][MEDIUM] **Matrix Asset Pollution**: Jobs try to upload all platform artifacts instead of just their own.
- [x] [AI-Review][MEDIUM] **Brittle Artifact Paths**: Combine specific path discovery with explicit output passing.
- [x] [AI-Review][LOW] **Missing Rust Cache**: Use `Swatinem/rust-cache` to improve build times.
- [x] [AI-Review][HIGH] **Brittle Artifact Discovery**: build.yml uses `find | head -n 1` which is prone to error if multiple artifacts exist.
- [x] [AI-Review][MEDIUM] **Ambiguous Size Limit**: Workflow uses MiB (1024^2) while requirements likely imply Decimal MB (1000^2).
- [x] [AI-Review][MEDIUM] **Performance Risk**: Rust Cache grow management needed to avoid hitting 10GB limit too quickly.
- [x] [AI-Review][LOW] **Workflow Naming Inconsistency**: Workflow named "Release" but story is "GitHub Actions CI/CD Pipeline".


## Dev Notes

- **Technical Requirements**:
  - **CRITICAL**: You MUST create and use a new git branch for this story (e.g., `feature/1-5-github-actions-ci-cd-pipeline`) before beginning any implementation work.

- **Relevant architecture patterns and constraints**:
  - **CI/CD**: GitHub Actions for multi-platform web deployments and binary builds (Windows/macOS/Linux) via GitHub Releases.
  - **Distribution**: Tauri built-in updater (GitHub Releases) - Pull-based, non-intrusive.
  - **Binary Footprint**: PRD hard requirement: Installation package < 10MB.

- **Source tree components to touch**:
  - `.github/workflows/build.yml`: The new CI/CD pipeline definition.

- **Testing standards summary**:
  - Since this is a CI/CD pipeline, testing involves triggering a dummy tag creation or push on a test branch to verify the workflow execution, artifact generation, and size checking before merging to `main`.

### Project Structure Notes

- **Alignment**:
  - The workflow file goes cleanly into `.github/workflows/build.yml` as specified in the Architecture document project structure.

- **Detected conflicts or variances**:
  - None.

### References

- [Source: planning-artifacts/epics.md#Story 1.5: GitHub Actions CI/CD Pipeline]
- [Source: planning-artifacts/architecture.md#Infrastructure & Deployment]
- [Source: planning-artifacts/architecture.md#Complete Project Directory Structure]
- [Source: docs/project-context.md#Cross-Platform Requirement]

## Dev Agent Record

### Agent Model Used

Antigravity (Gemini 2.0)

### Implementation Plan

To address the remaining review findings, the following changes will be made to `.github/workflows/build.yml`:

1.  **Strict Trigger Logic**: Refine the trigger to ensure releases only occur for version tags on the `main` branch.
2.  **Decoupled Release Creation**: Implement a separate `create-release` job to prevent race conditions when multiple matrix jobs attempt to create the same draft release.
3.  **Targeted Asset Upload**: Upate matrix jobs to upload ONLY their specific platform artifact, reducing pollution and potential conflicts.
4.  **Robust Path Handling**: Use step outputs to pass the exact discovered artifact path to the upload step.
5.  **Performance Optimization**: Integrate `Swatinem/rust-cache` to speed up subsequent Rust builds.

### Debug Log References

- Resuming to address 5 new review findings (2 High, 2 Medium, 1 Low).
- Plan: Split `release` job into `create-release` and `upload-assets`.

### Completion Notes List

- ✅ Implemented GitHub Actions CI/CD configuration for Tauri (Task 1).
- ✅ Added size verification step to strictly enforce the 10MB installation file artifact requirement (Task 2).
- ✅ Resolved second round of follow-up findings (Trigger Leak, Race Condition, Asset Pollution, Path Robustness, Caching).
- ✅ Resolved third round of follow-up findings (Artifact Discovery, Size Limit Ambiguity, Cache Management, Naming).

### File List

- `.github/workflows/build.yml`

## Change Log

- Addressed all ACs. Created GitHub Actions workflow for Tauri deployment and size verification (Date: 2026-02-22).
- Code Review (AI): Identified 5 issues (1 Critical, 1 High). Status moved to in-progress for follow-ups. (Date: 2026-02-22).
- Resolved all code review findings (1 Critical, 1 High, 1 Med, 2 Low). (Date: 2026-02-22).
- Code Review (AI): Identified 5 new issues (2 High, 2 Medium). Status remains in-progress for follow-ups. (Date: 2026-02-22).
- Resolved second round of follow-up findings (Trigger Leak, Race Condition, Asset Pollution, Path Robustness, Caching). (Date: 2026-02-22).

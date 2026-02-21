# Story 1.5: GitHub Actions CI/CD Pipeline

Status: ready-for-dev

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

- [ ] Task 1 (AC: 1, 2): Create general GitHub Actions workflow for Tauri
  - [ ] Subtask 1.1: Create `.github/workflows/build.yml`.
  - [ ] Subtask 1.2: Configure build matrix for `ubuntu-latest` (Linux), `macos-latest` (macOS), and `windows-latest` (Windows).
  - [ ] Subtask 1.3: Set up Node.js, Rust, and Tauri dependencies in the workflow.
  - [ ] Subtask 1.4: Configure the workflow to trigger on pushing a tag to `main`.
  - [ ] Subtask 1.5: Add action to publish drafted GitHub Release and attach the built binaries (using `tauri-apps/tauri-action` or similar).

- [ ] Task 2 (AC: 3): Add Size Verification Step
  - [ ] Subtask 2.1: Implement a step in the workflow to check the size of the produced `.msi` / `.dmg` / `.AppImage`.
  - [ ] Subtask 2.2: Fail the pipeline execution if any binary size exceeds the 10MB threshold.

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

### Debug Log References

### Completion Notes List

### File List

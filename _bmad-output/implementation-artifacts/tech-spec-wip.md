---
title: 'Automated Shadcn Compliance Gate'
slug: 'automated-shadcn-compliance-gate'
created: '2026-03-29'
status: 'in-progress'
stepsCompleted: [1, 2]
tech_stack: ['GitHub Actions', 'npm', 'Vitest', 'Husky (for pre-commit hooks)']
files_to_modify: ['.github/workflows/ci.yml', 'package.json', '.husky/pre-commit']
code_patterns: ['GitHub Actions job definition', 'npm scripts', 'shell scripting']
test_patterns: ['CI validation job']
---

# Tech-Spec: Automated Shadcn Compliance Gate

**Created:** 2026-03-29

## Overview

### Problem Statement

The project lacks automated enforcement of the shadcn UI library, leading to inconsistent component implementations and slow, manual verification ("dumb checking").

### Solution

Integrate the `npx shadcn-doctor` tool into the CI/CD pipeline to act as a quality gate, failing any pull request that introduces custom UI components where shadcn alternatives exist or reduces the overall adoption rate.

### Scope

**In Scope:**
- CI integration (GitHub Actions).
- Pre-commit hook configuration.
- Modifying `package.json` scripts.

**Out of Scope:**
- Fixing existing shadcn violations (that's a separate effort).
- Creating new shadcn components.

## Context for Development

### Codebase Patterns

- **CI/CD:** The project uses GitHub Actions, defined in `.github/workflows/ci.yml`. The existing workflow runs jobs for type checking, linting, unit tests, security scans, and build size verification. A new job for shadcn compliance should follow this pattern.
- **Scripts:** `package.json` contains a `scripts` section for running development, build, and test tasks. A new script for `shadcn-doctor` will be added here.
- **Pre-commit Hooks:** The project does not currently have a formal pre-commit hook setup like Husky. This will need to be introduced.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `.github/workflows/ci.yml` | Defines the continuous integration pipeline. This will be modified to add a new validation job. |
| `package.json` | Manages project dependencies and scripts. A new script will be added to run `shadcn-doctor`. |
| `src/lib/shadcnAdoption.test.ts`| The existing test that reports on shadcn usage. The `shadcn-doctor` tool will replace this manual check. |

### Technical Decisions

- **Tooling:** We will use the user-provided `npx shadcn-doctor` command as the core validation tool.
- **CI Platform:** GitHub Actions is the established CI platform for this project.
- **Pre-commit Hooks:** Husky will be introduced to manage git hooks in a way that's integrated with `package.json`.

## Implementation Plan

### Tasks

*No response*

### Acceptance Criteria

*No response*

## Additional Context

### Dependencies

*No response*

### Testing Strategy

*No response*

### Notes

*No response*

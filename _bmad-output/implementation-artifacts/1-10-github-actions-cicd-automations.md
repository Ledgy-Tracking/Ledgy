# Story 1.10: GitHub Actions CI/CD Automations

Status: ready-for-dev

<!-- Note: Validation is recommended. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want **automated CI/CD pipelines using GitHub Actions**,
so that **code changes are automatically tested, built, and deployed with native installers for Windows, macOS, and Linux**.

## Acceptance Criteria

1. GitHub Actions workflow for CI (test, lint, type-check on PR)
2. GitHub Actions workflow for CD (build native installers on tag)
3. CI workflow runs on every push to main and PRs
4. CD workflow triggers on git tag pushes (v*.*.*)
5. Build artifacts: .exe (Windows), .dmg (macOS), .AppImage (Linux)
6. Artifact retention configured (30 days)
7. Build size verification (<100MB per installer)
8. TypeScript strict mode compilation verified in CI
9. Test suite runs in CI with coverage reporting
10. Build caching configured for faster CI runs

## Tasks / Subtasks

- [ ] Task 1: Create CI workflow (AC: #1, #3, #8, #9, #10)
  - [ ] Create `.github/workflows/ci.yml`
  - [ ] Trigger on: push to main, pull_request
  - [ ] Setup Node.js environment
  - [ ] Install dependencies with caching
  - [ ] Run TypeScript type-check
  - [ ] Run ESLint/linting
  - [ ] Run Vitest test suite
  - [ ] Upload coverage report
- [ ] Task 2: Create CD workflow (AC: #2, #4, #5, #6)
  - [ ] Create `.github/workflows/cd.yml`
  - [ ] Trigger on: git tag push (v*.*.*)
  - [ ] Build for Windows (.exe)
  - [ ] Build for macOS (.dmg)
  - [ ] Build for Linux (.AppImage)
  - [ ] Configure artifact retention (30 days)
  - [ ] Upload build artifacts to GitHub Releases
- [ ] Task 3: Configure build size verification (AC: #7)
  - [ ] Add build size check script
  - [ ] Fail CI if installer >100MB
  - [ ] Report build sizes in workflow output
- [ ] Task 4: Optimize CI performance (AC: #10)
  - [ ] Configure npm cache
  - [ ] Configure Vite build cache
  - [ ] Parallelize test jobs where possible
- [ ] Task 5: Test workflows locally (optional)
  - [ ] Use act (https://github.com/nektos/act) for local testing
  - [ ] Verify workflow syntax with actionlint
- [ ] Task 6: Document CI/CD process (AC: #1, #2)
  - [ ] Add README section on CI/CD
  - [ ] Document release process (tag → build → artifacts)
  - [ ] Document artifact download and installation

## Dev Notes

### Critical Technical Requirements

**CI Workflow Triggers**:
```yaml
on:
  push:
    branches: [main, allatonce]
  pull_request:
    branches: [main]
```

**CD Workflow Triggers**:
```yaml
on:
  push:
    tags:
      - 'v*.*.*'  # Semantic versioning tags
```

**Tauri Build Configuration**:
```yaml
# Uses Tauri CLI for native builds
- name: Build Tauri app
  run: npm run tauri build
```

**Artifact Upload**:
```yaml
- uses: actions/upload-artifact@v4
  with:
    name: ledgy-windows
    path: src-tauri/target/release/bundle/msi/*.msi
    retention-days: 30
```

### Project Structure Notes

**Workflow Files**:
```
.github/
└── workflows/
    ├── ci.yml          # Continuous Integration
    └── cd.yml          # Continuous Deployment
```

**Integration with Tauri**:
- Tauri provides built-in GitHub Actions support
- Uses `tauri-build` for native bundling
- Supports Windows (MSI/NSIS), macOS (DMG), Linux (AppImage/deb)

### Architecture Compliance

**All code MUST follow these patterns from architecture.md**:

- **Workflow Naming**: Descriptive names (e.g., "CI - Test & Lint")
- **Job Organization**: Group related steps (setup, test, build)
- **Error Handling**: Fail fast on critical errors
- **Security**: Use official actions, pin versions

**Integration with Previous Stories**:
- Story 1-1: Dependencies verified in CI
- Story 1-7: Encryption tested in CI
- Story 1-9: Settings persist across builds

### Library/Framework Requirements

**GitHub Actions**:
- `actions/checkout@v4` - Checkout code
- `actions/setup-node@v4` - Setup Node.js
- `actions/cache@v4` - Dependency caching
- `actions/upload-artifact@v4` - Upload build artifacts
- `tauri-apps/tauri-action@v0` - Tauri build helper

**DO NOT install**:
- Third-party CI services (GitHub Actions is sufficient)

### Testing Standards

**Workflow Tests**:
- Use `nektos/act` for local workflow testing
- Validate YAML syntax with `actionlint`
- Test on multiple OS runners (ubuntu-latest, windows-latest, macos-latest)

**Critical Test Scenarios**:
1. ✅ CI runs on PR creation
2. ✅ CI runs on push to main
3. ✅ CD runs on tag push
4. ✅ Artifacts uploaded successfully
5. ✅ Build size <100MB
6. ✅ Tests pass in CI environment
7. ✅ TypeScript compilation succeeds
8. ✅ Caching reduces build time

### Git Branch Strategy

**Branch Decision**: Using `allatonce` branch for all epic implementation work.

```bash
git checkout allatonce
```

### Previous Story Intelligence

**From Story 1-1 (Scaffold & Dependency Tree)**:
- Package.json scripts defined
- Build sizes verified (<10MB target)

**From Story 1-7 (WebCrypto)**:
- Crypto tests must pass in CI
- No external crypto dependencies

**From Story 1-9 (App Settings)**:
- Settings persist across builds

### References

- [Source: GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Source: Tauri CI/CD Guide](https://tauri.app/v1/guides/building/cross-platform)
- [Source: Tauri GitHub Actions](https://github.com/tauri-apps/tauri-action)
- [Source: architecture.md#Development Workflow](planning-artifacts/architecture.md)
- [Source: project-context.md#Technology Stack & Versions](project-context.md)
- [Source: epics.md#Epic 1: App Foundation & Core Security](planning-artifacts/epics.md)

## Dev Agent Record

### Agent Model Used

BMad Method create-story workflow

### Debug Log References

### Completion Notes List

### File List

---

## Technical Requirements

### Mandatory Implementation Standards

1. **Use existing git branch**: You MUST work on the `allatonce` branch.

2. **CI workflow**: MUST run on every push to main and PRs.

3. **CD workflow**: MUST trigger on semantic version tags (v*.*.*).

4. **Build artifacts**: MUST produce .exe, .dmg, .AppImage.

5. **Artifact retention**: MUST be 30 days minimum.

6. **Build size**: MUST be <100MB per installer.

7. **Caching**: MUST configure npm and build caching.

8. **Test coverage**: MUST run full test suite in CI.

### Next Steps

After completing this story:
1. Commit all changes to `allatonce` branch
2. Update sprint-status.yaml and COMMIT
3. Proceed to Story 1.11: Auth Rate Limiting & Escalating Delays

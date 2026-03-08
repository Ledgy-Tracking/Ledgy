# Ledgy - Tauri + React + Typescript

This template should help get you started developing with Tauri, React and Typescript in Vite.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Tauri 2.0 (Rust)
- **Styling**: Tailwind CSS v4 (CSS-first configuration)
- **State Management**: Zustand
- **Testing**: Vitest (unit), Playwright (E2E)

## Build Size Verification

**Production binary sizes** (PRD requirement: < 10MB):

| Installer Type | Size | Path |
|---------------|------|------|
| MSI | 3.06 MB | `src-tauri/target/release/bundle/msi/ledgy_0.1.0_x64_en-US.msi` |
| NSIS | 2.05 MB | `src-tauri/target/release/bundle/nsis/ledgy_0.1.0_x64-setup.exe` |

✅ Both installers are well under the 10MB limit.

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Build Tauri app
npm run tauri build

# Run tests
npm test
npm run test:e2e
```

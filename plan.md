1.  **Analyze the vulnerability**:
    -   In `src/lib/templateImport.ts`, the `readTemplateTauri` function reads user-provided files using `fsModule.readTextFile(filePath)` without checking the file size.
    -   This exposes the application to a client-side Denial of Service (DoS) and memory exhaustion risk, as excessively large files can crash the client.
    -   The `readTemplateBrowser` function already has a 5MB limit, but the Tauri implementation is missing it.
    -   According to the memory rule: "Security Pattern (Tauri File Imports): When importing files via Tauri's `readTextFile(filePath)`, always implement size validation using `stat(filePath)` (to check `stat.size` against a limit like 5MB) prior to reading large text files. ... The project uses Tauri v2 APIs where `stat` replaces the older `metadata` function."

2.  **Plan the fix**:
    -   Edit `src/lib/templateImport.ts` using `replace_with_git_merge_diff`.
    -   In `readTemplateTauri`, after getting `filePath` and before calling `readTextFile`, call `await fsModule.stat(filePath as string)`.
    -   Check if `fileStat.size > 5 * 1024 * 1024`. If so, throw an error.
    -   The change will be under 50 lines.

3.  **Execute the fix**:
    -   Apply the git merge diff to `src/lib/templateImport.ts`.

4.  **Verify**:
    -   Run tests (`pnpm test`) to ensure no regressions.
    -   Run build (`pnpm run build`) to ensure TypeScript compiles successfully.

5.  **Pre-Commit**:
    -   Call `pre_commit_instructions` tool to run the necessary checks.
    -   Execute the instructions provided by the tool.

6.  **Submit**:
    -   Submit with PR Title: "🛡️ Sentinel: [HIGH] Fix File Import DoS Risk in Tauri"
    -   PR Description:
        -   🚨 Severity: HIGH
        -   💡 Vulnerability: The Tauri file import implementation reads files into memory without any size validation, which can lead to client-side Denial of Service (DoS) and memory exhaustion if a maliciously large file is selected.
        -   🎯 Impact: An attacker or user could crash the application by importing a massive file, as `readTextFile` loads the entire content into RAM.
        -   🔧 Fix: Implemented size validation using Tauri's `stat()` function to enforce a 5MB limit before attempting to read the file contents, matching the existing limit in the browser implementation.
        -   ✅ Verification: Verified locally by running `pnpm test` and `pnpm run build` to ensure the TypeScript build succeeds with the new `stat` integration.

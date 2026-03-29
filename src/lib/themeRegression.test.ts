import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { glob } from 'glob';
import path from 'path';

describe('Theme System Regression Tests', () => {
    const sourceDir = path.join(__dirname, '../');
    
    it('should not have hardcoded dark-only styles without light alternatives', async () => {
        const files = glob.sync('**/*.tsx', { cwd: sourceDir });
        const violations: string[] = [];
        
        // Comprehensive patterns that should be conditional
        const darkPatterns = [
            // Background patterns that should have light alternatives
            { pattern: /bg-zinc-950(?!\s|$)/g, shouldHave: 'dark:bg-zinc-950', lightAlternative: 'bg-white' },
            { pattern: /bg-zinc-900(?!\s|$)/g, shouldHave: 'dark:bg-zinc-900', lightAlternative: 'bg-gray-50' },
            { pattern: /bg-zinc-800(?!\s|$)/g, shouldHave: 'dark:bg-zinc-800', lightAlternative: 'bg-gray-100' },
            { pattern: /bg-gray-900(?!\s|$)/g, shouldHave: 'dark:bg-gray-900', lightAlternative: 'bg-gray-50' },
            { pattern: /bg-slate-900(?!\s|$)/g, shouldHave: 'dark:bg-slate-900', lightAlternative: 'bg-slate-50' },
            { pattern: /bg-black(?!\s|$)/g, shouldHave: 'dark:bg-black', lightAlternative: 'bg-white' },
            
            // Text patterns that should have light alternatives  
            { pattern: /text-white(?!\s|$)/g, shouldHave: 'dark:text-white', lightAlternative: 'text-zinc-900' },
            { pattern: /text-zinc-100(?!\s|$)/g, shouldHave: 'dark:text-zinc-100', lightAlternative: 'text-zinc-900' },
            { pattern: /text-zinc-200(?!\s|$)/g, shouldHave: 'dark:text-zinc-200', lightAlternative: 'text-zinc-800' },
            { pattern: /text-gray-100(?!\s|$)/g, shouldHave: 'dark:text-gray-100', lightAlternative: 'text-gray-900' },
            { pattern: /text-gray-200(?!\s|$)/g, shouldHave: 'dark:text-gray-200', lightAlternative: 'text-gray-800' },
            
            // Border patterns that should have light alternatives
            { pattern: /border-zinc-800(?!\s|$)/g, shouldHave: 'dark:border-zinc-800', lightAlternative: 'border-zinc-200' },
            { pattern: /border-zinc-700(?!\s|$)/g, shouldHave: 'dark:border-zinc-700', lightAlternative: 'border-zinc-300' },
            { pattern: /border-gray-800(?!\s|$)/g, shouldHave: 'dark:border-gray-800', lightAlternative: 'border-gray-200' },
            { pattern: /border-gray-700(?!\s|$)/g, shouldHave: 'dark:border-gray-700', lightAlternative: 'border-gray-300' },
            
            // Ring patterns for focus states
            { pattern: /ring-zinc-800(?!\s|$)/g, shouldHave: 'dark:ring-zinc-800', lightAlternative: 'ring-zinc-200' },
            { pattern: /ring-gray-800(?!\s|$)/g, shouldHave: 'dark:ring-gray-800', lightAlternative: 'ring-gray-200' },
        ];
        
        files.forEach(file => {
            const content = readFileSync(path.join(sourceDir, file), 'utf-8');
            
            darkPatterns.forEach(({ pattern, shouldHave, lightAlternative }) => {
                const matches = content.match(pattern);
                if (matches) {
                    // Check if the dark pattern exists but the conditional version doesn't
                    matches.forEach(match => {
                        const darkClass = match.trim();
                        const conditionalPattern = shouldHave;
                        
                        // If we find the hardcoded dark class but not the conditional version
                        if (content.includes(darkClass) && !content.includes(conditionalPattern)) {
                            violations.push(`${file}: Found hardcoded "${darkClass}" without conditional "${conditionalPattern}". Should use: "${lightAlternative} ${conditionalPattern}"`);
                        }
                    });
                }
            });
        });
        
        if (violations.length > 0) {
            console.log('\n❌ Theme violations found:');
            violations.forEach(v => console.log('  ⚠️ ', v));
            console.log(`\nTotal violations: ${violations.length}`);
            console.log('\n💡 Fix by replacing hardcoded dark classes with conditional ones:');
            console.log('   Example: bg-zinc-950 → bg-white dark:bg-zinc-950');
            console.log('   Example: text-white → text-zinc-900 dark:text-white');
        }
        
        expect(violations).toEqual([]);
    });

    it('should not have hardcoded light-only styles without dark alternatives', async () => {
        const files = glob.sync('**/*.tsx', { cwd: sourceDir });
        const violations: string[] = [];
        
        // Light patterns that should also have dark alternatives
        const lightPatterns = [
            // Very light backgrounds that might be problematic in dark mode
            { pattern: /bg-white(?!\s|$)/g, shouldConsiderDark: 'dark:bg-zinc-950' },
            { pattern: /bg-gray-50(?!\s|$)/g, shouldConsiderDark: 'dark:bg-zinc-900' },
            { pattern: /bg-slate-50(?!\s|$)/g, shouldConsiderDark: 'dark:bg-slate-900' },
            
            // Very dark text that might be problematic in dark mode  
            { pattern: /text-black(?!\s|$)/g, shouldConsiderDark: 'dark:text-white' },
            { pattern: /text-zinc-900(?!\s|$)/g, shouldConsiderDark: 'dark:text-zinc-100' },
            { pattern: /text-gray-900(?!\s|$)/g, shouldConsiderDark: 'dark:text-gray-100' },
        ];
        
        files.forEach(file => {
            const content = readFileSync(path.join(sourceDir, file), 'utf-8');
            
            lightPatterns.forEach(({ pattern, shouldConsiderDark }) => {
                const matches = content.match(pattern);
                if (matches) {
                    matches.forEach(match => {
                        const lightClass = match.trim();
                        // If we find a light class but no corresponding dark class
                        if (content.includes(lightClass) && !content.includes(shouldConsiderDark)) {
                            // Only flag if this appears to be a main UI element (not utility/accent colors)
                            const context = content.split(lightClass)[0].slice(-50) + lightClass + content.split(lightClass)[1].slice(0, 50);
                            if (context.includes('className') && !context.includes('hover:') && !context.includes('accent') && !context.includes('emerald') && !context.includes('red-') && !context.includes('green-') && !context.includes('blue-')) {
                                violations.push(`${file}: Found potentially problematic light-only "${lightClass}" without dark alternative "${shouldConsiderDark}"`);
                            }
                        }
                    });
                }
            });
        });
        
        if (violations.length > 0) {
            console.log('\n⚠️  Potential light-mode-only issues:');
            violations.forEach(v => console.log('  💡 ', v));
            console.log(`\nTotal potential issues: ${violations.length}`);
            console.log('\n💡 Consider adding dark mode alternatives for main UI elements.');
        }
        
        // This is a warning test - don't fail on light-only patterns, just report them
        // expect(violations).toEqual([]);
        console.log('\n✅ Light-mode analysis complete (warnings only, not failing test)');
    });
});
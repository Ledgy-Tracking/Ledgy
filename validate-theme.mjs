#!/usr/bin/env node
/**
 * Theme System Validation Script
 * Ensures light/dark mode support is maintained after design system changes
 */

import { exec } from 'child_process';
import { glob } from 'glob';
import { readFileSync } from 'fs';
import path from 'path';

console.log('🎨 Theme System Validation');
console.log('==========================');

// Check for hardcoded dark-only patterns
const sourceFiles = glob.sync('src/**/*.tsx');
let violations = 0;

console.log('\n🔍 Checking for hardcoded dark-only patterns...');

sourceFiles.forEach(file => {
    const content = readFileSync(file, 'utf-8');
    
    // Check for bg-zinc-950 without dark: prefix (hardcoded dark)
    const hardcodedDark = content.match(/\bbg-zinc-950\b(?![^"'`]*dark:bg-zinc-950)/g);
    if (hardcodedDark) {
        console.log(`❌ ${file}: Found ${hardcodedDark.length} hardcoded dark background(s)`);
        violations++;
    }
    
    // Check for text-white without dark: prefix  
    const hardcodedWhiteText = content.match(/\btext-white\b(?![^"'`]*dark:text-white)/g);
    if (hardcodedWhiteText) {
        console.log(`❌ ${file}: Found ${hardcodedWhiteText.length} hardcoded white text(s)`);
        violations++;
    }
});

if (violations === 0) {
    console.log('✅ No hardcoded dark-only patterns found');
} else {
    console.log(`❌ Found ${violations} violations`);
}

// Check for proper conditional classes in critical components
const criticalComponents = [
    'src/features/settings/SettingsPage.tsx',
    'src/features/shell/AppShell.tsx',
    'src/components/ErrorToast.tsx',
];

console.log('\n🔍 Checking critical components for conditional theming...');

criticalComponents.forEach(file => {
    try {
        const content = readFileSync(file, 'utf-8');
        
        const hasDarkClasses = /\bdark:[a-z-]+/.test(content);
        const hasLightColors = /\btext-zinc-900\b|\bbg-white\b|\bbg-zinc-50\b/.test(content);
        
        if (hasDarkClasses && hasLightColors) {
            console.log(`✅ ${file}: Has proper conditional theming`);
        } else {
            console.log(`❌ ${file}: Missing conditional theme classes`);
            violations++;
        }
    } catch (error) {
        console.log(`⚠️  ${file}: File not found or readable`);
    }
});

// Summary
console.log('\n📊 Validation Summary');
console.log('=====================');

if (violations === 0) {
    console.log('✅ All theme system checks passed!');
    console.log('   Light and dark modes should work correctly.');
    process.exit(0);
} else {
    console.log(`❌ ${violations} validation issues found`);
    console.log('   Theme switching may not work properly.');
    process.exit(1);
}
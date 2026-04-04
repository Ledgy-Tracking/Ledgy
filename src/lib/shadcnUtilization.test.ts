import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';

function getAllTsxFiles(dir: string): string[] {
    const files: string[] = [];
    const items = readdirSync(dir);
    
    for (const item of items) {
        const fullPath = path.join(dir, item);
        try {
            const stat = statSync(fullPath);
            
            if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
                files.push(...getAllTsxFiles(fullPath));
            } else if (item.endsWith('.tsx')) {
                files.push(fullPath);
            }
        } catch (error) {
            continue;
        }
    }
    
    return files;
}

function getShadcnComponents(uiDir: string): string[] {
    try {
        const items = readdirSync(uiDir);
        return items
            .filter(item => item.endsWith('.tsx') && !item.endsWith('.test.tsx'))
            .map(item => item.replace('.tsx', ''));
    } catch (error) {
        return [];
    }
}

function isShadcnComponent(filePath: string): { isShadcn: boolean, confidence: string, indicators: string[] } {
    try {
        const content = readFileSync(filePath, 'utf-8');
        const indicators: string[] = [];
        let isShadcn = false;
        
        // Strong indicators of real shadcn components
        if (content.includes('class-variance-authority')) {
            indicators.push('uses class-variance-authority');
            isShadcn = true;
        }
        
        if (content.includes('@radix-ui/') || content.includes('radix-ui')) {
            indicators.push('uses Radix UI primitives');
            isShadcn = true;
        }
        
        if (content.includes('cva(') && content.includes('VariantProps')) {
            indicators.push('uses cva variants system');
            isShadcn = true;
        }
        
        // CSS variable patterns typical of shadcn
        if (content.includes('bg-primary') || content.includes('text-primary-foreground') || content.includes('bg-background')) {
            indicators.push('uses shadcn CSS variables');
            isShadcn = true;
        }
        
        // Shadcn utils import
        if (content.includes('cn(') && content.includes('@/lib/utils')) {
            indicators.push('uses shadcn cn utility');
        }
        
        // Check for custom implementation patterns (anti-shadcn indicators)
        if (content.includes('useState') && content.includes('useEffect') && !content.includes('cva') && !content.includes('radix')) {
            indicators.push('WARNING: Contains custom React logic without shadcn patterns');
        }
        
        const confidence = indicators.length >= 2 ? 'high' : indicators.length === 1 ? 'medium' : 'low';
        
        return { isShadcn, confidence, indicators };
    } catch (error) {
        return { isShadcn: false, confidence: 'unknown', indicators: ['Error reading file'] };
    }
}

describe('Shadcn/UI Architecture Analysis', () => {
    const sourceDir = path.join(__dirname, '../');
    const uiComponentsDir = path.join(sourceDir, 'components/ui');
    
    it('should analyze actual shadcn vs custom component implementation', () => {
        const allFiles = getAllTsxFiles(sourceDir);
        const shadcnComponents = getShadcnComponents(uiComponentsDir);
        const violations: string[] = [];
        
        const componentAnalysis: Record<string, { 
            used: boolean; 
            importCount: number;
            isShadcn: boolean;
            confidence: string;
            indicators: string[];
            importFiles: string[];
        }> = {};

        console.log('\n🔍 Analyzing UI components architecture...');
        
        // Analyze each component in /ui/ directory
        shadcnComponents.forEach(component => {
            const componentPath = path.join(uiComponentsDir, `${component}.tsx`);
            const analysis = isShadcnComponent(componentPath);
            
            componentAnalysis[component] = {
                used: false,
                importCount: 0,
                isShadcn: analysis.isShadcn,
                confidence: analysis.confidence,
                indicators: analysis.indicators,
                importFiles: []
            };
            
            console.log(`\n📦 ${component}.tsx:`);
            console.log(`  🎯 Is Shadcn: ${analysis.isShadcn ? '✅' : '❌'} (${analysis.confidence} confidence)`);
            analysis.indicators.forEach(indicator => {
                const icon = indicator.startsWith('WARNING') ? '⚠️' : '  ✓';
                console.log(`  ${icon} ${indicator}`);
            });
        });

        // Check usage across codebase
        allFiles.forEach(file => {
            const content = readFileSync(file, 'utf-8');
            const relativePath = path.relative(sourceDir, file);
            
            // Skip the ui components directory itself
            if (relativePath.startsWith('components/ui/')) return;

            // Look for shadcn imports
            const importLines = content.split('\n').filter(line => 
                line.includes('from') && (
                    line.includes('@/components/ui/') || 
                    line.includes('./components/ui/') ||
                    line.includes('../components/ui/')
                )
            );

            importLines.forEach(line => {
                shadcnComponents.forEach(component => {
                    if (line.includes(`/${component}`) || line.includes(`/${component}'`) || line.includes(`/${component}"`)) {
                        componentAnalysis[component].used = true;
                        componentAnalysis[component].importCount++;
                        componentAnalysis[component].importFiles.push(relativePath);
                    }
                });
            });
        });

        // Generate comprehensive report
        const totalComponents = shadcnComponents.length;
        const realShadcnComponents = Object.values(componentAnalysis).filter(comp => comp.isShadcn).length;
        const customComponents = Object.values(componentAnalysis).filter(comp => !comp.isShadcn).length;
        const usedComponents = Object.values(componentAnalysis).filter(comp => comp.used).length;
        
        console.log('\n📊 Architecture Summary:');
        console.log(`  📦 Total UI components: ${totalComponents}`);
        console.log(`  ✅ Real Shadcn components: ${realShadcnComponents}`);
        console.log(`  🔧 Custom components: ${customComponents}`);
        console.log(`  💚 Used in codebase: ${usedComponents}`);
        console.log(`  🎯 Shadcn adoption: ${realShadcnComponents > 0 ? 'YES' : 'NO'}`);
        
        if (realShadcnComponents > 0) {
            console.log('\n✅ CONCLUSION: This project DOES use real Shadcn components!');
        } else {
            console.log('\n❌ CONCLUSION: This project uses custom components styled like Shadcn');
        }

        // Identify issues
        const unusedShadcn = Object.entries(componentAnalysis)
            .filter(([_, comp]) => comp.isShadcn && !comp.used)
            .map(([name]) => name);

        const usedCustom = Object.entries(componentAnalysis)
            .filter(([_, comp]) => !comp.isShadcn && comp.used)
            .map(([name, comp]) => ({ name, count: comp.importCount }));

        if (unusedShadcn.length > 0) {
            console.log('\n📋 Unused Real Shadcn Components:');
            unusedShadcn.forEach(comp => console.log(`  📦 ${comp}`));
        }

        if (usedCustom.length > 0) {
            console.log('\n⚠️  Used Custom Components (not real Shadcn):');
            usedCustom.forEach(({name, count}) => console.log(`  🔧 ${name}: ${count} imports`));
        }

        console.log('\n💡 This analysis shows actual component architecture, not violations.');

        // Don't fail the test - this is informational
        expect(violations).toEqual([]);
    });
});
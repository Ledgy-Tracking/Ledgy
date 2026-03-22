import { describe, it, expect } from 'vitest'
import { glob } from 'glob'
import fs from 'fs'
import path from 'path'

describe('Shadcn Component Adoption Analysis', () => {
  it('should analyze actual shadcn component usage across the codebase', async () => {
    // First, identify what shadcn components exist
    const uiComponentFiles = await glob('src/components/ui/*.{ts,tsx}', { cwd: process.cwd() })
    
    const availableComponents = []
    
    for (const file of uiComponentFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      const componentName = path.basename(file, path.extname(file))
      
      // Check for shadcn indicators
      const indicators = {
        hasClassVarianceAuthority: content.includes('class-variance-authority') || content.includes('cva'),
        hasRadixUI: content.includes('@radix-ui/') || content.includes('Radix'),
        hasShadcnPatterns: content.includes('cn(') || content.includes('clsx'),
        hasCSSVariables: content.includes('hsl(var(') || content.includes('--'),
        hasVariants: content.includes('variants:') && content.includes('defaultVariants:'),
        hasForwardRef: content.includes('forwardRef') || content.includes('React.forwardRef')
      }
      
      const shadcnScore = Object.values(indicators).filter(Boolean).length
      const isLikelyShadcn = shadcnScore >= 3
      
      availableComponents.push({
        component: componentName,
        file: file,
        isLikelyShadcn,
        shadcnScore,
        indicators
      })
    }
    
    console.log('\n=== SHADCN ADOPTION ANALYSIS ===')
    console.log(`Available UI components: ${availableComponents.length}`)
    
    // Analyze actual usage across the entire codebase
    const allAppFiles = await glob('src/**/*.{ts,tsx}', { 
      cwd: process.cwd(),
      ignore: ['src/components/ui/**'] // Exclude the UI components themselves
    })
    
    console.log(`Analyzing ${allAppFiles.length} application files...`)
    
    const usageReport = []
    let totalShadcnImports = 0
    let filesUsingShadcn = 0
    const filesNotUsingShadcn = []
    
    for (const file of allAppFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      const fileUsage = {
        file: file,
        shadcnImports: [],
        hasAnyShadcnUsage: false,
        customUIPatterns: []
      }
      
      // Check for shadcn component imports
      for (const comp of availableComponents) {
        if (comp.isLikelyShadcn) {
          const importPatterns = [
            new RegExp(`import.*\\b${comp.component}\\b.*from\\s+['"]@/components/ui/${comp.component}['"]`, 'g'),
            new RegExp(`from\\s+['"]@/components/ui/${comp.component}['"]`, 'g'),
            new RegExp(`import.*{[^}]*\\b${comp.component}\\b[^}]*}.*from\\s+['"]@/components/ui`, 'g')
          ]
          
          if (importPatterns.some(pattern => pattern.test(content))) {
            fileUsage.shadcnImports.push(comp.component)
            fileUsage.hasAnyShadcnUsage = true
            totalShadcnImports++
          }
        }
      }
      
      // Check for custom UI patterns that could use shadcn instead
      const customPatterns = [
        { pattern: /<button[^>]*className/, description: 'Custom button elements' },
        { pattern: /<input[^>]*className/, description: 'Custom input elements' },
        { pattern: /<div[^>]*className[^>]*button|btn/, description: 'DIV elements styled as buttons' },
        { pattern: /className[^>]*bg-\w+-\d+/, description: 'Hardcoded background colors' },
        { pattern: /className[^>]*text-\w+-\d+/, description: 'Hardcoded text colors' },
        { pattern: /className[^>]*border-\w+-\d+/, description: 'Hardcoded border colors' }
      ]
      
      for (const customPattern of customPatterns) {
        const matches = content.match(customPattern.pattern)
        if (matches) {
          fileUsage.customUIPatterns.push({
            pattern: customPattern.description,
            count: matches.length
          })
        }
      }
      
      if (fileUsage.hasAnyShadcnUsage) {
        filesUsingShadcn++
      } else {
        filesNotUsingShadcn.push(file)
      }
      
      usageReport.push(fileUsage)
    }
    
    // Report findings
    console.log('\n=== ADOPTION METRICS ===')
    console.log(`Files using shadcn components: ${filesUsingShadcn}/${allAppFiles.length} (${Math.round(filesUsingShadcn/allAppFiles.length*100)}%)`)
    console.log(`Files NOT using shadcn: ${filesNotUsingShadcn.length}/${allAppFiles.length} (${Math.round(filesNotUsingShadcn.length/allAppFiles.length*100)}%)`)
    console.log(`Total shadcn component imports: ${totalShadcnImports}`)
    
    console.log('\n=== TOP SHADCN USERS ===')
    const topUsers = usageReport
      .filter(f => f.hasAnyShadcnUsage)
      .sort((a, b) => b.shadcnImports.length - a.shadcnImports.length)
      .slice(0, 10)
    
    topUsers.forEach(file => {
      console.log(`📁 ${file.file}: ${file.shadcnImports.join(', ')}`)
    })
    
    console.log('\n=== FILES NOT USING SHADCN ===')
    console.log(`(Showing first 20 of ${filesNotUsingShadcn.length})`)
    filesNotUsingShadcn.slice(0, 20).forEach(file => {
      console.log(`❌ ${file}`)
    })
    
    console.log('\n=== COMPONENT USAGE BREAKDOWN ===')
    const realShadcnComponents = availableComponents.filter(c => c.isLikelyShadcn)
    
    for (const comp of realShadcnComponents) {
      const usageCount = usageReport.reduce((count, file) => 
        count + (file.shadcnImports.includes(comp.component) ? 1 : 0), 0)
      
      console.log(`📊 ${comp.component}: Used in ${usageCount} files`)
    }
    
    console.log('\n=== POTENTIAL IMPROVEMENT OPPORTUNITIES ===')
    const filesWithCustomUI = usageReport.filter(f => f.customUIPatterns.length > 0 && !f.hasAnyShadcnUsage)
    console.log(`Files with custom UI that could benefit from shadcn: ${filesWithCustomUI.length}`)
    
    // Show some examples
    filesWithCustomUI.slice(0, 5).forEach(file => {
      console.log(`🔧 ${file.file}:`)
      file.customUIPatterns.forEach(pattern => {
        console.log(`   - ${pattern.pattern} (${pattern.count} instances)`)
      })
    })
    
    // Final assessment
    const adoptionRate = filesUsingShadcn / allAppFiles.length
    console.log('\n=== FINAL ASSESSMENT ===')
    if (adoptionRate < 0.3) {
      console.log(`🔴 LOW ADOPTION (${Math.round(adoptionRate*100)}%) - Most files use custom UI instead of shadcn`)
    } else if (adoptionRate < 0.6) {
      console.log(`🟡 MODERATE ADOPTION (${Math.round(adoptionRate*100)}%) - Mixed usage between shadcn and custom UI`)
    } else {
      console.log(`🟢 HIGH ADOPTION (${Math.round(adoptionRate*100)}%) - Good shadcn utilization across codebase`)
    }
    
    // Assertions
    expect(availableComponents.length).toBeGreaterThan(0)
    expect(allAppFiles.length).toBeGreaterThan(0)
    
    // Log key metrics for test validation
    console.log(`\nKey metrics: ${filesUsingShadcn}/${allAppFiles.length} files use shadcn (${Math.round(adoptionRate*100)}%)`)
  })
})
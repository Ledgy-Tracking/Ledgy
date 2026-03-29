# Restore conditional theming with zinc/emerald design system
cd C:\Users\njtan\Documents\GitHub\ledgy\src

# Define the theme patterns to restore
$files = Get-ChildItem -Recurse -Include "*.tsx" -File

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $original = $content
    
    # Restore light/dark conditional backgrounds
    $content = $content -replace '\bbg-zinc-950\b', 'bg-white dark:bg-zinc-950'
    $content = $content -replace '\bbg-zinc-900/50\b', 'bg-zinc-50 dark:bg-zinc-900/50'
    $content = $content -replace '\bbg-zinc-900/30\b', 'bg-zinc-100 dark:bg-zinc-900/30' 
    $content = $content -replace '\bbg-zinc-800/50\b', 'bg-zinc-200 dark:bg-zinc-800/50'
    
    # Restore light/dark conditional text
    $content = $content -replace '\btext-white\b(?![\w-])', 'text-zinc-900 dark:text-white'
    $content = $content -replace '\btext-zinc-400\b', 'text-zinc-600 dark:text-zinc-400'
    $content = $content -replace '\btext-zinc-300\b', 'text-zinc-700 dark:text-zinc-300'
    
    # Restore light/dark conditional borders 
    $content = $content -replace '\bborder-white/5\b', 'border-zinc-200 dark:border-white/5'
    $content = $content -replace '\bborder-white/10\b', 'border-zinc-300 dark:border-white/10'
    
    # Keep emerald accents the same (they work in both themes)
    
    if ($original -ne $content) {
        Set-Content $file.FullName -Value $content
        Write-Host "Updated: $($file.Name)"
    }
}

Write-Host "Theme restoration complete!"
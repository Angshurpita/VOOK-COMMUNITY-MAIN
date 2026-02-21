$source = "c:\Users\ghosh\Downloads\VOOK-MAIN\VOOK-MAIN\VOOK-MAIN"
$frontend = "c:\Users\ghosh\Downloads\VOOK-MAIN\frontend"
$backend = "c:\Users\ghosh\Downloads\VOOK-MAIN\backend"

$frontendFiles = @("src", "public", "package.json", "vite.config.ts", "tsconfig.json", "tsconfig.app.json", "tsconfig.node.json", "tailwind.config.ts", "postcss.config.js", "index.html", ".env", ".env.example", ".gitignore", "bun.lockb", "package-lock.json", "README.md", "components.json", "eslint.config.js", "vercel.json")
$backendFiles = @("supabase", "supabase_schema.sql", "supabase_fixes.sql", "check_columns.sql")

ForEach ($item in $frontendFiles) {
    $p = Join-Path $source $item
    if (Test-Path $p) {
        Write-Host "Moving $item to frontend"
        Move-Item -Path $p -Destination $frontend -Force -ErrorAction Continue
    } else {
        Write-Host "Skipping $item (not found)"
    }
}

ForEach ($item in $backendFiles) {
    $p = Join-Path $source $item
    if (Test-Path $p) {
        Write-Host "Moving $item to backend"
        Move-Item -Path $p -Destination $backend -Force -ErrorAction Continue
    } else {
         Write-Host "Skipping $item (not found)"
    }
}

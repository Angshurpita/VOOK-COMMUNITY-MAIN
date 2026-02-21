$source = "c:\Users\ghosh\Downloads\VOOK-MAIN\VOOK-MAIN\VOOK-MAIN"
$dest = "c:\Users\ghosh\Downloads\VOOK-MAIN\frontend"
Write-Host "Moving from $source to $dest"
if (Test-Path $source) {
    Get-ChildItem -Path $source -Force | ForEach-Object {
        $target = Join-Path $dest $_.Name
        Write-Host "Moving $($_.FullName) to $target"
        Move-Item -Path $_.FullName -Destination $dest -Force -ErrorAction Continue
    }
} else {
    Write-Host "Source not found!"
}
Get-ChildItem $dest

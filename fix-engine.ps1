$srcDir = (Get-Location).Path + "\src"
Write-Host "Scanning: $srcDir"

Get-ChildItem -Path $srcDir -Recurse -Include "*.tsx","*.ts" | ForEach-Object {
    $path = $_.FullName
    $content = [System.IO.File]::ReadAllText($path)
    $original = $content

    # Fix canPerformAction -> canPerformActionV2
    $content = $content.Replace("{ canPerformAction }", "{ canPerformActionV2 }")
    $content = $content.Replace("{ canPerformAction,", "{ canPerformActionV2,")
    $content = $content.Replace(", canPerformAction }", ", canPerformActionV2 }")
    $content = $content.Replace(", canPerformAction,", ", canPerformActionV2,")
    # Replace function calls  
    $content = $content.Replace("canPerformAction(", "canPerformActionV2(")

    if ($content -ne $original) {
        [System.IO.File]::WriteAllText($path, $content)
        Write-Host "  Fixed: $($_.Name)"
    }
}

Write-Host "All done."

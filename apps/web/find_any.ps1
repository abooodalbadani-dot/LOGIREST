
$lines = Get-Content lint_output.txt
$currentFile = ""
$results = @()
foreach ($line in $lines) {
    if ($line -match "^E:\\") {
        $currentFile = $line
    }
    if ($line -match "no-explicit-any") {
        $results += "$currentFile : $line"
    }
}
$results | Out-File -FilePath any_errors_list.txt -Encoding utf8

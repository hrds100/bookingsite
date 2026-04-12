$N8N_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZmI1M2JkZS0zZTdjLTQ2NWItOGI5MS1hOTQwOTlkZGM2YTMiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzczNDI0MDQ5fQ.7lz1_W28UkD0SwjITXHn1t75A8Fl5eVM46XfENFkEtg'
$RESEND_KEY = 're_3S31XXHH_Eojc97vWT4KTzTrYZCEk7bub'
$WORKFLOW_ID = 'z5laFFJMZmq1f5uK'
$BASE = 'https://n8n.srv886554.hstgr.cloud/api/v1'
$headers = @{ 'X-N8N-API-KEY' = $N8N_KEY; 'Content-Type' = 'application/json' }

# 1. Fetch the workflow
Write-Host "Fetching workflow $WORKFLOW_ID..."
$workflow = Invoke-RestMethod -Uri "$BASE/workflows/$WORKFLOW_ID" -Headers $headers -Method Get
Write-Host "Active: $($workflow.active)"

# 2. Serialise to JSON and check for placeholder
$json = $workflow | ConvertTo-Json -Depth 30 -Compress
$count = ([regex]::Matches($json, 're_placeholder')).Count
Write-Host "Found re_placeholder: $count times"

if ($count -eq 0) {
    Write-Host "No placeholder found — nothing to update."
    exit 0
}

# 3. Replace placeholder
$updated = $json.Replace('re_placeholder', $RESEND_KEY)
$replaced = ([regex]::Matches($updated, [regex]::Escape($RESEND_KEY))).Count
Write-Host "Replaced with real key: $replaced times"

# 4. Deactivate
Write-Host "Deactivating..."
Invoke-RestMethod -Uri "$BASE/workflows/$WORKFLOW_ID/deactivate" -Headers $headers -Method Post | Out-Null

# 5. PUT the updated workflow
# n8n PUT requires: name, nodes, connections, settings
$body = $updated | ConvertFrom-Json
$putPayload = @{
    name        = $body.name
    nodes       = $body.nodes
    connections = $body.connections
    settings    = $body.settings
} | ConvertTo-Json -Depth 30 -Compress

Write-Host "Updating workflow..."
$result = Invoke-RestMethod -Uri "$BASE/workflows/$WORKFLOW_ID" -Headers $headers -Method Put -Body $putPayload
Write-Host "Update result name: $($result.name)"

# 6. Reactivate
Write-Host "Reactivating..."
Invoke-RestMethod -Uri "$BASE/workflows/$WORKFLOW_ID/activate" -Headers $headers -Method Post | Out-Null
Write-Host "Done. Verifying..."

# 7. Verify
$verify = Invoke-RestMethod -Uri "$BASE/workflows/$WORKFLOW_ID" -Headers $headers -Method Get
$verifyJson = $verify | ConvertTo-Json -Depth 30 -Compress
$stillHas = ([regex]::Matches($verifyJson, 're_placeholder')).Count
$hasReal  = ([regex]::Matches($verifyJson, [regex]::Escape($RESEND_KEY))).Count
Write-Host "Active: $($verify.active)"
Write-Host "Placeholders remaining: $stillHas"
Write-Host "Real key present: $hasReal times"
if ($stillHas -eq 0 -and $hasReal -gt 0) {
    Write-Host "SUCCESS - Resend key is live in workflow"
} else {
    Write-Host "WARNING - Check manually"
}

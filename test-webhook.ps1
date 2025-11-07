$uri = "https://ant-allowing-mildly.ngrok-free.app/webhook/order-created"
$body = @{
    id = "test123"
    status = "created"
    event_uuid = "test-uuid"
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod -Uri $uri -Method POST -Body $body -Headers $headers
    Write-Host "Response: $($response | ConvertTo-Json -Depth 10)"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    Write-Host "Response: $($_.Exception.Response)"
} 
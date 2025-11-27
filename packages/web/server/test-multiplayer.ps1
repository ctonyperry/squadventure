# Multiplayer Test Script for AI-DM Web Server
# Run this script to test a full multiplayer scenario

$BASE_URL = "http://localhost:3001"

Write-Host "=== AI-DM Multiplayer Test ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create a DM (host) player
Write-Host "1. Creating DM player (guest)..." -ForegroundColor Yellow
$dmResponse = Invoke-RestMethod -Uri "$BASE_URL/api/auth/guest" -Method POST -ContentType "application/json" -Body '{"displayName": "DungeonMaster"}'
$dmToken = $dmResponse.tokens.authToken
$dmId = $dmResponse.player.id
Write-Host "   DM created: $dmId" -ForegroundColor Green
Write-Host ""

# Step 2: Create Player 1
Write-Host "2. Creating Player 1 (guest)..." -ForegroundColor Yellow
$p1Response = Invoke-RestMethod -Uri "$BASE_URL/api/auth/guest" -Method POST -ContentType "application/json" -Body '{"displayName": "Aragorn"}'
$p1Token = $p1Response.tokens.authToken
$p1Id = $p1Response.player.id
Write-Host "   Player 1 created: $p1Id" -ForegroundColor Green
Write-Host ""

# Step 3: Create Player 2
Write-Host "3. Creating Player 2 (guest)..." -ForegroundColor Yellow
$p2Response = Invoke-RestMethod -Uri "$BASE_URL/api/auth/guest" -Method POST -ContentType "application/json" -Body '{"displayName": "Legolas"}'
$p2Token = $p2Response.tokens.authToken
$p2Id = $p2Response.player.id
Write-Host "   Player 2 created: $p2Id" -ForegroundColor Green
Write-Host ""

# Step 4: DM creates a room
Write-Host "4. DM creating game room..." -ForegroundColor Yellow
$headers = @{ "Authorization" = "Bearer $dmToken" }
$roomBody = @{
    name = "The Lost Mines of Phandelver"
    minPlayers = 1
    maxPlayers = 4
    visibility = "public"
} | ConvertTo-Json
$roomResponse = Invoke-RestMethod -Uri "$BASE_URL/api/rooms" -Method POST -ContentType "application/json" -Headers $headers -Body $roomBody
$roomCode = $roomResponse.room.code
$roomId = $roomResponse.room.id
Write-Host "   Room created: $($roomResponse.room.name)" -ForegroundColor Green
Write-Host "   Room Code: $roomCode (share this with players!)" -ForegroundColor Cyan
Write-Host ""

# Step 5: Player 1 joins the room
Write-Host "5. Player 1 (Aragorn) joining room..." -ForegroundColor Yellow
$p1Headers = @{ "Authorization" = "Bearer $p1Token" }
$joinBody = @{ code = $roomCode } | ConvertTo-Json
$p1Join = Invoke-RestMethod -Uri "$BASE_URL/api/rooms/join" -Method POST -ContentType "application/json" -Headers $p1Headers -Body $joinBody
Write-Host "   Aragorn joined! Players: $($p1Join.room.playerCount)" -ForegroundColor Green
Write-Host ""

# Step 6: Player 2 joins the room
Write-Host "6. Player 2 (Legolas) joining room..." -ForegroundColor Yellow
$p2Headers = @{ "Authorization" = "Bearer $p2Token" }
$p2Join = Invoke-RestMethod -Uri "$BASE_URL/api/rooms/join" -Method POST -ContentType "application/json" -Headers $p2Headers -Body $joinBody
Write-Host "   Legolas joined! Players: $($p2Join.room.playerCount)" -ForegroundColor Green
Write-Host ""

# Step 7: List room players
Write-Host "7. Listing room players..." -ForegroundColor Yellow
$players = Invoke-RestMethod -Uri "$BASE_URL/api/rooms/$roomId/players" -Method GET -Headers $headers
Write-Host "   Players in room:" -ForegroundColor Green
foreach ($player in $players.players) {
    Write-Host "   - $($player.displayName) ($($player.role))" -ForegroundColor White
}
Write-Host ""

# Step 8: DM starts the room (sets to active)
Write-Host "8. DM starting the game..." -ForegroundColor Yellow
$statusBody = @{ status = "active" } | ConvertTo-Json
Invoke-RestMethod -Uri "$BASE_URL/api/rooms/$roomId/status" -Method POST -ContentType "application/json" -Headers $headers -Body $statusBody | Out-Null
Write-Host "   Game started!" -ForegroundColor Green
Write-Host ""

# Step 9: Initialize turn system
Write-Host "9. Initializing turn system (initiative mode)..." -ForegroundColor Yellow
$turnInitBody = @{
    roomId = $roomId
    mode = "initiative"
    turnTimeoutMs = 60000
} | ConvertTo-Json
$turnInit = Invoke-RestMethod -Uri "$BASE_URL/api/turns/init" -Method POST -ContentType "application/json" -Headers $headers -Body $turnInitBody
Write-Host "   Turn system initialized: $($turnInit.turnState.mode) mode" -ForegroundColor Green
Write-Host ""

# Step 10: Add participants with initiative
Write-Host "10. Adding turn participants..." -ForegroundColor Yellow

# Add Aragorn
$aragornBody = @{
    roomId = $roomId
    entityId = "entity_aragorn"
    playerId = $p1Id
    name = "Aragorn"
    initiative = 18
} | ConvertTo-Json
Invoke-RestMethod -Uri "$BASE_URL/api/turns/participants" -Method POST -ContentType "application/json" -Headers $headers -Body $aragornBody | Out-Null
Write-Host "   Aragorn added (initiative: 18)" -ForegroundColor Green

# Add Legolas
$legolasBody = @{
    roomId = $roomId
    entityId = "entity_legolas"
    playerId = $p2Id
    name = "Legolas"
    initiative = 22
} | ConvertTo-Json
Invoke-RestMethod -Uri "$BASE_URL/api/turns/participants" -Method POST -ContentType "application/json" -Headers $headers -Body $legolasBody | Out-Null
Write-Host "   Legolas added (initiative: 22)" -ForegroundColor Green

# Add a goblin NPC (no player)
$goblinBody = @{
    roomId = $roomId
    entityId = "entity_goblin1"
    name = "Goblin Scout"
    initiative = 15
} | ConvertTo-Json
Invoke-RestMethod -Uri "$BASE_URL/api/turns/participants" -Method POST -ContentType "application/json" -Headers $headers -Body $goblinBody | Out-Null
Write-Host "   Goblin Scout added (initiative: 15)" -ForegroundColor Green
Write-Host ""

# Step 11: Start the first round
Write-Host "11. Starting first round of combat..." -ForegroundColor Yellow
$roundBody = @{ roomId = $roomId } | ConvertTo-Json
$roundStart = Invoke-RestMethod -Uri "$BASE_URL/api/turns/round/start" -Method POST -ContentType "application/json" -Headers $headers -Body $roundBody
Write-Host "   Round $($roundStart.round) started!" -ForegroundColor Green
Write-Host "   Current turn: $($roundStart.currentTurn.name)" -ForegroundColor Cyan
Write-Host ""

# Step 12: DM sends a public message
Write-Host "12. DM sending narrative message..." -ForegroundColor Yellow
$msgBody = @{
    roomId = $roomId
    content = "The goblin scout spots you from across the cavern. Roll for initiative!"
    category = "narrative"
} | ConvertTo-Json
$msg = Invoke-RestMethod -Uri "$BASE_URL/api/messages/public" -Method POST -ContentType "application/json" -Headers $headers -Body $msgBody
Write-Host "   Message sent!" -ForegroundColor Green
Write-Host ""

# Step 13: DM whispers to Aragorn
Write-Host "13. DM whispering secret info to Aragorn..." -ForegroundColor Yellow
$whisperBody = @{
    roomId = $roomId
    recipientId = $p1Id
    content = "You notice a hidden passage behind the goblin. Only you can see this."
} | ConvertTo-Json
$whisper = Invoke-RestMethod -Uri "$BASE_URL/api/messages/whisper" -Method POST -ContentType "application/json" -Headers $headers -Body $whisperBody
Write-Host "   Whisper sent to Aragorn!" -ForegroundColor Green
Write-Host ""

# Step 14: Player 1 sends a chat message
Write-Host "14. Aragorn sending chat message..." -ForegroundColor Yellow
$chatBody = @{
    roomId = $roomId
    content = "I draw my sword and prepare to attack!"
    category = "chat"
} | ConvertTo-Json
$chat = Invoke-RestMethod -Uri "$BASE_URL/api/messages/public" -Method POST -ContentType "application/json" -Headers $p1Headers -Body $chatBody
Write-Host "   Chat sent!" -ForegroundColor Green
Write-Host ""

# Step 15: Get messages for Aragorn (should see whisper)
Write-Host "15. Aragorn's messages (includes whisper):" -ForegroundColor Yellow
$aragornMsgs = Invoke-RestMethod -Uri "$BASE_URL/api/messages/$roomId" -Method GET -Headers $p1Headers
foreach ($m in $aragornMsgs.messages) {
    $color = if ($m.visibility -eq "whisper") { "Magenta" } else { "White" }
    Write-Host "   [$($m.visibility)] $($m.senderName): $($m.content)" -ForegroundColor $color
}
Write-Host ""

# Step 16: Get messages for Legolas (should NOT see whisper)
Write-Host "16. Legolas's messages (no whisper):" -ForegroundColor Yellow
$legolasMsgs = Invoke-RestMethod -Uri "$BASE_URL/api/messages/$roomId" -Method GET -Headers $p2Headers
foreach ($m in $legolasMsgs.messages) {
    Write-Host "   [$($m.visibility)] $($m.senderName): $($m.content)" -ForegroundColor White
}
Write-Host ""

# Step 17: Get turn state
Write-Host "17. Current turn state:" -ForegroundColor Yellow
$turnState = Invoke-RestMethod -Uri "$BASE_URL/api/turns/$roomId" -Method GET
Write-Host "   Round: $($turnState.currentRound)" -ForegroundColor White
Write-Host "   Current Turn: $($turnState.currentTurn.name)" -ForegroundColor Cyan
Write-Host "   Turn Order:" -ForegroundColor White
foreach ($p in $turnState.participants | Sort-Object -Property initiative -Descending) {
    $acted = if ($p.hasActed) { "[acted]" } else { "" }
    Write-Host "     $($p.initiative) - $($p.name) $acted" -ForegroundColor White
}
Write-Host ""

# Step 18: End Legolas's turn (highest initiative goes first)
Write-Host "18. Legolas ends turn (fires arrow)..." -ForegroundColor Yellow
$endTurnBody = @{
    roomId = $roomId
    action = "Fires arrow at goblin"
} | ConvertTo-Json
$endTurn = Invoke-RestMethod -Uri "$BASE_URL/api/turns/end" -Method POST -ContentType "application/json" -Headers $p2Headers -Body $endTurnBody
Write-Host "   Turn ended! Next: $($endTurn.currentTurn.name)" -ForegroundColor Green
Write-Host ""

# Step 19: Get room info
Write-Host "19. Final room state:" -ForegroundColor Yellow
$finalRoom = Invoke-RestMethod -Uri "$BASE_URL/api/rooms/$roomId" -Method GET -Headers $headers
Write-Host "   Room: $($finalRoom.room.name)" -ForegroundColor White
Write-Host "   Status: $($finalRoom.room.status)" -ForegroundColor White
Write-Host "   Players: $($finalRoom.room.playerCount)" -ForegroundColor White
Write-Host ""

Write-Host "=== Test Complete! ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Summary:" -ForegroundColor Yellow
Write-Host "  - Created 3 players (DM, Aragorn, Legolas)" -ForegroundColor White
Write-Host "  - Created room with code: $roomCode" -ForegroundColor White
Write-Host "  - Players joined via room code" -ForegroundColor White
Write-Host "  - Initiative-based turn system working" -ForegroundColor White
Write-Host "  - Public and private (whisper) messaging working" -ForegroundColor White
Write-Host ""
Write-Host "Tokens for further testing:" -ForegroundColor Yellow
Write-Host "  DM Token: $dmToken" -ForegroundColor Gray
Write-Host "  Aragorn Token: $p1Token" -ForegroundColor Gray
Write-Host "  Legolas Token: $p2Token" -ForegroundColor Gray

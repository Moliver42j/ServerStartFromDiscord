#!/bin/bash

echo "Discord Slash Command Registration"
echo "==================================="
echo ""

read -p "Enter your Discord Application ID: " APP_ID
read -p "Enter your Discord Bot Token: " BOT_TOKEN
read -p "Enter your Guild ID (leave empty for global commands): " GUILD_ID

if [ -z "$APP_ID" ] || [ -z "$BOT_TOKEN" ]; then
  echo "Error: Application ID and Bot Token are required"
  exit 1
fi

if [ -n "$GUILD_ID" ]; then
  URL="https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands"
  echo "Registering guild commands (instant update)..."
else
  URL="https://discord.com/api/v10/applications/${APP_ID}/commands"
  echo "Registering global commands (may take up to 1 hour to propagate)..."
fi

COMMANDS='[
  {
    "name": "server-up",
    "type": 1,
    "description": "Start the game server"
  },
  {
    "name": "server-down",
    "type": 1,
    "description": "Stop the game server"
  }
]'

RESPONSE=$(curl -s -X PUT "$URL" \
  -H "Authorization: Bot ${BOT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$COMMANDS")

if echo "$RESPONSE" | grep -q '"id"'; then
  echo "Commands registered successfully!"
  echo ""
  echo "Registered commands:"
  echo "$RESPONSE" | grep -o '"name":"[^"]*"' | sed 's/"name":"//g' | sed 's/"//g' | while read cmd; do
    echo "  /$cmd"
  done
else
  echo "Error registering commands:"
  echo "$RESPONSE"
  exit 1
fi

#!/bin/sh
set -e

node backend/server.js &
BACKEND_PID=$!

node bot/bot.js &
BOT_PID=$!

wait $BACKEND_PID $BOT_PID

# LIFE UPGRADE × PROJECT 50

Interactive Project 50 daily quest panel with XP, Coins, Wishlist, and Netlify-powered sync.

## Features

- Daily quest panel for EARLY, MORNING, BODY, SKILL, BOOK, DIET, and TRACK
- Automatic XP / Coins calculation
- Perfect Day and Full Clear combo bonuses
- Wishlist progress tracking
- Cloud sync through a private sync code

## Deploy

This project is designed for Netlify.

- Publish directory: `public`
- Functions directory: `netlify/functions`
- Sync endpoint: `/api/panel-state`

The sync code is hashed in the browser before it is sent to the server.

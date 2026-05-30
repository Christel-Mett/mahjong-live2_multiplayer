#!/bin/bash

TOKEN=$(grep ADMIN_TOKEN /var/www/mahjong2/.env | cut -d '=' -f2)

RESPONSE=$(curl -s \
  -H "x-admin-token: $TOKEN" \
  http://localhost:3020/admin/users)

COUNT=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['count'])")
TIME=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['timestamp'][11:19])")
USERS=$(echo "$RESPONSE" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for u in d['users']:
    print(f\"  {u['username']} → {u['location']}\")
")

echo "Aktive User ($COUNT) – $TIME"
echo "$USERS"

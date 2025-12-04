#!/bin/bash
# Script to create KV namespaces for rainbowsmokeofficial.com

echo "Creating KV namespaces..."

echo ""
echo "Creating AUTH_KV namespace..."
wrangler kv namespace create AUTH_KV

echo ""
echo "Creating SESSIONS_KV namespace..."
wrangler kv namespace create SESSIONS_KV

echo ""
echo "✅ KV namespaces created!"
echo ""
echo "⚠️  IMPORTANT: Copy the IDs from above and update them in wrangler.jsonc"
echo "   Replace REPLACE_WITH_AUTH_KV_ID and REPLACE_WITH_SESSIONS_KV_ID"

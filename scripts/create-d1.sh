#!/bin/bash
# Script to create D1 database for rainbowsmokeofficial.com

echo "Creating D1 database..."

wrangler d1 create rainbowsmoke-db

echo ""
echo "✅ D1 database created!"
echo ""
echo "⚠️  IMPORTANT: Copy the database_id from above and update it in wrangler.jsonc"
echo "   Replace REPLACE_WITH_DATABASE_ID"
echo ""
echo "Next steps:"
echo "1. Update wrangler.jsonc with the database_id"
echo "2. Run: npm run d1:migrate"

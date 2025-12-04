#!/bin/bash
# Deployment script for rainbowsmokeofficial.com

echo "🚀 Deploying rainbowsmokeofficial.com to Cloudflare Workers..."
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Error: wrangler is not installed"
    echo "Run: npm install -g wrangler"
    exit 1
fi

# Check if secrets are set
echo "⚠️  Make sure you've set the following secrets:"
echo "  - NSFW_PASSWORD"
echo "  - ADMIN_PASSWORD"
echo "  - SESSION_SECRET"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."

# Deploy
wrangler deploy

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Configure custom domain in Cloudflare Dashboard"
echo "2. Test at your workers.dev URL"
echo "3. Monitor with: wrangler tail"

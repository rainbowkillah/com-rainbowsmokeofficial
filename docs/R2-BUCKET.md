# R2 Bucket Configuration

## Overview

The site uses Cloudflare R2 object storage to serve media assets for the gallery and NSFW sections. The bucket name is `rainbowsmokeofficial-com-media`.

## Bucket Structure

```
rainbowsmokeofficial-com-media/
├── gallery/
│   ├── images/
│   │   ├── profile-1.jpg
│   │   ├── gaming-setup.png
│   │   ├── dc-pride-2024.jpg
│   │   └── ...
│   └── videos/
│       ├── stream-highlight.mp4
│       └── ...
└── nsfw/
    ├── images/
    │   └── ... (18+ content)
    └── videos/
        └── ... (18+ content)
```

## Access Configuration

### wrangler.jsonc Binding

```jsonc
"r2_buckets": [
  {
    "binding": "MEDIA_BUCKET",
    "bucket_name": "rainbowsmokeofficial-com-media"
  }
]
```

## Routes

### Public Gallery Media

**GET** `/media/gallery/*`
- Serves images and videos from `gallery/` folder
- Public access (no authentication required)
- Long cache time (1 year)
- Example: `/media/gallery/images/profile-1.jpg`

### Protected NSFW Media

**GET** `/media/nsfw/*`
- Serves adult content from `nsfw/` folder
- **Requires NSFW authentication** (password-protected)
- Short cache time (1 hour, private)
- Example: `/media/nsfw/images/photo-001.jpg`

### API Endpoints

#### List Gallery Media

**GET** `/api/gallery/media`

Returns JSON list of all gallery media:

```json
{
  "success": true,
  "media": [
    {
      "key": "gallery/images/profile-1.jpg",
      "url": "/media/gallery/images/profile-1.jpg",
      "size": 524288,
      "uploaded": "2024-01-15T10:30:00.000Z",
      "type": "image"
    }
  ],
  "count": 1
}
```

#### List NSFW Media (Protected)

**GET** `/api/nsfw/media`

Requires authentication. Returns JSON list of NSFW media.

## Uploading Media

### Using Wrangler CLI

```bash
# Upload a single image to gallery
wrangler r2 object put rainbowsmokeofficial-com-media/gallery/images/my-photo.jpg --file=./my-photo.jpg

# Upload to NSFW folder
wrangler r2 object put rainbowsmokeofficial-com-media/nsfw/images/photo.jpg --file=./photo.jpg

# Upload with content type
wrangler r2 object put rainbowsmokeofficial-com-media/gallery/videos/clip.mp4 \
  --file=./clip.mp4 \
  --content-type=video/mp4
```

### Bulk Upload

```bash
# Upload all images from a folder
for file in ./gallery-images/*; do
  filename=$(basename "$file")
  wrangler r2 object put "rainbowsmokeofficial-com-media/gallery/images/$filename" --file="$file"
done
```

### Using Cloudflare Dashboard

1. Go to **R2** in Cloudflare Dashboard
2. Select `rainbowsmokeofficial-com-media` bucket
3. Navigate to the appropriate folder (`gallery/images/` or `nsfw/images/`)
4. Click **Upload** button
5. Select files to upload

## Supported File Types

### Images
- JPEG (`.jpg`, `.jpeg`)
- PNG (`.png`)
- GIF (`.gif`)
- WebP (`.webp`)
- SVG (`.svg`)

### Videos
- MP4 (`.mp4`)
- WebM (`.webm`)
- MOV (`.mov`)

## Best Practices

1. **Image Optimization**: Compress images before uploading
   - Recommended max width: 1920px for gallery images
   - Use WebP format for best compression
   - Target size: < 500KB per image

2. **Naming Convention**:
   - Use descriptive, lowercase filenames
   - Use hyphens instead of spaces: `dc-pride-event.jpg`
   - Avoid special characters

3. **Organization**:
   - Keep gallery images in `gallery/images/`
   - Keep gallery videos in `gallery/videos/`
   - Keep NSFW content in appropriate `nsfw/` subfolders

4. **Security**:
   - NSFW content is automatically protected by authentication
   - Never put sensitive content in `gallery/` folder (it's public!)

## Dynamic Gallery Loading

The gallery page automatically loads images from the R2 bucket via JavaScript. When the page loads:

1. Fetches media list from `/api/gallery/media`
2. Removes placeholder images
3. Dynamically creates gallery cards for R2 images
4. Initializes lightbox for new images

If R2 is unavailable or empty, the site falls back to placeholder images.

## Cache Configuration

### Gallery Media
- Cache-Control: `public, max-age=31536000` (1 year)
- ETags enabled for efficient caching

### NSFW Media
- Cache-Control: `private, max-age=3600` (1 hour)
- ETags enabled
- Private caching (not shared in CDN)

## Troubleshooting

### Media not loading?

1. **Check bucket binding**:
   ```bash
   wrangler dev
   # Visit /api/status - check MEDIA_BUCKET is true
   ```

2. **Verify R2 object exists**:
   ```bash
   wrangler r2 object get rainbowsmokeofficial-com-media/gallery/images/test.jpg
   ```

3. **Check console logs**:
   - Open browser DevTools
   - Look for R2 media loading errors
   - Verify API responses from `/api/gallery/media`

### NSFW media showing 401 Unauthorized?

- Ensure you're logged in to the NSFW members area
- Check session cookie is valid
- Try logging out and back in

## Examples

### Example 1: Add new gallery image

```bash
# Optimize image first
convert original.jpg -resize 1920x1080^ -quality 85 optimized.jpg

# Upload to R2
wrangler r2 object put rainbowsmokeofficial-com-media/gallery/images/my-new-photo.jpg \
  --file=./optimized.jpg \
  --content-type=image/jpeg

# Image will automatically appear in gallery on next page load
```

### Example 2: Add NSFW content

```bash
# Upload to NSFW folder (requires authentication to view)
wrangler r2 object put rainbowsmokeofficial-com-media/nsfw/images/content-001.jpg \
  --file=./content.jpg \
  --content-type=image/jpeg
```

### Example 3: List all gallery media

```bash
wrangler r2 object list rainbowsmokeofficial-com-media --prefix=gallery/
```

## Cost Considerations

R2 Pricing (as of 2024):
- **Storage**: $0.015/GB per month
- **Class A operations** (writes, lists): $4.50 per million
- **Class B operations** (reads): $0.36 per million
- **Egress**: **FREE** (no bandwidth charges!)

Estimated monthly cost for ~1000 images (5GB):
- Storage: ~$0.08/month
- Operations: Negligible for small sites
- **Total: < $1/month**

## Additional Resources

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Wrangler R2 Commands](https://developers.cloudflare.com/workers/wrangler/commands/#r2)
- [Image Optimization Guide](https://web.dev/fast/#optimize-your-images)

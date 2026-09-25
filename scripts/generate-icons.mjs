import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

const icon = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#315b4d"/><circle cx="256" cy="256" r="142" fill="#f8f6f0"/><path d="M256 133v246M133 256h246" stroke="#e58b54" stroke-width="28" stroke-linecap="round"/></svg>`)
const maskable = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#315b4d"/><circle cx="256" cy="256" r="142" fill="#f8f6f0"/><path d="M256 133v246M133 256h246" stroke="#e58b54" stroke-width="28" stroke-linecap="round"/></svg>`)

await mkdir('public/icons', { recursive: true })
// Standard manifest sizes (Android/Chrome launcher densities + install/splash sizes)
const sizes = [48, 72, 96, 128, 144, 152, 192, 256, 384, 512]
for (const size of sizes) await sharp(icon).resize(size, size).png().toFile(`public/icons/icon-${size}.png`)
// iOS ignores manifest icons and uses apple-touch-icon; it applies its own rounded mask, so use the full-bleed art
await sharp(maskable).resize(180, 180).png().toFile('public/icons/apple-touch-icon-180.png')
// Maskable icons keep the artwork inside the 80% safe zone so Android can crop to any shape
await sharp(maskable).resize(192, 192).png().toFile('public/icons/icon-maskable-192.png')
await sharp(maskable).resize(512, 512).png().toFile('public/icons/icon-maskable-512.png')

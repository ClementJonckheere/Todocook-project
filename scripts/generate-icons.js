/**
 * Icon Generator for TodoCook PWA
 *
 * Generates PNG icons from SVG for all required sizes.
 * Run: node scripts/generate-icons.js
 *
 * Requires: npm install -D sharp (only for icon generation)
 *
 * For production, replace the generated icons with professionally designed ones.
 */

const fs = require("fs");
const path = require("path");

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// SVG icon: green circle with white chef hat/utensil
const createSvg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="100" fill="#16a34a"/>
  <g transform="translate(256, 240)">
    <circle cx="0" cy="-60" r="45" fill="white" opacity="0.9"/>
    <circle cx="-40" cy="-40" r="35" fill="white" opacity="0.9"/>
    <circle cx="40" cy="-40" r="35" fill="white" opacity="0.9"/>
    <rect x="-50" y="-30" width="100" height="80" rx="10" fill="white"/>
    <text x="0" y="130" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="bold" font-size="72" fill="white">TC</text>
  </g>
</svg>`;

const iconsDir = path.join(__dirname, "..", "public", "icons");

// Try sharp first, fallback to SVG-only
async function generate() {
  try {
    const sharp = require("sharp");
    for (const size of sizes) {
      const svg = Buffer.from(createSvg(512));
      await sharp(svg).resize(size, size).png().toFile(path.join(iconsDir, `icon-${size}x${size}.png`));
      console.log(`Generated icon-${size}x${size}.png`);
    }

    // Apple touch icon
    const svg = Buffer.from(createSvg(512));
    await sharp(svg).resize(180, 180).png().toFile(path.join(iconsDir, "..", "apple-touch-icon.png"));
    console.log("Generated apple-touch-icon.png");

    // Favicon
    await sharp(svg).resize(32, 32).png().toFile(path.join(iconsDir, "..", "favicon.png"));
    console.log("Generated favicon.png");

    console.log("\nAll icons generated successfully!");
  } catch (e) {
    // Fallback: save SVGs directly for each size
    console.log("sharp not installed, generating SVG placeholders...");
    for (const size of sizes) {
      fs.writeFileSync(path.join(iconsDir, `icon-${size}x${size}.svg`), createSvg(size));
      console.log(`Generated icon-${size}x${size}.svg (placeholder)`);
    }
    console.log("\nSVG placeholders generated. Install sharp for PNG icons: npm install -D sharp");
    console.log("Then run: node scripts/generate-icons.js");
  }
}

generate();

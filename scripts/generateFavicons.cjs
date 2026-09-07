const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Design: offwhite background (#F5F1E8), bold clean sans-serif numerals "6-0", dark charcoal (#111111), centered, minimal padding for 16x16 legibility.
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#F5F1E8"/>
  <text x="256" y="340" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="280" font-weight="900" fill="#111111" text-anchor="middle" letter-spacing="-8">6-0</text>
</svg>
`;

async function main() {
  const publicDir = path.resolve(__dirname, '../public');
  const srcDir = path.resolve(__dirname, '../src');

  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent);
  fs.writeFileSync(path.join(srcDir, 'favicon.svg'), svgContent);

  const svgBuffer = Buffer.from(svgContent);

  const sizes = [
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'android-chrome-192x192.png', size: 192 },
    { name: 'android-chrome-512x512.png', size: 512 },
  ];

  for (const s of sizes) {
    const outPath = path.join(publicDir, s.name);
    await sharp(svgBuffer).resize(s.size, s.size).png().toFile(outPath);
    console.log(`Generated ${s.name} (${s.size}x${s.size})`);
  }

  // Generate ICO containing 16x16 and 32x32 frames
  // Simple valid ICO header and PNG images
  const png16 = await sharp(svgBuffer).resize(16, 16).png().toBuffer();
  const png32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer();

  // Write 32x32 as fallback favicon.ico
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0); // reserved
  icoHeader.writeUInt16LE(1, 2); // ICO image type
  icoHeader.writeUInt16LE(2, 4); // 2 images

  const dirEntry1 = Buffer.alloc(16);
  dirEntry1.writeUInt8(16, 0); // width
  dirEntry1.writeUInt8(16, 1); // height
  dirEntry1.writeUInt8(0, 2);  // color palette
  dirEntry1.writeUInt8(0, 3);  // reserved
  dirEntry1.writeUInt16LE(1, 4); // color planes
  dirEntry1.writeUInt16LE(32, 6); // bits per pixel
  dirEntry1.writeUInt32LE(png16.length, 8); // image size in bytes
  dirEntry1.writeUInt32LE(6 + 16 * 2, 12); // image offset

  const dirEntry2 = Buffer.alloc(16);
  dirEntry2.writeUInt8(32, 0); // width
  dirEntry2.writeUInt8(32, 1); // height
  dirEntry2.writeUInt8(0, 2);  // color palette
  dirEntry2.writeUInt8(0, 3);  // reserved
  dirEntry2.writeUInt16LE(1, 4); // color planes
  dirEntry2.writeUInt16LE(32, 6); // bits per pixel
  dirEntry2.writeUInt32LE(png32.length, 8); // image size in bytes
  dirEntry2.writeUInt32LE(6 + 16 * 2 + png16.length, 12); // image offset

  const icoBuffer = Buffer.concat([icoHeader, dirEntry1, dirEntry2, png16, png32]);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(srcDir, 'favicon.ico'), icoBuffer);
  console.log('Generated favicon.ico (multi-res 16x16, 32x32)');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

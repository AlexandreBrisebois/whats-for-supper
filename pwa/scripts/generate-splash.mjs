import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const splashDir = path.join(__dirname, '../public/splash');
const defaultIconPath = path.join(__dirname, '../public/android-chrome-512x512.png');

// Ensure splash directory exists
if (!fs.existsSync(splashDir)) {
  fs.mkdirSync(splashDir, { recursive: true });
}

// Device-specific splash screen sizes (portrait)
const sizes = [
  { width: 750, height: 1334, name: 'iphone-se' },
  { width: 1125, height: 2436, name: 'iphone-x' },
  { width: 828, height: 1792, name: 'iphone-xr' },
  { width: 1242, height: 2688, name: 'iphone-xs-max' },
  { width: 1080, height: 2340, name: 'iphone-12-mini' },
  { width: 1170, height: 2532, name: 'iphone-12' },
  { width: 1284, height: 2778, name: 'iphone-14-plus' },
  { width: 1179, height: 2556, name: 'iphone-14-pro' },
  { width: 1290, height: 2796, name: 'iphone-14-pro-max' },
  { width: 1536, height: 2048, name: 'ipad-9' },
  { width: 1668, height: 2388, name: 'ipad-air-11' },
  { width: 2048, height: 2732, name: 'ipad-pro-12' },
];

// Background color matching manifest
const bgColor = { r: 253, g: 252, b: 240, alpha: 1 }; // #FDFCF0

const args = process.argv.slice(2);
const backgroundArg = args.find((a) => a.startsWith('--background='));
const backgroundImage = backgroundArg ? backgroundArg.split('=')[1] : null;

const outDirArg = args.find((a) => a.startsWith('--outDir='));
const customOutDir = outDirArg ? path.join(__dirname, '..', outDirArg.split('=')[1]) : splashDir;

// Ensure output directory exists
if (!fs.existsSync(customOutDir)) {
  fs.mkdirSync(customOutDir, { recursive: true });
}

async function generateSplashScreens() {
  console.log('Generating PWA splash screens...');
  console.log(`Output directory: ${customOutDir}`);
  if (backgroundImage) {
    console.log(`Using background image: ${backgroundImage}`);
  }

  try {
    for (const size of sizes) {
      const filename = `splash-${size.width}x${size.height}.png`;
      const filepath = path.join(customOutDir, filename);

      if (backgroundImage) {
        // Full-bleed background approach (Resize to cover, then crop)
        await sharp(backgroundImage)
          .resize(size.width, size.height, {
            fit: 'cover',
            position: 'center',
          })
          .png()
          .toFile(filepath);
      } else {
        // Classic approach: Logo centered on solid background
        const canvas = sharp({
          create: {
            width: size.width,
            height: size.height,
            channels: 4,
            background: bgColor,
          },
        });

        const iconBuffer = await sharp(defaultIconPath)
          .resize(200, 200, { fit: 'contain', background: bgColor })
          .toBuffer();

        await canvas
          .composite([
            {
              input: iconBuffer,
              gravity: 'center',
            },
          ])
          .png()
          .toFile(filepath);
      }

      console.log(`✓ Generated ${filename}`);
    }

    console.log(`\n✓ All ${sizes.length} splash screens generated successfully!`);
  } catch (error) {
    console.error('Error generating splash screens:', error);
    process.exit(1);
  }
}

generateSplashScreens();

const sharp = require('sharp');
const path = require('path');

async function generateAdaptiveIcon() {
    try {
        const logoPath = path.join(__dirname, 'assets', 'logo_transparent.png');
        const outputPath = path.join(__dirname, 'assets', 'icon_new.png');

        // Target adaptive icon dimensions: 1024x1024
        // The safe zone is the inner 66%. To be perfectly safe, we'll size the logo
        // to a 500px box fitting inside the 1024x1024 white canvas.

        await sharp({
            create: {
                width: 1024,
                height: 1024,
                channels: 4,
                background: { r: 255, g: 255, b: 255, alpha: 1 } // solid white background
            }
        })
            .composite([
                {
                    input: await sharp(logoPath).resize({
                        width: 500,
                        height: 500,
                        fit: 'contain',
                        background: { r: 255, g: 255, b: 255, alpha: 0 }
                    }).toBuffer(),
                    gravity: 'center'
                }
            ])
            .png()
            .toFile(outputPath);

        console.log('Successfully generated smaller icon_new.png for Android 12+ Adaptive Icon padding.');
    } catch (e) {
        console.error('Error generating icon:', e);
    }
}

generateAdaptiveIcon();

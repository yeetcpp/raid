const fs = require('fs');
const PNG = require('pngjs').PNG;

fs.createReadStream('/Users/rithwikchintapatla/Documents/FlipperPhaser/public/assets/CollidingMap.png')
    .pipe(new PNG({
        filterType: 4
    }))
    .on('parsed', function() {
        let minX = this.width, maxX = 0;
        let minY = this.height, maxY = 0;
        let wallPixels = 0;
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                let idx = (this.width * y + x) << 2;
                let a = this.data[idx + 3];
                // if it's not transparent, maybe it's a wall?
                if (a > 128) {
                    wallPixels++;
                    minX = Math.min(minX, x);
                    maxX = Math.max(maxX, x);
                    minY = Math.min(minY, y);
                    maxY = Math.max(maxY, y);
                }
            }
        }
        console.log(`Dimensions: ${this.width}x${this.height}`);
        console.log(`Wall Pixels (alpha > 128): ${wallPixels}`);
        console.log(`Bounding box: (${minX}, ${minY}) to (${maxX}, ${maxY})`);
    });

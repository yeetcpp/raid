const fs = require('fs');
const PNG = require('pngjs').PNG;

fs.createReadStream('./public/assets/CollidingMap.png')
    .pipe(new PNG({ filterType: 4 }))
    .on('parsed', function() {
        const collisions = [];
        
        // Scan for collision rectangles
        // A collision is any non-transparent pixel (alpha > 128)
        for (let y = 0; y < this.height; y++) {
            let inCollision = false;
            let startX = 0;
            
            for (let x = 0; x < this.width; x++) {
                const idx = (this.width * y + x) << 2;
                const alpha = this.data[idx + 3];
                const isCollision = alpha > 128;
                
                if (isCollision && !inCollision) {
                    // Start of collision run
                    inCollision = true;
                    startX = x;
                } else if (!isCollision && inCollision) {
                    // End of collision run
                    inCollision = false;
                    collisions.push({
                        x: startX,
                        y: y,
                        w: x - startX,
                        h: 1
                    });
                }
            }
            
            // Handle collision that extends to end of line
            if (inCollision) {
                collisions.push({
                    x: startX,
                    y: y,
                    w: this.width - startX,
                    h: 1
                });
            }
        }
        
        // Merge adjacent rows with same x,w coordinates
        const merged = [];
        for (const collision of collisions) {
            if (merged.length > 0) {
                const last = merged[merged.length - 1];
                if (last.x === collision.x && last.w === collision.w && last.y + last.h === collision.y) {
                    // Extend height of previous collision
                    last.h++;
                } else {
                    merged.push(collision);
                }
            } else {
                merged.push(collision);
            }
        }
        
        // Write to file
        fs.writeFileSync('./public/assets/collisions.json', JSON.stringify(merged));
        console.log(`✓ Regenerated collisions.json with ${merged.length} collision rectangles`);
        console.log(`Image size: ${this.width}x${this.height}`);
    });

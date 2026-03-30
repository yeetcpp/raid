const fs = require('fs');
const { PNG } = require('pngjs');

const frameW = 32;
const frameH = 32;
const cols = 3;
const rows = 4;
const width = frameW * cols;
const height = frameH * rows;
const png = new PNG({ width, height });

function setPixel(x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  const idx = (width * y + x) << 2;
  png.data[idx] = r;
  png.data[idx + 1] = g;
  png.data[idx + 2] = b;
  png.data[idx + 3] = a;
}

function fillRect(x, y, w, h, rgba) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      setPixel(xx, yy, rgba[0], rgba[1], rgba[2], rgba[3] ?? 255);
    }
  }
}

function drawStudentFrame(col, row, walkOffset = 0, facing = 'down') {
  const ox = col * frameW;
  const oy = row * frameH;

  const skin = [238, 201, 164, 255];
  const hair = [68, 44, 32, 255];
  const shirt = [79, 145, 200, 255];
  const pants = [49, 70, 96, 255];
  const bag = [238, 147, 68, 255];
  const shoe = [28, 36, 48, 255];
  const shadow = [20, 26, 38, 160];

  fillRect(ox + 10, oy + 26, 12, 2, shadow);

  if (facing === 'up') {
    fillRect(ox + 12, oy + 6, 8, 5, hair);
    fillRect(ox + 13, oy + 11, 6, 3, skin);
  } else {
    fillRect(ox + 12, oy + 6, 8, 4, hair);
    fillRect(ox + 12, oy + 10, 8, 4, skin);
    if (facing === 'down') {
      fillRect(ox + 13, oy + 12, 1, 1, [44, 38, 35, 255]);
      fillRect(ox + 18, oy + 12, 1, 1, [44, 38, 35, 255]);
    }
  }

  fillRect(ox + 10, oy + 14, 12, 8, shirt);

  if (facing === 'up') {
    fillRect(ox + 9, oy + 15, 2, 6, bag);
    fillRect(ox + 21, oy + 15, 2, 6, bag);
  } else {
    fillRect(ox + 9, oy + 15, 2, 6, [44, 69, 103, 255]);
    fillRect(ox + 21, oy + 15, 2, 6, [44, 69, 103, 255]);
  }

  const step = walkOffset;
  fillRect(ox + 12, oy + 22 + (step > 0 ? 1 : 0), 3, 6 - (step > 0 ? 1 : 0), pants);
  fillRect(ox + 17, oy + 22 + (step < 0 ? 1 : 0), 3, 6 - (step < 0 ? 1 : 0), pants);

  fillRect(ox + 11, oy + 28, 4, 1, shoe);
  fillRect(ox + 17, oy + 28, 4, 1, shoe);

  if (facing === 'left' || facing === 'right') {
    const bagX = facing === 'left' ? ox + 20 : ox + 8;
    fillRect(bagX, oy + 16, 3, 5, bag);
  }
}

const offsets = [0, -1, 1];
for (let i = 0; i < 3; i++) drawStudentFrame(i, 0, offsets[i], 'down');
for (let i = 0; i < 3; i++) drawStudentFrame(i, 1, offsets[i], 'right');
for (let i = 0; i < 3; i++) drawStudentFrame(i, 2, offsets[i], 'up');
for (let i = 0; i < 3; i++) drawStudentFrame(i, 3, offsets[i], 'left');

const outPath = 'public/assets/student_spritesheet.png';
png.pack().pipe(fs.createWriteStream(outPath)).on('finish', () => {
  console.log(`created ${outPath} (${width}x${height})`);
});

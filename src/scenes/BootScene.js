import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // --- Load Generated Assets ---
        this.load.spritesheet('player_spritesheet', 'assets/pokespritechar.png', { frameWidth: 64, frameHeight: 64 });
        this.load.image('floorMap', 'assets/Floor.png');
        this.load.image('collidingMap', 'assets/CollidingMap.png');
        this.load.json('mapCollisions', 'assets/collisions.json');

        // --- Load Door Spritesheets ---
        this.load.spritesheet('L1Door', 'assets/L1DoorSprite.png', { frameWidth: 97, frameHeight: 61.25 });
        this.load.spritesheet('L2Door', 'assets/L2DoorSprite.png', { frameWidth: 97, frameHeight: 61.25 });
        this.load.spritesheet('L3Door', 'assets/L3DoorSprite.png', { frameWidth: 97, frameHeight: 61.25 });

        // --- Load Flipper UI Assets ---
        this.load.image('FlipperUI', 'assets/FlipperUI.png');
        this.load.image('FlipperUp', 'assets/FlipperUp.png');
        this.load.image('FlipperDown', 'assets/FlipperDown.png');
        this.load.image('FlipperLeft', 'assets/FlipperLeft.png');
        this.load.image('FlipperRight', 'assets/FlipperRight.png');
        this.load.image('FlipperSelect', 'assets/FlipperSelect.png');
        this.load.image('FlipperBack', 'assets/FlipperBack.png');

        // --- Load App Icons for Flipper Menu ---
        this.load.image('sub_ghz', 'assets/sub_ghz.png');
        this.load.image('125khz_rfid', 'assets/125khz_rfid.png');
        this.load.image('bad_kb', 'assets/bad_kb.png');
        this.load.image('nfc', 'assets/nfc.png');

        // --- Load Physical Items ---
        this.load.image('L2Card', 'assets/L2Card.png');

        // --- Generate remaining textures procedurally ---
        const gfx = this.add.graphics();

        // Wall texture
        gfx.clear();
        gfx.fillStyle(0x1a1a2e, 1);
        gfx.fillRect(0, 0, 32, 32);
        gfx.lineStyle(2, 0x0f0f1a, 1);
        gfx.strokeRect(0, 0, 32, 32);
        gfx.generateTexture('wall', 32, 32);

        // Terminal icon texture used for RFID readers on the map
        gfx.clear();
        gfx.fillStyle(0x1d2f36, 1);
        gfx.fillRoundedRect(0, 0, 36, 48, 6);
        gfx.lineStyle(2, 0x5edbe8, 1);
        gfx.strokeRoundedRect(1, 1, 34, 46, 6);
        gfx.fillStyle(0x66f08f, 1);
        gfx.fillRoundedRect(7, 8, 22, 20, 4);
        gfx.fillStyle(0x0c1418, 1);
        gfx.fillRect(9, 32, 18, 4);
        gfx.generateTexture('terminal', 36, 48);

        // Door texture (ornate dark metal)
        gfx.clear();
        gfx.fillStyle(0x2d1b33, 1);
        gfx.fillRect(0, 0, 32, 32);
        gfx.lineStyle(2, 0x4a2c53, 1);
        gfx.strokeRect(2, 2, 28, 28);
        gfx.generateTexture('door', 32, 32);

        // Desk/furniture (dark wood/stone)
        gfx.clear();
        gfx.fillStyle(0x1e1e1e, 1);
        gfx.fillRect(0, 0, 48, 24);
        gfx.lineStyle(1, 0x333333, 0.5);
        gfx.strokeRect(0, 0, 48, 24);
        gfx.generateTexture('desk', 48, 24);

        // Particle / glow dot (white/blue)
        gfx.clear();
        gfx.fillStyle(0xddeeaa, 1);
        gfx.fillCircle(4, 4, 4);
        gfx.generateTexture('particle', 8, 8);

        gfx.destroy();

        // --- Generate procedural audio ---
        this.generateAudio();
    }

    generateAudio() {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();

        // Scan beep (short high-frequency)
        this.cache.audio.add('beep', this.createToneBuffer(ctx, 880, 0.1, 'sine'));
        // Error buzz (low distorted)
        this.cache.audio.add('buzz', this.createToneBuffer(ctx, 150, 0.2, 'sawtooth'));
        // Unlock chime (pleasant ascending)
        this.cache.audio.add('unlock', this.createChimeBuffer(ctx));
        // Lockdown alarm
        this.cache.audio.add('alarm', this.createToneBuffer(ctx, 200, 0.5, 'square'));

        ctx.close();
    }

    createToneBuffer(ctx, freq, duration, type) {
        const sampleRate = ctx.sampleRate;
        const length = sampleRate * duration;
        const buffer = ctx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;
            const envelope = Math.max(0, 1 - (t / duration));
            let sample = 0;
            if (type === 'sine') sample = Math.sin(2 * Math.PI * freq * t);
            else if (type === 'sawtooth') sample = 2 * ((freq * t) % 1) - 1;
            else if (type === 'square') sample = Math.sin(2 * Math.PI * freq * t) > 0 ? 1 : -1;
            data[i] = sample * envelope * 0.3;
        }
        return buffer;
    }

    createChimeBuffer(ctx) {
        const sampleRate = ctx.sampleRate;
        const duration = 0.4;
        const length = sampleRate * duration;
        const buffer = ctx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;
            const envelope = Math.max(0, 1 - (t / duration));
            const freq = 600 + (t / duration) * 600; // ascending
            data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.25;
        }
        return buffer;
    }

    create() {
        const w = this.scale.width;
        const h = this.scale.height;

        const bg = this.add.graphics();
        bg.fillGradientStyle(0x0f1d22, 0x0f1d22, 0x314f54, 0x314f54, 1);
        bg.fillRect(0, 0, w, h);

        const stripes = this.add.graphics();
        stripes.fillStyle(0x9fb184, 0.1);
        for (let i = 0; i < 14; i++) {
            stripes.fillRect(-40 + i * 80, 0, 28, h);
        }

        const frame = this.add.rectangle(w / 2, h / 2, 640, 420, 0x000000, 0.15)
            .setStrokeStyle(3, 0xe7c07c, 0.85)
            .setAlpha(0);

        const title = this.add.text(w / 2, h / 2 - 78, 'RFID BREACH', {
            fontFamily: '"Courier New", monospace',
            fontSize: '64px',
            fill: '#f0d59c',
            fontStyle: 'bold',
            stroke: '#5f3e27',
            strokeThickness: 8
        }).setOrigin(0.5).setAlpha(0).setScale(0.9);

        const subText = this.add.text(w / 2, h / 2 - 6, 'FLIPPER PROTOCOL', {
            fontFamily: '"Courier New", monospace',
            fontSize: '28px',
            fill: '#9dd4d0',
            fontStyle: 'bold',
            letterSpacing: 2
        }).setOrigin(0.5).setAlpha(0);

        const loadingText = this.add.text(w / 2, h / 2 + 72, 'CALIBRATING SCANNERS ...', {
            fontFamily: '"Courier New", monospace',
            fontSize: '18px',
            fill: '#d6eadf'
        }).setOrigin(0.5).setAlpha(0);

        this.tweens.add({
            targets: frame,
            alpha: 1,
            duration: 450,
            ease: 'Sine.easeOut'
        });

        this.tweens.add({
            targets: title,
            alpha: 1,
            scale: 1,
            duration: 700,
            ease: 'Back.easeOut'
        });

        this.tweens.add({
            targets: subText,
            alpha: 1,
            duration: 500,
            delay: 300,
            ease: 'Power2.out'
        });

        this.tweens.add({
            targets: loadingText,
            alpha: { from: 0, to: 0.95 },
            duration: 400,
            delay: 620,
            ease: 'Power2',
            yoyo: true,
            repeat: 2,
            onComplete: () => {
                this.time.delayedCall(450, () => {
                    // Fade out all boot elements, then start GameScene
                    this.tweens.add({
                        targets: [frame, title, subText, loadingText, stripes],
                        alpha: 0,
                        duration: 400,
                        ease: 'Power2',
                        onComplete: () => {
                            this.scene.start('GameScene');
                        }
                    });
                });
            }
        });
    }
}

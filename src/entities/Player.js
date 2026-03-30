import Phaser from 'phaser';

export class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'player_spritesheet', 0);

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(1.5);
        this.setCollideWorldBounds(true);
        this.setSize(16, 20); // slightly larger hitbox for larger scale
        this.setOffset(8, 8);
        this.setDepth(10);

        this.speed = 180;
        this.drag = 1000;
        this.setDrag(this.drag);
        this.lastFacing = 'down';
        
        this.keys = scene.input.keyboard.addKeys('W,A,S,D');

        // Animation setup
        this.createAnimations(scene);

        // Particle emitter for movement (ghostly HK trail)
        this.particles = scene.add.particles(0, 0, 'particle', {
            speed: { min: 10, max: 50 },
            scale: { start: 0.4, end: 0 },
            alpha: { start: 0.3, end: 0 },
            lifespan: 400,
            blendMode: 'ADD',
            emitting: false
        });
        this.particles.setDepth(9);

        // Track current zone
        this.currentZone = 'classroom';
        this.zonesVisited = new Set(['classroom']);

        // Interaction circle (HK style)
        this.interactionCircle = scene.add.circle(x, y, 60, 0x00aaff, 0.05).setStrokeStyle(1, 0x00aaff, 0.1);
        this.interactionCircle.setDepth(5);
    }

    createAnimations(scene) {
        if (!scene.anims.exists('walk_down')) {
            scene.anims.create({ key: 'walk_down', frames: scene.anims.generateFrameNumbers('player_spritesheet', { start: 0, end: 2 }), frameRate: 9, repeat: -1 });
            scene.anims.create({ key: 'walk_side', frames: scene.anims.generateFrameNumbers('player_spritesheet', { start: 3, end: 5 }), frameRate: 9, repeat: -1 });
            scene.anims.create({ key: 'walk_up', frames: scene.anims.generateFrameNumbers('player_spritesheet', { start: 6, end: 8 }), frameRate: 9, repeat: -1 });
        }
    }

    update() {
        let vx = 0;
        let vy = 0;
        let moving = false;

        if (this.keys.A.isDown) { vx = -1; this.setFlipX(false); moving = true; }
        else if (this.keys.D.isDown) { vx = 1; this.setFlipX(true); moving = true; }

        if (this.keys.W.isDown) { vy = -1; moving = true; }
        else if (this.keys.S.isDown) { vy = 1; moving = true; }

        if (moving) {
            if (vx !== 0 && vy !== 0) {
                const norm = Math.SQRT1_2;
                vx *= norm;
                vy *= norm;
            }
            this.setVelocity(vx * this.speed, vy * this.speed);
            
            // Particles
            this.particles.emitParticleAt(this.x, this.y + 10);

            // Animation logic
            if (vx !== 0) {
                this.lastFacing = 'side';
                this.play('walk_side', true);
            } else if (vy > 0) {
                this.lastFacing = 'down';
                this.play('walk_down', true);
            } else if (vy < 0) {
                this.lastFacing = 'up';
                this.play('walk_up', true);
            }
        } else {
            this.stop();
            if (this.lastFacing === 'side') this.setFrame(3);
            else if (this.lastFacing === 'up') this.setFrame(6);
            else this.setFrame(0);
        }

        this.interactionCircle.setPosition(this.x, this.y);
    }

    setCurrentZone(zone) {
        if (zone !== this.currentZone) {
            this.currentZone = zone;
            this.zonesVisited.add(zone);
            this.scene.events.emit('player-zone-changed', zone);
        }
    }

    destroy(fromScene) {
        if (this.interactionCircle) this.interactionCircle.destroy();
        super.destroy(fromScene);
    }
}

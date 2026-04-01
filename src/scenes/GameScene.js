import Phaser from 'phaser';
import { Player } from '../entities/Player.js';
import { rfidSystem } from '../systems/RFIDSystem.js';
import { TerminalUI } from '../ui/TerminalUI.js';

export class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    create() {
        rfidSystem.reset();

        const floorTexture = this.textures.get('floorMap').getSourceImage();
        this.worldW = floorTexture.width * 0.25;
        this.worldH = floorTexture.height * 0.25;

        this.physics.world.setBounds(0, 0, this.worldW, this.worldH);
        this.add.image(0, 0, 'floorMap').setOrigin(0, 0).setDepth(0).setScale(0.25);

        this.walls = this.physics.add.staticGroup();
        this.scanners = [];
        this.signalSources = [];
        this.fragments = [];
        this.zones = [];
        this.computers = [];
        this.doors = [];

        this.buildCollisionBodies();
        this.buildDoors();
        this.buildZones();
        this.buildSources();
        this.buildServerEntryBarrier();
        this.buildComputers();

        // Spawn in middle of the map
        this.player = new Player(this, this.worldW / 2, this.worldH / 2);
        this.physics.add.collider(this.player, this.walls);

        this.add.image(0, 0, 'collidingMap').setOrigin(0, 0).setDepth(15).setScale(0.25);

        this.cameras.main.setBounds(0, 0, this.worldW, this.worldH);
        this.cameras.main.startFollow(this.player, true, 0.11, 0.11);
        this.cameras.main.setZoom(1);
        this.cameras.main.fadeIn(500, 0, 0, 0);

        this.scene.launch('UIScene');

        // Initialize terminal UI
        this.terminalUI = new TerminalUI(this);
        this.playerMovementEnabled = true;

        // Handle terminal open/close events
        this.events.on('terminal-opened', () => {
            this.playerMovementEnabled = false;
            this.player.body.setVelocity(0, 0);
        });

        this.events.on('terminal-closed', () => {
            this.playerMovementEnabled = true;
        });

        this.setupInput();

        this.time.addEvent({
            delay: 180,
            callback: this.updateZoneState,
            callbackScope: this,
            loop: true
        });

        this.events.emit('narrator-message', 'Find your way through the school. L1 access opens only L1 rooms.');
    }

    setupInput() {
        this.input.keyboard.on('keydown-E', () => {
            this.handleInteract();
        });

        this.input.keyboard.on('keydown-ESC', () => {
            if (this.terminalUI && this.terminalUI.isOpen()) {
                this.terminalUI.close();
            }
        });
    }

    buildCollisionBodies() {
        // Create collision bodies from non-transparent pixels in CollidingMap.png
        const collidingTexture = this.textures.get('collidingMap');
        const sourceImage = collidingTexture.getSourceImage();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = sourceImage.width;
        canvas.height = sourceImage.height;
        ctx.drawImage(sourceImage, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;

        // Scale factor to match the displayed image
        const scale = 0.25;

        // Grid size for collision detection (larger = better performance, less precise)
        const gridSize = 4; // Check every 4 pixels

        // Track which pixels we've already processed
        const processed = new Set();

        // Scan the image and create collision rectangles for non-transparent regions
        for (let y = 0; y < canvas.height; y += gridSize) {
            for (let x = 0; x < canvas.width; x += gridSize) {
                const key = `${x},${y}`;
                if (processed.has(key)) continue;

                const idx = (y * canvas.width + x) * 4;
                const alpha = pixels[idx + 3];

                // If pixel is not transparent (alpha > 10 to account for anti-aliasing)
                if (alpha > 10) {
                    // Find the width of this solid region
                    let width = gridSize;
                    while (x + width < canvas.width) {
                        const checkIdx = (y * canvas.width + (x + width)) * 4;
                        if (pixels[checkIdx + 3] <= 10) break;
                        width += gridSize;
                    }

                    // Find the height of this solid region
                    let height = gridSize;
                    let canExtendHeight = true;
                    while (canExtendHeight && y + height < canvas.height) {
                        // Check if the entire row is solid
                        for (let checkX = x; checkX < x + width; checkX += gridSize) {
                            const checkIdx = ((y + height) * canvas.width + checkX) * 4;
                            if (pixels[checkIdx + 3] <= 10) {
                                canExtendHeight = false;
                                break;
                            }
                        }
                        if (canExtendHeight) height += gridSize;
                    }

                    // Mark this region as processed
                    for (let py = y; py < y + height; py += gridSize) {
                        for (let px = x; px < x + width; px += gridSize) {
                            processed.add(`${px},${py}`);
                        }
                    }

                    // Create collision body (apply scale to position and size)
                    const scaledX = x * scale;
                    const scaledY = y * scale;
                    const scaledWidth = width * scale;
                    const scaledHeight = height * scale;

                    const wall = this.add.rectangle(
                        scaledX + scaledWidth / 2,
                        scaledY + scaledHeight / 2,
                        scaledWidth,
                        scaledHeight,
                        0x000000,
                        0 // Invisible
                    );
                    this.physics.add.existing(wall, true);
                    this.walls.add(wall);
                }
            }
        }

        console.log(`Created ${this.walls.getChildren().length} collision bodies from CollidingMap.png`);
    }

    buildDoors() {
        // ===== DOOR CONFIGURATION =====
        // Adjust position (x, y), rotation, and scale for each door
        // rotation: 0 = vertical, 90 = horizontal
        // scale: adjust visual size (default: 0.6)
        const doorDefs = [
            // L1 Doors - Classroom entrances (top-left area)
            {
                type: 'L1Door',
                x: 175,
                y: 325,
                rotation: 0,
                scale: 1,
                clearance: 1,
                id: 'classroom_door_1'
            },
            {
                type: 'L1Door',
                x: 380,
                y: 190,
                rotation: -90,
                scale: 0.65,
                clearance: 1,
                id: 'classroom_door_2'
            },

            // L2 Door - Server room entrance
            {
                type: 'L2Door',
                x: 420,
                y: 870,
                rotation: -90,
                scale: 0.75,
                clearance: 2,
                id: 'server_room_door'
            },

            // L3 Door - Director room (bottom-right)
            {
                type: 'L3Door',
                x: 870,
                y: 610,
                rotation: 0,
                scale: 0.7,
                clearance: 3,
                id: 'director_room_door'
            }
        ];
        // ==============================

        // Create door animations
        if (!this.anims.exists('L1Door_open')) {
            this.anims.create({ key: 'L1Door_open', frames: this.anims.generateFrameNumbers('L1Door', { start: 0, end: 3 }), frameRate: 8, repeat: 0 });
            this.anims.create({ key: 'L2Door_open', frames: this.anims.generateFrameNumbers('L2Door', { start: 0, end: 3 }), frameRate: 8, repeat: 0 });
            this.anims.create({ key: 'L3Door_open', frames: this.anims.generateFrameNumbers('L3Door', { start: 0, end: 3 }), frameRate: 8, repeat: 0 });
        }

        doorDefs.forEach((def) => {
            const door = this.add.sprite(def.x, def.y, def.type, 0)
                .setOrigin(0.5, 0.5)
                .setAngle(def.rotation)
                .setDepth(16)
                .setScale(def.scale);

            // Create collision body for locked door
            const collisionBody = this.add.rectangle(def.x, def.y, 60, 20, 0x000000, 0)
                .setAngle(def.rotation);
            this.physics.add.existing(collisionBody, true);
            this.walls.add(collisionBody);

            // Store door data
            this.doors.push({
                id: def.id,
                sprite: door,
                collision: collisionBody,
                clearance: def.clearance,
                x: def.x,
                y: def.y,
                radius: 80,
                locked: true,
                animating: false
            });
        });

        console.log(`Created ${this.doors.length} doors`);
    }

    buildZones() {
        this.zones = [
            { id: 'Classroom', rect: new Phaser.Geom.Rectangle(20, 20, 960, 190) },
            { id: 'Hub', rect: new Phaser.Geom.Rectangle(210, 220, 620, 280) },
            { id: 'Office', rect: new Phaser.Geom.Rectangle(560, 520, 360, 240) },
            // Actual server room footprint (left-bottom lab), not the whole lower map.
            { id: 'Server Room', rect: new Phaser.Geom.Rectangle(0, 520, 340, 390) },
            { id: 'Staff Corridor', rect: new Phaser.Geom.Rectangle(430, 470, 230, 380) }
        ];

        this.serverRoomRect = this.zones.find((zone) => zone.id === 'Server Room')?.rect || null;
    }

    buildServerEntryBarrier() {
        // Seal all practical entry paths into the server room until L2 auth succeeds.
        const barrierDefs = [
            { x: 352, y: 736, w: 120, h: 170 },
            { x: 240, y: 590, w: 270, h: 48 },
            { x: 120, y: 740, w: 48, h: 280 }
        ];

        this.serverEntryBarriers = barrierDefs.map(({ x, y, w, h }) => {
            const blocker = this.add.rectangle(x, y, w, h, 0x000000, 0);
            this.physics.add.existing(blocker, true);
            this.walls.add(blocker);
            return blocker;
        });

        this.lastEmulationState = false; // Track emulation state changes
    }

    buildComputers() {
        // Server room bounds: Rectangle(0, 520, 340, 390)
        // 6 computers positioned exactly where they appear visually in the server room
        // TOP ROW (2): left and right desks at the top
        // MID ROW (2): left and center cabinets in the middle
        // BOTTOM ROW (2): left and right stations at the bottom
        const computerDefs = [
            { id: 1, x: 225, y: 920, label: 'SERVER-01' },     // TOP LEFT
            { id: 2, x: 155, y: 920, label: 'SERVER-02' },    // TOP RIGHT
            { id: 3, x: 290, y: 730, label: 'SERVER-03' },    // MID LEFT (This one has the real L3 UID)
            { id: 4, x: 350, y: 730, label: 'SERVER-04' },    // MID RIGHT
            { id: 5, x: 85, y: 850, label: 'SERVER-05' },     // BOTTOM LEFT
            { id: 6, x: 85, y: 800, label: 'SERVER-06' }     // BOTTOM RIGHT
        ];

        const computerStyle = {
            fontFamily: 'monospace',
            fontSize: '10px',
            fill: '#00ff88'
        };

        const promptStyle = {
            fontFamily: 'monospace',
            fontSize: '11px',
            fill: '#c6ffe6',
            backgroundColor: '#021a10'
        };

        computerDefs.forEach((def) => {
            // Computer visual (small rectangle representing a terminal) - invisible
            const visual = this.add.rectangle(def.x, def.y, 28, 24, 0x1a3a2a, 0)
                .setDepth(17)
                .setStrokeStyle(1, 0x00ff88, 0);

            // Computer label
            const label = this.add.text(def.x, def.y - 22, def.label, computerStyle)
                .setOrigin(0.5)
                .setDepth(18);

            const prompt = this.add.text(def.x, def.y - 44, 'Press E to access terminal', promptStyle)
                .setOrigin(0.5)
                .setDepth(19)
                .setPadding(5, 2, 5, 2)
                .setVisible(false);

            // Add to computers array
            this.computers.push({
                id: def.id,
                x: def.x,
                y: def.y,
                radius: 80,
                visual,
                label,
                prompt
            });
        });
    }

    buildSources() {
        const sourceStyle = {
            fontFamily: 'monospace',
            fontSize: '10px',
            fill: '#9ed0db'
        };

        const officeBadge = this.add.rectangle(697, 554, 22, 12, 0x487ebf, 0.95).setDepth(17);
        const officeBadgeLabel = this.add.text(697, 536, 'STAFF DESK L2 CARD', sourceStyle).setOrigin(0.5).setDepth(18);
        this.signalSources.push({
            kind: 'source',
            sourceId: 'OFFICE_L2_BADGE',
            x: 697,
            y: 554,
            radius: 220,  // Increased from 56 to 220 for better detection range
            visual: officeBadge,
            label: officeBadgeLabel,
            prompt: null
        });

        this.createFragment('sticky_note', 860, 340, 'STICKY UID FRAGMENT');
        this.createFragment('terminal_dump', 856, 336, 'LAB TERMINAL DUMP');
        this.createFragment('lab_log', 560, 690, 'LAB LOG FRAGMENT');
    }

    createFragment(fragmentId, x, y, title) {
        const node = this.add.rectangle(x, y, 20, 20, 0xe3c089, 0.95).setDepth(17);
        const label = this.add.text(x, y - 20, title, {
            fontFamily: 'monospace',
            fontSize: '10px',
            fill: '#f0d6aa'
        }).setOrigin(0.5).setDepth(18);
        this.fragments.push({
            kind: 'fragment',
            fragmentId,
            x,
            y,
            radius: 120,  // Increased from 58 to 120 for better detection range
            visual: node,
            label,
            prompt: null
        });
    }

    isNearScanner(scannerId) {
        const scanner = this.scanners.find((entry) => entry.scannerId === scannerId);
        if (!scanner) {
            return false;
        }
        return Phaser.Math.Distance.Between(this.player.x, this.player.y, scanner.x, scanner.y) <= scanner.radius;
    }

    getNearestScanner() {
        let nearest = null;
        let distance = Number.POSITIVE_INFINITY;

        this.scanners.forEach((scanner) => {
            const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, scanner.x, scanner.y);
            if (d <= scanner.radius && d < distance) {
                distance = d;
                nearest = scanner;
            }
        });

        return nearest;
    }

    getNearestSignalObject() {
        const allTargets = [...this.signalSources, ...this.fragments];
        let nearest = null;
        let distance = Number.POSITIVE_INFINITY;

        allTargets.forEach((target) => {
            const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, target.x, target.y);
            if (d <= target.radius && d < distance) {
                distance = d;
                nearest = target;
            }
        });

        return nearest;
    }

    getNearestComputer() {
        let nearest = null;
        let distance = Number.POSITIVE_INFINITY;

        this.computers.forEach((computer) => {
            const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, computer.x, computer.y);
            if (d <= computer.radius && d < distance) {
                distance = d;
                nearest = computer;
            }
        });

        return nearest;
    }

    getScanTarget() {
        const scanner = this.getNearestScanner();
        if (scanner) {
            return { kind: 'scanner', scannerId: scanner.scannerId };
        }

        const source = this.getNearestSignalObject();
        if (source) {
            if (source.kind === 'source') {
                return { kind: 'source', sourceId: source.sourceId };
            }
            return { kind: 'fragment', fragmentId: source.fragmentId };
        }

        return null;
    }

    handleInteract() {
        if (this.terminalUI && this.terminalUI.isOpen()) {
            return;
        }

        const computer = this.getNearestComputer();
        if (computer) {
            this.terminalUI.open(computer.id);
            return;
        }

        const scanner = this.getNearestScanner();
        if (scanner) {
            const result = rfidSystem.attemptAccess(scanner.scannerId);

            // L2 DOOR READER - Just show status (door access is automatic based on emulation)
            if (scanner.scannerId === 'LAB_L2_READER') {
                if (result.granted && result.reason === 'SERVER_L2_AUTH') {
                    this.events.emit('narrator-message', 'L2 AUTHENTICATION SUCCESSFUL. Server room access is automatically granted while emulating this card.');
                } else if (!result.granted && result.reason === 'SERVER_READER_REQUIRES_EMULATED_L2') {
                    this.events.emit('narrator-message', 'L2 READER: Emulate UID_TECH_22B to gain automatic access to the server room.');
                }
            }

            if (!result.granted) {
                this.cameras.main.shake(150, 0.0017);
            }
            return;
        }

        const target = this.getNearestSignalObject();
        if (target) {
            if (target.kind === 'source') {
                this.events.emit('narrator-message', 'Open Flipper with F and run RFID -> Scan to copy this card.');
                return;
            }

            const result = rfidSystem.scanTarget(target);
            if (result.ok && target.kind === 'fragment') {
                const fragment = this.fragments.find((entry) => entry.fragmentId === target.fragmentId);
                if (fragment && fragment.visual) {
                    fragment.visual.setFillStyle(0x7ea66a, 0.9);
                }
            }
            return;
        }
    }

    updateZoneState() {
        const currentZone = this.zones.find((zone) => zone.rect.contains(this.player.x, this.player.y));
        if (currentZone && currentZone.id !== this.currentZoneId) {
            this.currentZoneId = currentZone.id;
            this.events.emit('zone-updated', currentZone.id);
            this.player.setCurrentZone(currentZone.id.toLowerCase());
        }
    }

    updatePrompts() {
        if (!this.computers || this.computers.length === 0) {
            return;
        }

        this.computers.forEach((computer) => {
            if (computer.prompt) {
                computer.prompt.setVisible(false);
            }
        });

        if (this.terminalUI && this.terminalUI.isOpen()) {
            return;
        }

        const nearest = this.getNearestComputer();
        if (nearest && nearest.prompt) {
            nearest.prompt.setVisible(true);
        }
    }

    enforceServerRoomLock() {
        const active = rfidSystem.getActiveSignal();
        const isEmulatingL2 = active && active.uid === 'UID_TECH_22B' && active.clearance >= 2;

        // If emulating L2 card, allow access
        if (!this.serverRoomRect || isEmulatingL2) {
            return;
        }

        if (!this.serverRoomRect.contains(this.player.x, this.player.y)) {
            return;
        }

        // Hard fail-safe: if player clips in without L2 emulation, snap them outside the room boundary.
        const pushX = this.serverRoomRect.right + 26;
        const pushY = Phaser.Math.Clamp(this.player.y, this.serverRoomRect.top + 26, this.serverRoomRect.bottom - 26);
        this.player.setPosition(pushX, pushY);
        this.player.body.setVelocity(0, 0);

        const now = this.time.now;
        if (!this.nextServerDenyMessageAt || now >= this.nextServerDenyMessageAt) {
            this.events.emit('narrator-message', 'SERVER ROOM LOCKED. EMULATE L2 CARD (UID_TECH_22B) TO ACCESS.');
            this.nextServerDenyMessageAt = now + 900;
        }
    }

    update() {
        if (this.playerMovementEnabled) {
            this.player.update();
        } else {
            this.player.setVelocity(0, 0);
            this.player.stop();
        }

        this.updateServerRoomAccess(); // Check L2 emulation and manage barriers
        this.enforceServerRoomLock(); // Failsafe: push player out if they clip in without access
        this.updatePrompts();
        this.updateDoors();
    }

    updateServerRoomAccess() {
        const active = rfidSystem.getActiveSignal();
        const isEmulatingL2 = active && active.uid === 'UID_TECH_22B' && active.clearance >= 2;

        // Only update if state changed (to avoid spam)
        if (isEmulatingL2 !== this.lastEmulationState) {
            this.lastEmulationState = isEmulatingL2;

            if (isEmulatingL2) {
                // GRANT ACCESS: Remove barriers
                if (this.serverEntryBarriers && this.serverEntryBarriers.length > 0) {
                    console.log('[Server Room] L2 emulation detected - UNLOCKING');
                    this.serverEntryBarriers.forEach((barrier) => {
                        this.walls.remove(barrier);
                        barrier.body.enable = false; // Disable collision
                    });
                    this.events.emit('narrator-message', 'L2 CARD EMULATION ACTIVE - SERVER ROOM UNLOCKED');
                }
            } else {
                // DENY ACCESS: Restore barriers
                if (this.serverEntryBarriers && this.serverEntryBarriers.length > 0) {
                    console.log('[Server Room] L2 emulation stopped - LOCKING');
                    this.serverEntryBarriers.forEach((barrier) => {
                        this.walls.add(barrier);
                        barrier.body.enable = true; // Enable collision
                    });
                    this.events.emit('narrator-message', 'L2 EMULATION STOPPED - SERVER ROOM LOCKED');
                }
            }
        }
    }

    updateDoors() {
        if (!this.doors || this.doors.length === 0) return;

        const active = rfidSystem.getActiveSignal();

        this.doors.forEach((door) => {
            const playerDistance = Phaser.Math.Distance.Between(this.player.x, this.player.y, door.x, door.y);
            const isPlayerNear = playerDistance <= door.radius;

            // Check if appropriate card is emulating
            const hasAccess = active && active.clearance >= door.clearance;

            // Door should unlock if player is near AND has correct clearance
            if (isPlayerNear && hasAccess && door.locked) {
                // Unlock and animate door
                door.locked = false;
                door.animating = true;

                const animKey = door.sprite.texture.key + '_open';
                door.sprite.play(animKey);

                // Remove collision when door opens
                this.walls.remove(door.collision);
                if (door.collision.body) {
                    door.collision.body.enable = false;
                }

                console.log(`[Door] ${door.id} unlocked with L${door.clearance} access`);

                // Set animating to false when animation completes
                door.sprite.once('animationcomplete', () => {
                    door.animating = false;
                    door.sprite.setFrame(3); // Freeze on last frame
                });
            }

            // Re-lock door if player moves away or loses clearance
            if ((!isPlayerNear || !hasAccess) && !door.locked && !door.animating) {
                door.locked = true;
                door.sprite.setFrame(0); // Reset to locked frame

                // Re-enable collision
                this.walls.add(door.collision);
                if (door.collision.body) {
                    door.collision.body.enable = true;
                }

                console.log(`[Door] ${door.id} locked`);
            }
        });
    }

    // Note: Server room barriers are now managed dynamically in updateServerRoomAccess()
    // based on L2 card emulation state. No manual unlock needed.
}

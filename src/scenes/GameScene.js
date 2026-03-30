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

        this.buildCollisionBodies();
        this.buildZones();
        this.buildScanners();
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
        const collisions = this.cache.json.get('mapCollisions') || [];
        collisions.forEach(({ x, y, w, h }) => {
            const wall = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x000000, 0);
            this.physics.add.existing(wall, true);
            this.walls.add(wall);
        });
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

    buildScanners() {
        const scannerDefs = [
            { scannerId: 'HUB_L1_READER', label: 'HUB L1 READER', x: 504, y: 300, required: 1 },
            { scannerId: 'LAB_L2_READER', label: 'SERVER L2 READER', x: 372, y: 736, required: 2 },
            { scannerId: 'STAFF_CORRIDOR_L3_READER', label: 'STAFF CORRIDOR L3', x: 760, y: 760, required: 3 }
        ];

        scannerDefs.forEach((entry) => {
            const sprite = this.add.image(entry.x, entry.y, 'terminal').setDepth(17);
            const pulse = this.add.circle(entry.x, entry.y, 28, 0x79d5de, 0.12).setDepth(16);
            this.tweens.add({
                targets: pulse,
                alpha: { from: 0.08, to: 0.22 },
                scaleX: { from: 1, to: 1.45 },
                scaleY: { from: 1, to: 1.45 },
                duration: 1700,
                repeat: -1,
                yoyo: true,
                ease: 'Sine.easeInOut'
            });

            const label = this.add.text(entry.x, entry.y - 42, entry.label, {
                fontFamily: 'monospace',
                fontSize: '10px',
                fill: '#9ad7e0'
            }).setOrigin(0.5).setDepth(18);

            this.scanners.push({
                ...entry,
                sprite,
                label,
                pulse,
                radius: 100  // Increased from 68 to 100 for better interaction range
            });
        });
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
        // Place 6 computers distributed across the server room
        const computerDefs = [
            { id: 1, x: 80, y: 600, label: 'SERVER-01' },
            { id: 2, x: 240, y: 600, label: 'SERVER-02' },
            { id: 3, x: 80, y: 720, label: 'SERVER-03' },   // This one has the real L3 UID
            { id: 4, x: 240, y: 720, label: 'SERVER-04' },
            { id: 5, x: 80, y: 840, label: 'SERVER-05' },
            { id: 6, x: 240, y: 840, label: 'SERVER-06' }
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
            // Computer visual (small rectangle representing a terminal)
            const visual = this.add.rectangle(def.x, def.y, 28, 24, 0x1a3a2a, 0.95)
                .setDepth(17)
                .setStrokeStyle(1, 0x00ff88, 0.7);

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

    // Note: Server room barriers are now managed dynamically in updateServerRoomAccess()
    // based on L2 card emulation state. No manual unlock needed.
}

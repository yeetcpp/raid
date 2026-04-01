import Phaser from 'phaser';
import { FlipperUI } from '../ui/FlipperUI.js';
import { rfidSystem } from '../systems/RFIDSystem.js';

export class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene', active: false });
    }

    create() {
        this.flipperOpen = false;
        this.inventoryOpen = false;
        this.gameOver = false;

        const hudTop = this.add.rectangle(480, 30, 960, 51, 0x0f151b, 0.8)
            .setOrigin(0.5)
            .setStrokeStyle(1, 0x476472, 0.8);

        this.zoneText = this.add.text(18, 10, 'ZONE: CLASSROOM', {
            fontFamily: 'monospace',
            fontSize: '12px',
            fill: '#c5e6dd'
        });

        this.activeText = this.add.text(260, 10, 'ACTIVE UID: UID_STU_10A', {
            fontFamily: 'monospace',
            fontSize: '12px',
            fill: '#b9d9e2'
        });

        this.heatLabel = this.add.text(560, 10, 'HEAT', {
            fontFamily: 'monospace',
            fontSize: '12px',
            fill: '#dfb788'
        });

        this.heatBarBg = this.add.rectangle(610, 23, 170, 8, 0x20252b, 1).setOrigin(0, 0);
        this.heatBarFill = this.add.rectangle(610, 23, 0, 8, 0x87c77d, 1).setOrigin(0, 0);

        this.narratorBg = this.add.rectangle(480, 680, 920, 120, 0x111923, 0.88)
            .setOrigin(0.5)
            .setStrokeStyle(2, 0x6daab6, 0.9)
            .setAlpha(0); // Initially hidden

        this.narratorText = this.add.text(30, 650, '', {
            fontFamily: 'monospace',
            fontSize: '14px',
            fill: '#d5ebe8',
            wordWrap: { width: 920 }
        }).setAlpha(0); // Initially hidden

        this.controlHintsText = this.add.text(480, 700, '[WASD] MOVE  [E] INTERACT  [F] FLIPPER  [I] INVENTORY', {
            fontFamily: 'monospace',
            fontSize: '11px',
            fill: '#6a8792'
        }).setOrigin(0.5).setAlpha(0); // Initially hidden

        // Create a simple black dimming overlay (lower depth than flipper)
        this.flipperDimOverlay = this.add.rectangle(480, 360, 960, 720, 0x000000, 0)
            .setDepth(25)
            .setScrollFactor(0)
            .setOrigin(0.5, 0.5)
            .setVisible(false);

        this.flipper = new FlipperUI(this, 480, 420);
        this.flipper.setScale(1);
        this.flipper.setDepth(60);
        this.flipper.setVisible(false);
        this.flipper.setAlpha(0);
        this.flipper.setY(420 + 100); // Start position below

        this.inventoryBackdrop = this.add.rectangle(480, 360, 960, 720, 0x06080b, 0.72)
            .setDepth(168)
            .setVisible(false);

        this.inventory = this.add.container(480, 360);
        this.buildInventory();
        this.inventory.setVisible(false);
        this.inventory.setDepth(170);

        const gameScene = this.scene.get('GameScene');
        gameScene.events.on('zone-updated', (zoneId) => {
            this.zoneText.setText(`ZONE: ${zoneId.toUpperCase()}`);
        });
        gameScene.events.on('narrator-message', this.playNarratorLine, this);

        this.events.on('close-flipper', () => {
            if (this.flipperOpen) {
                this.toggleFlipper();
            }
        });

        this.input.keyboard.on('keydown-F', () => {
            // Don't toggle flipper if in text input mode (F should be typeable)
            if (this.flipper.textInputMode && this.flipper.appSubScreen === 'add_id') {
                return;
            }
            this.toggleFlipper();
        });

        this.input.keyboard.on('keydown-I', () => {
            this.toggleInventory();
        });

        rfidSystem.on('heat-changed', this.renderHeat, this);
        rfidSystem.on('active-signal-changed', this.renderActiveSignal, this);
        rfidSystem.on('signals-updated', () => this.renderInventory(), this);

        rfidSystem.on('game-win', (reason) => this.showGameEnd(true, reason));
        rfidSystem.on('game-lose', () => this.showGameEnd(false));

        this.renderHeat(rfidSystem.heat, rfidSystem.maxHeat);
        this.renderActiveSignal(rfidSystem.getActiveSignal());

        this.time.delayedCall(500, () => {
            this.playNarratorLine('Hey there. Welcome to the school, You can use WASD to move. Feel free to explore the map. The keybind to open your backpack/inventory is I');
        });
    }

    buildInventory() {
        const bg = this.add.rectangle(0, 0, 620, 420, 0x10161e, 0.98)
            .setStrokeStyle(3, 0x75b8bf, 0.95);

        const header = this.add.rectangle(0, -176, 620, 46, 0x1b2b38, 1)
            .setStrokeStyle(1, 0x55798a, 0.8);

        const title = this.add.text(0, -176, 'BACKPACK // SIGNAL STORAGE', {
            fontFamily: 'monospace',
            fontSize: '20px',
            fill: '#d7ede8',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.inventoryText = this.add.text(-286, -126, '', {
            fontFamily: 'monospace',
            fontSize: '14px',
            fill: '#aad8e0',
            lineSpacing: 6,
            wordWrap: { width: 350 }
        });

        // Embedded stylized Flipper in backpack UI
        const deviceBody = this.add.rectangle(170, 22, 220, 300, 0x222c34, 1)
            .setStrokeStyle(3, 0x0a0f14, 1);
        const deviceScreen = this.add.rectangle(170, -68, 160, 120, 0xefd48b, 1)
            .setStrokeStyle(2, 0x7c5e1e, 1);
        this.inventoryFlipperScreen = this.add.text(100, -108, 'FLIPPER\nACTIVE UID\nL1 STUDENT', {
            fontFamily: 'monospace',
            fontSize: '13px',
            fill: '#2f2f2f',
            align: 'left'
        });

        const dpad = this.add.circle(170, 68, 24, 0x111820, 1).setStrokeStyle(2, 0x3d4f5c, 1);
        const ok = this.add.circle(210, 68, 12, 0x1b2731, 1).setStrokeStyle(1, 0x536a79, 1);
        const footerPanel = this.add.rectangle(170, 128, 170, 70, 0x1a232c, 1)
            .setStrokeStyle(1, 0x3f5564, 0.9);
        this.inventoryDeviceInfo = this.add.text(95, 108, 'NO SIGNAL SELECTED', {
            fontFamily: 'monospace',
            fontSize: '11px',
            fill: '#9bc6cd'
        });

        const footer = this.add.text(0, 152, '[I] CLOSE', {
            fontFamily: 'monospace',
            fontSize: '13px',
            fill: '#8eb0b9'
        }).setOrigin(0.5);

        this.inventory.add([
            bg,
            header,
            title,
            this.inventoryText,
            deviceBody,
            deviceScreen,
            this.inventoryFlipperScreen,
            dpad,
            ok,
            footerPanel,
            this.inventoryDeviceInfo,
            footer
        ]);
    }

    toggleFlipper() {
        if (this.gameOver) {
            return;
        }

        const gameScene = this.scene.get('GameScene');
        if (gameScene && gameScene.terminalUI && gameScene.terminalUI.isOpen()) {
            return;
        }

        this.flipperOpen = !this.flipperOpen;

        if (this.flipperOpen) {
            if (this.inventoryOpen) {
                this.toggleInventory();
            }

            // Initialize the flipper menu content first
            this.flipper.open();

            // Show and animate in
            this.flipper.setVisible(true);
            this.flipperDimOverlay.setVisible(true);

            // Animate dim overlay fade in
            this.tweens.add({
                targets: this.flipperDimOverlay,
                alpha: { from: 0, to: 0.4 },
                duration: 300,
                ease: 'Power2.out'
            });

            // Animate Flipper slide up and fade in
            this.tweens.add({
                targets: this.flipper,
                y: 420,
                alpha: 1,
                duration: 350,
                ease: 'Back.easeOut'
            });

        } else {
            // Animate dim overlay fade out
            this.tweens.add({
                targets: this.flipperDimOverlay,
                alpha: { from: 0.4, to: 0 },
                duration: 250,
                ease: 'Power2.in',
                onComplete: () => {
                    this.flipperDimOverlay.setVisible(false);
                }
            });

            // Animate Flipper slide down and fade out
            this.tweens.add({
                targets: this.flipper,
                y: 420 + 100,
                alpha: 0,
                duration: 300,
                ease: 'Back.easeIn',
                onComplete: () => {
                    this.flipper.close();
                    this.flipper.setVisible(false);
                }
            });
        }
    }

    toggleInventory() {
        if (this.gameOver) {
            return;
        }

        const gameScene = this.scene.get('GameScene');
        if (gameScene && gameScene.terminalUI && gameScene.terminalUI.isOpen()) {
            return;
        }

        this.inventoryOpen = !this.inventoryOpen;

        if (this.inventoryOpen) {
            if (this.flipperOpen) {
                this.toggleFlipper();
            }
            this.renderInventory();
            this.inventoryBackdrop.setVisible(true);
            this.inventory.setVisible(true);
            this.scene.pause('GameScene');
        } else {
            this.inventoryBackdrop.setVisible(false);
            this.inventory.setVisible(false);
            this.scene.resume('GameScene');
        }
    }

    renderInventory() {
        const saved = rfidSystem.getSavedSignals();
        const active = rfidSystem.getActiveSignal();
        const lines = [];

        if (saved.length === 0) {
            lines.push('No captured signals.');
        } else {
            saved.forEach((signal, index) => {
                const marker = active && active.uid === signal.uid ? '*' : ' ';
                lines.push(`${marker} ${index + 1}. ${signal.uid}`);
                lines.push(`   Source: ${signal.source}`);
                lines.push(`   Clearance: L${signal.clearance} (${signal.color})`);
                lines.push('');
            });
        }

        this.inventoryText.setText(lines.join('\n'));

        if (active) {
            this.inventoryFlipperScreen.setText(`FLIPPER\nUID ${active.uid}\nCLR L${active.clearance}`);
            this.inventoryDeviceInfo.setText(`SRC: ${active.source}\nCOLOR: ${active.color}`);
        } else {
            this.inventoryFlipperScreen.setText('FLIPPER\nNO ACTIVE\nSIGNAL');
            this.inventoryDeviceInfo.setText('SOURCE: UNKNOWN');
        }
    }

    playNarratorLine(line) {
        // Stop any existing fade-out tweens
        this.tweens.killTweensOf([this.narratorBg, this.narratorText, this.controlHintsText]);

        // Set the message
        this.narratorText.setText(line);

        // Smooth slide + fade IN transition
        this.tweens.add({
            targets: this.narratorBg,
            alpha: 0.88,
            y: 680,
            duration: 300,
            ease: 'Power2.out'
        });

        this.tweens.add({
            targets: this.narratorText,
            alpha: 1,
            y: 650,
            duration: 300,
            ease: 'Power2.out'
        });

        this.tweens.add({
            targets: this.controlHintsText,
            alpha: 0.85,
            duration: 300,
            ease: 'Power2.out'
        });

        // Auto-hide after 6.4 seconds with smooth slide + fade OUT transition
        this.time.delayedCall(6400, () => {
            this.tweens.add({
                targets: this.narratorBg,
                alpha: 0,
                y: 740, // Slide down slightly
                duration: 350,
                ease: 'Power2.in'
            });

            this.tweens.add({
                targets: this.narratorText,
                alpha: 0,
                y: 710, // Slide down slightly
                duration: 350,
                ease: 'Power2.in'
            });

            this.tweens.add({
                targets: this.controlHintsText,
                alpha: 0,
                duration: 350,
                ease: 'Power2.in'
            });
        });
    }

    renderHeat(heat, maxHeat) {
        const ratio = Math.max(0, Math.min(1, heat / maxHeat));
        const width = 170 * ratio;
        this.heatBarFill.width = width;

        if (ratio < 0.4) {
            this.heatBarFill.setFillStyle(0x7bc472, 1);
        } else if (ratio < 0.75) {
            this.heatBarFill.setFillStyle(0xd8b05f, 1);
        } else {
            this.heatBarFill.setFillStyle(0xd15d52, 1);
        }
    }

    renderActiveSignal(signal) {
        if (!signal) {
            this.activeText.setText('ACTIVE UID: NONE');
            return;
        }
        this.activeText.setText(`ACTIVE UID: ${signal.uid} (L${signal.clearance})`);
    }

    showGameEnd(isWin, reason = '') {
        this.gameOver = true;
        this.flipper.close();
        this.inventory.setVisible(false);
        this.scene.pause('GameScene');

        const overlay = this.add.rectangle(480, 360, 960, 720, 0x000000, 0.88).setDepth(250);

        const title = this.add.text(480, 240, isWin ? 'SERVER ACCESS UNLOCKED' : 'LOCKDOWN', {
            fontFamily: 'monospace',
            fontSize: '46px',
            fill: isWin ? '#8ad989' : '#ef7e74',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(251);

        const subtitle = this.add.text(480, 340, isWin ? `Method: ${reason}` : 'Heat reached maximum. All scanners disabled.', {
            fontFamily: 'monospace',
            fontSize: '18px',
            fill: isWin ? '#bde8bc' : '#e8afa9',
            align: 'center'
        }).setOrigin(0.5).setDepth(251);

        const prompt = this.add.text(480, 500, '[R] RESTART', {
            fontFamily: 'monospace',
            fontSize: '18px',
            fill: '#c7dce1'
        }).setOrigin(0.5).setDepth(251);

        this.tweens.add({
            targets: [title, subtitle, prompt],
            alpha: { from: 0, to: 1 },
            duration: 420,
            ease: 'Power2.out'
        });

        this.input.keyboard.once('keydown-R', () => {
            this.scene.stop('UIScene');
            this.scene.stop('GameScene');
            this.scene.start('GameScene');
        });
    }
}

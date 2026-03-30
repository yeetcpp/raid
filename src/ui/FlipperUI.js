import Phaser from 'phaser';
import { rfidSystem } from '../systems/RFIDSystem.js';

export class FlipperUI extends Phaser.GameObjects.Container {
    constructor(scene, x, y) {
        super(scene, x, y);
        scene.add.existing(this);

        // Menu structure: main apps are switchable with left/right
        this.mainApps = ['Sub-Ghz', '125kHz RFID', 'Bad KB', 'NFC'];
        // Grid layout: [0, 1]
        //             [2, 3]
        this.selectedMainApp = 1; // Start on 125kHz RFID (top-right)
        this.currentScreen = 'main'; // 'main' or 'app'
        this.appSubScreen = 'main'; // For sub-menus within apps
        this.selectedIndex = 0;
        this.statusText = '';
        this.busy = false;
        this.bruteforceActive = false;

        // ============================================================
        // EASY EDIT SECTION - Adjust positions and sizes here
        // ============================================================
        
        // Orange Screen Configuration
        const ORANGE_SCREEN = {
            x: -115,           // Horizontal position
            y: -25,         // Vertical position
            width: 552,     // Width of orange display area
            height: 283,    // Height of orange display area
            color: 0xd4872d, // Orange color
            radius: 8      // Corner radius
        };

        // Content Text Configuration (menu items)
        const CONTENT_TEXT = {
            x: -350,        // Horizontal position
            y: -140,        // Vertical position
            fontSize: '26px',
            width: 280      // Text wrap width
        };

        // Status Text Configuration (bottom info)
        const STATUS_TEXT = {
            x: -150,        // Horizontal position
            y: 50,          // Vertical position
            fontSize: '26px',
            width: 280      // Text wrap width
        };

        // Brute Force Progress Bar Configuration
        const BRUTE_BAR = {
            x: 0,           // Horizontal position
            y: 20,          // Vertical position
            width: 280,     // Bar width
            height: 14      // Bar height
        };

        // Control Overlay Positions (arrows and select button)
        const CONTROL_OVERLAYS = {
            up: { x: 281.5, y: -110 },      // Up arrow position
            down: { x: 281.5, y: 10 },    // Down arrow position
            left: { x: 222, y: -50 },    // Left arrow position
            right: { x: 340, y: -50 },   // Right arrow position
            select: { x: 281.5, y: -50 }  // Select button position
        };

        // ============================================================
        // END EASY EDIT SECTION
        // ============================================================

        // Main Flipper UI background image
        const flipperBg = scene.add.image(0, 0, 'FlipperUI').setOrigin(0.5, 0.5);

        // Orange screen for content display
        const orangeScreen = scene.add.graphics();
        orangeScreen.fillStyle(ORANGE_SCREEN.color, 1);
        orangeScreen.fillRoundedRect(
            ORANGE_SCREEN.x - ORANGE_SCREEN.width / 2,
            ORANGE_SCREEN.y - ORANGE_SCREEN.height / 2,
            ORANGE_SCREEN.width,
            ORANGE_SCREEN.height,
            ORANGE_SCREEN.radius
        );
        orangeScreen.setDepth(1);

        // Content text on orange screen
        this.content = scene.add.text(CONTENT_TEXT.x, CONTENT_TEXT.y, '', {
            fontFamily: 'monospace',
            fontSize: CONTENT_TEXT.fontSize,
            fill: '#1a1a1a',
            lineSpacing: 8,
            wordWrap: { width: CONTENT_TEXT.width }
        });

        // Status text
        this.status = scene.add.text(STATUS_TEXT.x, STATUS_TEXT.y, '', {
            fontFamily: 'monospace',
            fontSize: STATUS_TEXT.fontSize,
            fill: '#2d2d2d',
            wordWrap: { width: STATUS_TEXT.width }
        });

        // Brute force progress bar (for L2 card scan)
        this.bruteBarBg = scene.add.rectangle(
            BRUTE_BAR.x,
            BRUTE_BAR.y,
            BRUTE_BAR.width,
            BRUTE_BAR.height,
            0x6f5720,
            0.9
        ).setVisible(false);

        this.bruteBarFill = scene.add.rectangle(
            BRUTE_BAR.x - BRUTE_BAR.width / 2,
            BRUTE_BAR.y,
            0,
            BRUTE_BAR.height - 4,
            0x2c2c2c,
            0.95
        ).setOrigin(0, 0.5).setVisible(false);

        // Control highlight overlays - positioned from CONTROL_OVERLAYS config
        this.flipperUpOverlay = scene.add.image(
            CONTROL_OVERLAYS.up.x,
            CONTROL_OVERLAYS.up.y,
            'FlipperUp'
        ).setOrigin(0.5, 0.5).setVisible(false);

        this.flipperDownOverlay = scene.add.image(
            CONTROL_OVERLAYS.down.x,
            CONTROL_OVERLAYS.down.y,
            'FlipperDown'
        ).setOrigin(0.5, 0.5).setVisible(false);

        this.flipperLeftOverlay = scene.add.image(
            CONTROL_OVERLAYS.left.x,
            CONTROL_OVERLAYS.left.y,
            'FlipperLeft'
        ).setOrigin(0.5, 0.5).setVisible(false);

        this.flipperRightOverlay = scene.add.image(
            CONTROL_OVERLAYS.right.x,
            CONTROL_OVERLAYS.right.y,
            'FlipperRight'
        ).setOrigin(0.5, 0.5).setVisible(false);

        this.flipperSelectOverlay = scene.add.image(
            CONTROL_OVERLAYS.select.x,
            CONTROL_OVERLAYS.select.y,
            'FlipperSelect'
        ).setOrigin(0.5, 0.5).setVisible(false);

        this.add([
            flipperBg,
            orangeScreen,
            this.content,
            this.status,
            this.bruteBarBg,
            this.bruteBarFill,
            this.flipperUpOverlay,
            this.flipperDownOverlay,
            this.flipperLeftOverlay,
            this.flipperRightOverlay,
            this.flipperSelectOverlay
        ]);

        this.setVisible(false);
        this.setDepth(150);

        // Key press handlers with visual feedback
        scene.input.keyboard.on('keydown-W', () => {
            this.flipperUpOverlay.setVisible(true);
            this.handleInput('up');
        });
        scene.input.keyboard.on('keyup-W', () => this.flipperUpOverlay.setVisible(false));

        scene.input.keyboard.on('keydown-S', () => {
            this.flipperDownOverlay.setVisible(true);
            this.handleInput('down');
        });
        scene.input.keyboard.on('keyup-S', () => this.flipperDownOverlay.setVisible(false));

        scene.input.keyboard.on('keydown-UP', () => {
            this.flipperUpOverlay.setVisible(true);
            this.handleInput('up');
        });
        scene.input.keyboard.on('keyup-UP', () => this.flipperUpOverlay.setVisible(false));

        scene.input.keyboard.on('keydown-DOWN', () => {
            this.flipperDownOverlay.setVisible(true);
            this.handleInput('down');
        });
        scene.input.keyboard.on('keyup-DOWN', () => this.flipperDownOverlay.setVisible(false));

        scene.input.keyboard.on('keydown-LEFT', () => {
            this.flipperLeftOverlay.setVisible(true);
            this.handleInput('left');
        });
        scene.input.keyboard.on('keyup-LEFT', () => this.flipperLeftOverlay.setVisible(false));

        scene.input.keyboard.on('keydown-RIGHT', () => {
            this.flipperRightOverlay.setVisible(true);
            this.handleInput('right');
        });
        scene.input.keyboard.on('keyup-RIGHT', () => this.flipperRightOverlay.setVisible(false));

        scene.input.keyboard.on('keydown-ENTER', () => {
            this.flipperSelectOverlay.setVisible(true);
            this.handleInput('enter');
        });
        scene.input.keyboard.on('keyup-ENTER', () => this.flipperSelectOverlay.setVisible(false));

        scene.input.keyboard.on('keydown-Q', () => this.handleInput('back'));

        rfidSystem.on('signals-updated', () => {
            if (this.visible && this.currentScreen === 'app' && this.selectedMainApp === 1) {
                this.renderMenu();
            }
        });
    }

    open() {
        this.currentScreen = 'main';
        this.selectedMainApp = 1; // Start on 125kHz RFID
        this.selectedIndex = 0;
        this.statusText = '';
        this.busy = false;
        this.setVisible(true);
        this.renderMenu();
    }

    close() {
        this.setVisible(false);
        this.busy = false;
        this.bruteforceActive = false;
        this.bruteBarBg.setVisible(false);
        this.bruteBarFill.setVisible(false);
    }

    handleInput(action) {
        if (!this.visible || this.busy) {
            return;
        }

        // On main screen, left/right for horizontal navigation only
        if (this.currentScreen === 'main') {
            if (action === 'left') {
                this.selectedMainApp = (this.selectedMainApp - 1 + this.mainApps.length) % this.mainApps.length;
                this.renderMenu();
                return;
            }
            if (action === 'right') {
                this.selectedMainApp = (this.selectedMainApp + 1) % this.mainApps.length;
                this.renderMenu();
                return;
            }
            if (action === 'enter') {
                this.enterApp();
                return;
            }
            if (action === 'back') {
                this.scene.events.emit('close-flipper');
                return;
            }
            // Ignore up/down on main menu
            return;
        }

        // In app screen, handle based on which app
        if (this.currentScreen === 'app') {
            const appName = this.mainApps[this.selectedMainApp];

            if (appName === '125kHz RFID') {
                this.handleRFIDInput(action);
            } else {
                // Decoy apps only support back
                if (action === 'back') {
                    this.currentScreen = 'main';
                    this.selectedIndex = 0;
                    this.renderMenu();
                }
            }
        }
    }

    enterApp() {
        const appName = this.mainApps[this.selectedMainApp];

        if (appName === '125kHz RFID') {
            this.currentScreen = 'app';
            this.appSubScreen = 'main';
            this.selectedIndex = 0;
        } else {
            // Decoy apps show "Not Implemented"
            this.currentScreen = 'app';
            this.appSubScreen = 'decoy';
            this.selectedIndex = 0;
        }

        this.renderMenu();
    }

    handleRFIDInput(action) {
        const entries = this.getRFIDEntries();

        if (action === 'up') {
            this.selectedIndex = Math.max(0, this.selectedIndex - 1);
            this.renderMenu();
            return;
        }

        if (action === 'down') {
            this.selectedIndex = Math.min(Math.max(entries.length - 1, 0), this.selectedIndex + 1);
            this.renderMenu();
            return;
        }

        if (action === 'back') {
            if (this.appSubScreen === 'main') {
                this.currentScreen = 'main';
                this.selectedIndex = 0;
            } else {
                this.appSubScreen = 'main';
                this.selectedIndex = 0;
            }
            this.renderMenu();
            return;
        }

        if (action === 'enter' && entries.length > 0) {
            this.handleRFIDSelect(entries[this.selectedIndex]);
        }
    }

    getRFIDEntries() {
        if (this.appSubScreen === 'main') {
            return ['Scan', 'Saved', 'Emulate'];
        }
        if (this.appSubScreen === 'saved' || this.appSubScreen === 'emulate') {
            return rfidSystem.getSavedSignals().map((signal) => signal.uid);
        }
        return [];
    }

    handleRFIDSelect(choice) {
        const gameScene = this.scene.scene.get('GameScene');

        if (this.appSubScreen === 'main') {
            if (choice === 'Scan') {
                this.runScan(gameScene);
                return;
            }
            if (choice === 'Saved') {
                this.appSubScreen = 'saved';
                this.selectedIndex = 0;
            }
            if (choice === 'Emulate') {
                this.appSubScreen = 'emulate';
                this.selectedIndex = 0;
            }
            this.renderMenu();
            return;
        }

        if (this.appSubScreen === 'saved') {
            const signal = rfidSystem.getSavedSignals().find((entry) => entry.uid === choice);
            this.statusText = signal
                ? `UID: ${signal.uid} | CLR: L${signal.clearance}`
                : 'Unknown signal';
            this.renderMenu();
            return;
        }

        if (this.appSubScreen === 'emulate') {
            const ok = rfidSystem.setActiveSignal(choice);
            if (ok) {
                const signal = rfidSystem.getSavedSignals().find((s) => s.uid === choice);
                this.statusText = `EMULATING: ${choice}`;
                console.log(`Emulation active: ${choice}`);
            } else {
                this.statusText = 'Failed to activate signal';
            }
            this.renderMenu();
            return;
        }
    }

    runScan(gameScene) {
        const scanTarget = gameScene.getScanTarget();

        if (scanTarget && scanTarget.kind === 'source' && scanTarget.sourceId === 'OFFICE_L2_BADGE') {
            this.runSourceScanProgress(scanTarget);
            return;
        }

        this.busy = true;
        this.statusText = 'Scanning...';
        this.renderMenu();

        this.scene.time.delayedCall(900, () => {
            const result = rfidSystem.scanTarget(scanTarget);
            if (result.ok && result.signal) {
                this.statusText = `UID: ${result.signal.uid}`;
            } else if (result.ok) {
                this.statusText = 'Fragment captured';
            } else {
                this.statusText = result.message;
            }
            this.busy = false;
            this.renderMenu();
        });
    }

    runSourceScanProgress(scanTarget) {
        this.busy = true;
        this.statusText = 'Scanning L2 card...';
        this.bruteBarBg.setVisible(true);
        this.bruteBarFill.setVisible(true);
        this.bruteBarFill.width = 0;
        this.renderMenu();

        const total = 2200;
        const tick = 140;
        let elapsed = 0;

        const timer = this.scene.time.addEvent({
            delay: tick,
            repeat: Math.floor(total / tick),
            callback: () => {
                elapsed += tick;
                const progress = Math.min(1, elapsed / total);
                this.bruteBarFill.width = 286 * progress;

                if (progress >= 1) {
                    timer.remove(false);
                    const result = rfidSystem.scanTarget(scanTarget);
                    if (result.ok) {
                        this.statusText = 'L2 Card cloned!';
                        console.log('L2 Card (UID_TECH_22B) successfully scanned and stored');
                    } else {
                        this.statusText = result.message;
                    }
                    this.busy = false;
                    this.bruteBarBg.setVisible(false);
                    this.bruteBarFill.setVisible(false);
                    this.renderMenu();
                }
            }
        });
    }

    renderMenu() {
        let content = '';

        if (this.currentScreen === 'main') {
            // Render just the selected app name at top - horizontal linear layout
            const selectedAppName = this.mainApps[this.selectedMainApp];
            content = selectedAppName;

            this.status.setText('');
        } else if (this.currentScreen === 'app') {
            const appName = this.mainApps[this.selectedMainApp];

            if (appName === '125kHz RFID') {
                content = this.renderRFIDScreen();
            } else {
                // Decoy app screen
                content = `${appName}\n\n`;
                content += 'Not available';
            }

            this.status.setText(this.statusText || '');
        }

        this.content.setText(content);
    }

    renderRFIDScreen() {
        let content = '';
        const active = rfidSystem.getActiveSignal();

        if (this.appSubScreen === 'main') {
            const entries = this.getRFIDEntries();
            content = '125kHz RFID\n\n';
            content += entries
                .map((entry, index) => {
                    return index === this.selectedIndex ? `> ${entry}` : `  ${entry}`;
                })
                .join('\n');
        } else if (this.appSubScreen === 'saved') {
            const entries = this.getRFIDEntries();
            content = 'Saved\n\n';
            const savedSignals = rfidSystem.getSavedSignals();

            if (entries.length === 0) {
                content += '(No saved signals)';
            } else {
                content += entries
                    .map((uid, index) => {
                        const signal = savedSignals.find((entry) => entry.uid === uid);
                        const prefix = index === this.selectedIndex ? '>' : ' ';
                        const activeMarker = (active && active.uid === uid) ? ' [A]' : '';
                        return `${prefix} ${uid}${activeMarker}`;
                    })
                    .join('\n');
            }
        } else if (this.appSubScreen === 'emulate') {
            const entries = this.getRFIDEntries();
            content = 'Emulating\n\n';
            const savedSignals = rfidSystem.getSavedSignals();

            if (entries.length === 0) {
                content += '(No saved signals)';
            } else {
                content += entries
                    .map((uid, index) => {
                        const signal = savedSignals.find((entry) => entry.uid === uid);
                        const prefix = index === this.selectedIndex ? '>' : ' ';
                        const activeMarker = (active && active.uid === uid) ? ' [A]' : '';
                        return `${prefix} ${uid}${activeMarker}`;
                    })
                    .join('\n');
            }
        }

        return content;
    }
}

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
        
        // Store all configurations as instance properties for reuse throughout the class
        
        // Orange Screen Configuration
        this.ORANGE_SCREEN = {
            x: -115,           // Horizontal position
            y: -25,         // Vertical position
            width: 552,     // Width of orange display area
            height: 283,    // Height of orange display area
            color: 0xd4872d, // Orange color
            radius: 8      // Corner radius
        };

        // MAIN MENU TEXT CONFIGURATION - Edit text position and size
        this.MAIN_MENU_TEXT = {
            x: -115,        // Horizontal position (center of orange screen)
            y: -100,        // Vertical position (AT TOP edge of orange screen)
            fontSize: '32px',
            width: 400,
            align: 'center'
        };

        // MAIN MENU ICON CONFIGURATION - Edit icon position and size
        this.MAIN_MENU_ICON = {
            x: -115,        // Horizontal position (center)
            y: -10,         // Vertical position (AT BOTTOM of orange screen)
            scale: 0.22      // Icon size (0.2 = 20% of original)
        };

        // App Content Text Configuration (smaller, left-aligned, TOP of screen)
        this.APP_CONTENT_TEXT = {
            x: -330,        // Horizontal position (left side)
            y: -110,        // Vertical position (TOP area, very high)
            fontSize: '27px',
            width: 450,     // Text wrap width
            align: 'left'
        };

        // App Icons Configuration (main menu) - uses MAIN_MENU_ICON
        this.APP_ICONS = {
            'Sub-Ghz': { x: this.MAIN_MENU_ICON.x, y: this.MAIN_MENU_ICON.y },
            '125kHz RFID': { x: this.MAIN_MENU_ICON.x, y: this.MAIN_MENU_ICON.y },
            'Bad KB': { x: this.MAIN_MENU_ICON.x, y: this.MAIN_MENU_ICON.y },
            'NFC': { x: this.MAIN_MENU_ICON.x, y: this.MAIN_MENU_ICON.y }
        };

        // Status Text Configuration (bottom info)
        this.STATUS_TEXT = {
            x: -300,        // Horizontal position
            y: 70,          // Vertical position
            fontSize: '23px',
            width: 280      // Text wrap width
        };

        // Brute Force Progress Bar Configuration
        this.BRUTE_BAR = {
            x: -120,           // Horizontal position
            y: 50,          // Vertical position
            width: 350,     // Bar width
            height: 14      // Bar height
        };

        // Control Overlay Positions (arrows and select button)
        this.CONTROL_OVERLAYS = {
            up: { x: 281.5, y: -110 },      // Up arrow position
            down: { x: 281.5, y: 10 },    // Down arrow position
            left: { x: 222, y: -50 },    // Left arrow position
            right: { x: 340, y: -50 },   // Right arrow position
            select: { x: 281.5, y: -50 }  // Select button position
        };

        // START Text Configuration (bottom of orange screen)
        this.START_TEXT = {
            x: -115,        // Horizontal position (center)
            y: 80,          // Vertical position (bottom of orange screen)
            fontSize: '30px',
            align: 'center'
        };
        // App Content Border Configuration (outline box for app content)
        this.APP_BORDER = {
            x: -365,        // Horizontal position
            y: -150,        // Vertical position
            width: 500,     // Border width
            height: 250,    // Border height
            thickness: 4,   // Line thickness
            color: 0x1a1a1a // Border color
        };
        // ============================================================
        // END EASY EDIT SECTION
        // ============================================================

        // Main Flipper UI background image
        const flipperBg = scene.add.image(0, 0, 'FlipperUI').setOrigin(0.5, 0.5);

        // Orange screen for content display
        const orangeScreen = scene.add.graphics();
        orangeScreen.fillStyle(this.ORANGE_SCREEN.color, 1);
        orangeScreen.fillRoundedRect(
            this.ORANGE_SCREEN.x - this.ORANGE_SCREEN.width / 2,
            this.ORANGE_SCREEN.y - this.ORANGE_SCREEN.height / 2,
            this.ORANGE_SCREEN.width,
            this.ORANGE_SCREEN.height,
            this.ORANGE_SCREEN.radius
        );
        orangeScreen.setDepth(1);

        // Content text on orange screen - LEFT ARROW
        this.arrowLeft = scene.add.text(this.ORANGE_SCREEN.x - this.ORANGE_SCREEN.width / 2 + 30, this.ORANGE_SCREEN.y, '◄', {
            fontFamily: 'monospace',
            fontSize: '48px',
            fill: '#1a1a1a',
            align: 'center'
        }).setOrigin(0.5, 0.5);

        // Content text on orange screen - CENTER APP NAME
        this.content = scene.add.text(this.MAIN_MENU_TEXT.x, this.MAIN_MENU_TEXT.y, '', {
            fontFamily: 'monospace',
            fontSize: this.MAIN_MENU_TEXT.fontSize,
            fill: '#1a1a1a',
            align: 'center',
            lineSpacing: 8,
            wordWrap: { width: this.MAIN_MENU_TEXT.width }
        }).setOrigin(0.5, 0.5);

        // Content text on orange screen - RIGHT ARROW
        this.arrowRight = scene.add.text(this.ORANGE_SCREEN.x + this.ORANGE_SCREEN.width / 2 - 30, this.ORANGE_SCREEN.y, '►', {
            fontFamily: 'monospace',
            fontSize: '48px',
            fill: '#1a1a1a',
            align: 'center'
        }).setOrigin(0.5, 0.5);

        // Border graphics for app content area
        this.appContentBorder = scene.add.graphics();
        this.appContentBorder.setVisible(false);

        // App Icons - hidden by default, shown on main menu
        this.appIcons = {};
        Object.keys(this.APP_ICONS).forEach((appName) => {
            const iconKey = appName.toLowerCase().replace(/\s+|-/g, '_');
            const pos = this.APP_ICONS[appName];
            
            try {
                this.appIcons[appName] = scene.add.image(pos.x, pos.y, iconKey)
                    .setOrigin(0.5, 0.5)
                    .setScale(1)
                    .setVisible(false);
            } catch (e) {
                // Icon not available, create placeholder
                this.appIcons[appName] = scene.add.rectangle(pos.x, pos.y, 40, 40, 0x1a1a1a, 0.5)
                    .setOrigin(0.5, 0.5)
                    .setVisible(false);
            }
        });

        // Status text
        this.status = scene.add.text(this.STATUS_TEXT.x, this.STATUS_TEXT.y, '', {
            fontFamily: 'monospace',
            fontSize: this.STATUS_TEXT.fontSize,
            fill: '#2d2d2d',
            wordWrap: { width: this.STATUS_TEXT.width }
        });

        // START text on orange screen (bottom)
        this.startText = scene.add.text(this.START_TEXT.x, this.START_TEXT.y, 'START', {
            fontFamily: 'monospace',
            fontSize: this.START_TEXT.fontSize,
            fill: '#1a1a1a',
            align: this.START_TEXT.align
        }).setOrigin(0.5, 0.5).setVisible(false);

        // Brute force progress bar (for L2 card scan)
        this.bruteBarBg = scene.add.rectangle(
            this.BRUTE_BAR.x,
            this.BRUTE_BAR.y,
            this.BRUTE_BAR.width,
            this.BRUTE_BAR.height,
            0x6f5720,
            0.9
        ).setVisible(false);

        this.bruteBarFill = scene.add.rectangle(
            this.BRUTE_BAR.x - this.BRUTE_BAR.width / 2,
            this.BRUTE_BAR.y,
            0,
            this.BRUTE_BAR.height - 4,
            0x2c2c2c,
            0.95
        ).setOrigin(0, 0.5).setVisible(false);

        // Control highlight overlays - positioned from CONTROL_OVERLAYS config
        this.flipperUpOverlay = scene.add.image(
            this.CONTROL_OVERLAYS.up.x,
            this.CONTROL_OVERLAYS.up.y,
            'FlipperUp'
        ).setOrigin(0.5, 0.5).setVisible(false);

        this.flipperDownOverlay = scene.add.image(
            this.CONTROL_OVERLAYS.down.x,
            this.CONTROL_OVERLAYS.down.y,
            'FlipperDown'
        ).setOrigin(0.5, 0.5).setVisible(false);

        this.flipperLeftOverlay = scene.add.image(
            this.CONTROL_OVERLAYS.left.x,
            this.CONTROL_OVERLAYS.left.y,
            'FlipperLeft'
        ).setOrigin(0.5, 0.5).setVisible(false);

        this.flipperRightOverlay = scene.add.image(
            this.CONTROL_OVERLAYS.right.x,
            this.CONTROL_OVERLAYS.right.y,
            'FlipperRight'
        ).setOrigin(0.5, 0.5).setVisible(false);

        this.flipperSelectOverlay = scene.add.image(
            this.CONTROL_OVERLAYS.select.x,
            this.CONTROL_OVERLAYS.select.y,
            'FlipperSelect'
        ).setOrigin(0.5, 0.5).setVisible(false);

        this.add([
            flipperBg,
            orangeScreen,
            this.arrowLeft,
            this.content,
            this.arrowRight,
            this.appContentBorder,
            this.status,
            this.startText,
            this.bruteBarBg,
            this.bruteBarFill,
            this.flipperUpOverlay,
            this.flipperDownOverlay,
            this.flipperLeftOverlay,
            this.flipperRightOverlay,
            this.flipperSelectOverlay,
            ...Object.values(this.appIcons)
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
        this.arrowLeft.setVisible(true);
        this.arrowRight.setVisible(true);
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
                    this.arrowLeft.setVisible(true);
                    this.arrowRight.setVisible(true);
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

        this.arrowLeft.setVisible(false);
        this.arrowRight.setVisible(false);
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
                this.arrowLeft.setVisible(true);
                this.arrowRight.setVisible(true);
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
            // Render just the app name - arrows are separate and always visible
            const selectedAppName = this.mainApps[this.selectedMainApp];
            content = selectedAppName;

            // Apply main menu text styling
            this.content.setPosition(this.MAIN_MENU_TEXT.x, this.MAIN_MENU_TEXT.y);
            this.content.setFontSize(this.MAIN_MENU_TEXT.fontSize);
            this.content.setStyle({ align: this.MAIN_MENU_TEXT.align });
            this.content.setOrigin(0.5, 0.5);

            // Hide ALL icons first
            Object.keys(this.appIcons).forEach((appName) => {
                this.appIcons[appName].setVisible(false);
                this.appIcons[appName].setScale(this.MAIN_MENU_ICON.scale);
            });

            // Show ONLY the selected app's icon
            if (this.appIcons[selectedAppName]) {
                this.appIcons[selectedAppName].setVisible(true);
                this.appIcons[selectedAppName].setScale(this.MAIN_MENU_ICON.scale);
            }

            // Hide border
            this.appContentBorder.setVisible(false);
            this.status.setText('');
            this.startText.setVisible(true);
        } else if (this.currentScreen === 'app') {
            const appName = this.mainApps[this.selectedMainApp];

            if (appName === '125kHz RFID') {
                content = this.renderRFIDScreen();
            } else {
                // Decoy app screen
                content = `${appName}\n\n`;
                content += 'Not available';
            }

            // Apply app content text styling
            this.content.setPosition(this.APP_CONTENT_TEXT.x, this.APP_CONTENT_TEXT.y);
            this.content.setFontSize(this.APP_CONTENT_TEXT.fontSize);
            this.content.setStyle({ align: this.APP_CONTENT_TEXT.align });
            this.content.setOrigin(0, 0);

            // Hide all icons
            Object.keys(this.appIcons).forEach((appName) => {
                this.appIcons[appName].setVisible(false);
            });

            // Draw border around content
            this.drawAppContentBorder();

            this.status.setText(this.statusText || '');
            this.startText.setVisible(false);
        }

        this.content.setText(content);
    }

    drawAppContentBorder() {
        this.appContentBorder.clear();
        this.appContentBorder.lineStyle(this.APP_BORDER.thickness, this.APP_BORDER.color, 1);
        this.appContentBorder.strokeRect(
            this.APP_BORDER.x,
            this.APP_BORDER.y,
            this.APP_BORDER.width,
            this.APP_BORDER.height
        );
        this.appContentBorder.setVisible(true);
    }

    renderRFIDScreen() {
        let content = '';
        const active = rfidSystem.getActiveSignal();

        if (this.appSubScreen === 'main') {
            const entries = this.getRFIDEntries();
            content = entries
                .map((entry, index) => {
                    return index === this.selectedIndex ? `► ${entry}` : `  ${entry}`;
                })
                .join('\n');
        } else if (this.appSubScreen === 'saved') {
            const entries = this.getRFIDEntries();
            content = 'SAVED:\n\n';
            const savedSignals = rfidSystem.getSavedSignals();

            if (entries.length === 0) {
                content += '(None)';
            } else {
                content += entries
                    .map((uid, index) => {
                        const signal = savedSignals.find((entry) => entry.uid === uid);
                        const prefix = index === this.selectedIndex ? '►' : ' ';
                        const activeMarker = (active && active.uid === uid) ? ' ★' : '';
                        return `${prefix} ${uid}${activeMarker}`;
                    })
                    .join('\n');
            }
        } else if (this.appSubScreen === 'emulate') {
            const entries = this.getRFIDEntries();
            content = 'EMULATING:\n\n';
            const savedSignals = rfidSystem.getSavedSignals();

            if (entries.length === 0) {
                content += '(None)';
            } else {
                content += entries
                    .map((uid, index) => {
                        const signal = savedSignals.find((entry) => entry.uid === uid);
                        const prefix = index === this.selectedIndex ? '►' : ' ';
                        const activeMarker = (active && active.uid === uid) ? ' ★' : '';
                        return `${prefix} ${uid}${activeMarker}`;
                    })
                    .join('\n');
            }
        }

        return content;
    }
}

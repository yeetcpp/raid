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
        this.textInputBuffer = '';  // For Add ID text entry
        this.textInputMode = false; // Whether we're in text input mode
        this.scrollOffset = 0;  // For scrolling content vertically
        this.maxScrollOffset = 0;  // Maximum scroll offset based on content height

        // ============================================================
        // EASY EDIT SECTION - Adjust positions and sizes here
        // ============================================================
        
        // Scale factor for entire UI (0.4 = 40% size)
        const UI_SCALE = 0.35;

        // === FONT SIZE SETTINGS - Edit these numbers to change text size ===
        const MAIN_MENU_FONT_SIZE = 26;      // Main app name (125kHz RFID, etc)
        const APP_CONTENT_FONT_SIZE = 35;    // Inner app text (Scan, Saved, Emulate, etc) - SCROLLABLE
        const STATUS_TEXT_FONT_SIZE = 22;    // Bottom status info
        const START_TEXT_FONT_SIZE = 20;     // START button text
        const MASK_PADDING = 15 * UI_SCALE;   // Inner padding for mask/scroll area
        const SCROLLBAR_WIDTH = 8 * UI_SCALE; // Scrollbar thickness
        const SCROLLBAR_PADDING = 10 * UI_SCALE; // Scrollbar inset from edges
        
        // Store all configurations as instance properties for reuse throughout the class
        
        // Orange Screen Configuration
        this.ORANGE_SCREEN = {
            x: -100 * UI_SCALE,           // Horizontal position
            y: -110 * UI_SCALE,         // Vertical position
            width: 552 * UI_SCALE,     // Width of orange display area
            height: 310 * UI_SCALE,    // Height of orange display area
            color: 0xff9a24, // Orange color
            radius: 30 * UI_SCALE      // Corner radius
        };

        // MAIN MENU TEXT CONFIGURATION - Edit text position and size
        this.MAIN_MENU_TEXT = {
            x: -115 * UI_SCALE,        // Horizontal position (center of orange screen)
            y: -200 * UI_SCALE,        // Vertical position (AT TOP edge of orange screen)
            fontSize: Math.round(MAIN_MENU_FONT_SIZE * UI_SCALE) + 'px',
            width: 400 * UI_SCALE,
            align: 'center'
        };

        // MAIN MENU ICON CONFIGURATION - Edit icon position and size
        this.MAIN_MENU_ICON = {
            x: -115 * UI_SCALE,        // Horizontal position (center)
            y: -80 * UI_SCALE,         // Vertical position (AT BOTTOM of orange screen)
            scale: 0.3 * UI_SCALE      // Icon size (0.2 = 20% of original)
        };

        // App Content Text Configuration (smaller, left-aligned, TOP of screen)
        // === EDIT APP_CONTENT_FONT_SIZE ABOVE TO CHANGE INNER TEXT SIZE ===
        this.APP_CONTENT_TEXT = {
            x: this.ORANGE_SCREEN.x - this.ORANGE_SCREEN.width / 2 + MASK_PADDING, // Left padding
            y: this.ORANGE_SCREEN.y - this.ORANGE_SCREEN.height / 2 + MASK_PADDING, // Top padding
            fontSize: Math.round(APP_CONTENT_FONT_SIZE * UI_SCALE) + 'px',
            // Width: mask width minus space for scrollbar
            width: this.ORANGE_SCREEN.width - (MASK_PADDING * 2) - SCROLLBAR_WIDTH - 10,
            align: 'left'
        };

        // Mask and scrollbar configuration (editable)
        this.MASK = { padding: MASK_PADDING };
        this.SCROLLBAR = {
            width: SCROLLBAR_WIDTH,
            padding: SCROLLBAR_PADDING,
            trackColor: 0x000000,
            thumbColor: 0x1a1a1a
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
            x: -300 * UI_SCALE,        // Horizontal position
            y: -20 * UI_SCALE,          // Vertical position
            fontSize: Math.round(STATUS_TEXT_FONT_SIZE * UI_SCALE) + 'px',
            width: 280 * UI_SCALE      // Text wrap width
        };

        // Brute Force Progress Bar Configuration
        this.BRUTE_BAR = {
            x: -115 * UI_SCALE,           // Horizontal position
            y: 20 * UI_SCALE,          // Vertical position
            bgWidth: 280 * UI_SCALE,     // Background bar width
            bgHeight: 14 * UI_SCALE,     // Background bar height
            bgColor: 0x6f5720,           // Background color
            fillHeight: 10 * UI_SCALE,   // Fill bar height (inner padding)
            fillColor: 0x2c2c2c          // Fill color
        };

        // Control Overlay Positions (arrows and select button)
        this.CONTROL_OVERLAYS = {
            up: { x: 405 * UI_SCALE, y: -220 * UI_SCALE, scale: 0.7 },      // Up arrow position and size
            down: { x: 405 * UI_SCALE, y: 0 * UI_SCALE, scale: 0.7 },    // Down arrow position and size
            left: { x: 296 * UI_SCALE, y: -110 * UI_SCALE, scale: 0.7 },    // Left arrow position and size
            right: { x: 520 * UI_SCALE, y: -110 * UI_SCALE, scale: 0.7 },   // Right arrow position and size
            select: { x: 405 * UI_SCALE, y: -110 * UI_SCALE, scale: 0.7 }  // Select button position and size
        };

        // Back Button Configuration (editable)
        this.BACK_BUTTON = {
            x: 630 * UI_SCALE,        // Horizontal position (left side)
            y: 0 * UI_SCALE,          // Vertical position
            scale: 0.7             // Scale factor - edit this to resize (editable)
        };

        // START Text Configuration (bottom of orange screen)
        this.START_TEXT = {
            x: -115 * UI_SCALE,        // Horizontal position (center)
            y: 20 * UI_SCALE,          // Vertical position (bottom of orange screen)
            fontSize: Math.round(START_TEXT_FONT_SIZE * UI_SCALE) + 'px',
            align: 'center'
        };
        // App Content Border Configuration (outline box for app content)
        this.APP_BORDER = {
            x: -365 * UI_SCALE,        // Horizontal position
            y: -252 * UI_SCALE,        // Vertical position
            width: 527 * UI_SCALE,     // Border width
            height: 287 * UI_SCALE,    // Border height
            thickness: 6 * UI_SCALE,   // Line thickness
            color: 0x1a1a1a,           // Border color
            radius: 15 * UI_SCALE      // Corner radius
        };
        // ============================================================
        // END EASY EDIT SECTION
        // ============================================================

        // Main Flipper UI background image
        const flipperBg = scene.add.image(0, 0, 'FlipperUI').setOrigin(0.5, 0.5).setScale(UI_SCALE);

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
        // Add black border
        orangeScreen.lineStyle(4, 0x000000, 1);
        orangeScreen.strokeRoundedRect(
            this.ORANGE_SCREEN.x - this.ORANGE_SCREEN.width / 2,
            this.ORANGE_SCREEN.y - this.ORANGE_SCREEN.height / 2,
            this.ORANGE_SCREEN.width,
            this.ORANGE_SCREEN.height,
            this.ORANGE_SCREEN.radius
        );
        orangeScreen.setDepth(1);

        // Geometry mask to clip content to the orange screen bounds (not drawn)
        const maskGraphics = scene.make.graphics({ x: 0, y: 0, add: false });
        const maskX = this.x + this.ORANGE_SCREEN.x - this.ORANGE_SCREEN.width / 2 + this.MASK.padding;
        const maskY = this.y + this.ORANGE_SCREEN.y - this.ORANGE_SCREEN.height / 2 + this.MASK.padding;
        const maskW = this.ORANGE_SCREEN.width - this.MASK.padding * 2;
        const maskH = this.ORANGE_SCREEN.height - this.MASK.padding * 2;
        maskGraphics.fillStyle(0xffffff, 1);
        maskGraphics.fillRoundedRect(maskX, maskY, maskW, maskH, this.ORANGE_SCREEN.radius);
        this.contentMask = maskGraphics.createGeometryMask();

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
        this.content.setMask(this.contentMask);

        // Scrollbar graphics (pixelized) - shown only when content overflows
        this.scrollBar = scene.add.graphics().setVisible(false);

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
            this.BRUTE_BAR.bgWidth,
            this.BRUTE_BAR.bgHeight,
            this.BRUTE_BAR.bgColor,
            0.9
        ).setVisible(false);

        this.bruteBarFill = scene.add.rectangle(
            this.BRUTE_BAR.x - this.BRUTE_BAR.bgWidth / 2,
            this.BRUTE_BAR.y,
            0,
            this.BRUTE_BAR.fillHeight,
            this.BRUTE_BAR.fillColor,
            0.95
        ).setOrigin(0, 0.5).setVisible(false);

        // Control highlight overlays - positioned from CONTROL_OVERLAYS config
        this.flipperUpOverlay = scene.add.image(
            this.CONTROL_OVERLAYS.up.x,
            this.CONTROL_OVERLAYS.up.y,
            'FlipperUp'
        ).setOrigin(0.5, 0.5).setScale(this.CONTROL_OVERLAYS.up.scale).setVisible(false);

        this.flipperDownOverlay = scene.add.image(
            this.CONTROL_OVERLAYS.down.x,
            this.CONTROL_OVERLAYS.down.y,
            'FlipperDown'
        ).setOrigin(0.5, 0.5).setScale(this.CONTROL_OVERLAYS.down.scale).setVisible(false);

        this.flipperLeftOverlay = scene.add.image(
            this.CONTROL_OVERLAYS.left.x,
            this.CONTROL_OVERLAYS.left.y,
            'FlipperLeft'
        ).setOrigin(0.5, 0.5).setScale(this.CONTROL_OVERLAYS.left.scale).setVisible(false);

        this.flipperRightOverlay = scene.add.image(
            this.CONTROL_OVERLAYS.right.x,
            this.CONTROL_OVERLAYS.right.y,
            'FlipperRight'
        ).setOrigin(0.5, 0.5).setScale(this.CONTROL_OVERLAYS.right.scale).setVisible(false);

        this.flipperSelectOverlay = scene.add.image(
            this.CONTROL_OVERLAYS.select.x,
            this.CONTROL_OVERLAYS.select.y,
            'FlipperSelect'
        ).setOrigin(0.5, 0.5).setScale(this.CONTROL_OVERLAYS.select.scale).setVisible(false);

        this.flipperBackOverlay = scene.add.image(
            this.BACK_BUTTON.x,
            this.BACK_BUTTON.y,
            'FlipperBack'
        ).setOrigin(0.5, 0.5).setScale(this.BACK_BUTTON.scale).setVisible(false);

        this.add([
            flipperBg,
            orangeScreen,
            this.arrowLeft,
            this.content,
            this.arrowRight,
            this.appContentBorder,
            this.scrollBar,
            this.status,
            this.startText,
            this.bruteBarBg,
            this.bruteBarFill,
            this.flipperUpOverlay,
            this.flipperDownOverlay,
            this.flipperLeftOverlay,
            this.flipperRightOverlay,
            this.flipperSelectOverlay,
            this.flipperBackOverlay,
            ...Object.values(this.appIcons)
        ]);

        this.setVisible(false);
        this.setDepth(150);
        // All component scaling is handled via UI_SCALE factor applied to coordinates

        // Key press handlers with visual feedback (removed W/S - only arrow keys allowed)
        // scene.input.keyboard.on('keydown-W') - REMOVED: Only arrow keys for navigation
        // scene.input.keyboard.on('keydown-S') - REMOVED: Only arrow keys for navigation

        scene.input.keyboard.on('keydown-UP', () => {
            if (!this.visible) return; // Block input when FlipperUI is closed
            this.flipperUpOverlay.setVisible(true);
            this.handleInput('up');
        });
        scene.input.keyboard.on('keyup-UP', () => {
            if (!this.visible) return;
            this.flipperUpOverlay.setVisible(false);
        });

        scene.input.keyboard.on('keydown-DOWN', () => {
            if (!this.visible) return; // Block input when FlipperUI is closed
            this.flipperDownOverlay.setVisible(true);
            this.handleInput('down');
        });
        scene.input.keyboard.on('keyup-DOWN', () => {
            if (!this.visible) return;
            this.flipperDownOverlay.setVisible(false);
        });

        scene.input.keyboard.on('keydown-LEFT', () => {
            if (!this.visible) return; // Block input when FlipperUI is closed
            this.flipperLeftOverlay.setVisible(true);
            this.handleInput('left');
        });
        scene.input.keyboard.on('keyup-LEFT', () => {
            if (!this.visible) return;
            this.flipperLeftOverlay.setVisible(false);
        });

        scene.input.keyboard.on('keydown-RIGHT', () => {
            if (!this.visible) return; // Block input when FlipperUI is closed
            this.flipperRightOverlay.setVisible(true);
            this.handleInput('right');
        });
        scene.input.keyboard.on('keyup-RIGHT', () => {
            if (!this.visible) return;
            this.flipperRightOverlay.setVisible(false);
        });

        scene.input.keyboard.on('keydown-ENTER', () => {
            if (!this.visible) return; // Block input when FlipperUI is closed
            if (this.textInputMode && this.appSubScreen === 'add_id') {
                // In text input mode, Enter confirms the input
                this.handleRFIDInput('enter');
                return;
            }
            this.flipperSelectOverlay.setVisible(true);
            this.handleInput('enter');
        });
        scene.input.keyboard.on('keyup-ENTER', () => {
            if (!this.visible) return;
            this.flipperSelectOverlay.setVisible(false);
        });

        scene.input.keyboard.on('keydown-Q', () => {
            if (!this.visible) return; // Block input when FlipperUI is closed
            if (this.textInputMode && this.appSubScreen === 'add_id') {
                // In text input mode, Q and F are typeable; use Enter to exit
                return;
            }
            this.flipperBackOverlay.setVisible(true);
            this.handleInput('back');
        });
        scene.input.keyboard.on('keyup-Q', () => {
            if (!this.visible) return;
            this.flipperBackOverlay.setVisible(false);
        });

        scene.input.keyboard.on('keydown-BACKSPACE', () => {
            if (!this.visible) return; // Block input when FlipperUI is closed
            if (this.textInputMode && this.appSubScreen === 'add_id') {
                // In text input mode, backspace deletes characters (handled elsewhere)
                return;
            }
            this.flipperBackOverlay.setVisible(true);
            this.handleInput('back');
        });
        scene.input.keyboard.on('keyup-BACKSPACE', () => {
            if (!this.visible) return;
            this.flipperBackOverlay.setVisible(false);
        });

        // Character input for text entry (Add ID mode)
        scene.input.keyboard.on('keydown', (event) => {
            if (!this.visible) return; // Block input when FlipperUI is closed
            if (this.textInputMode && this.appSubScreen === 'add_id') {
                const key = event.key.toUpperCase();
                // Accept alphanumeric, underscore, hyphen, colon, F, and Q for UID formats
                if (/^[A-Z0-9_\-FQ:]$/.test(key)) {
                    if (this.textInputBuffer.length < 32) {
                        this.textInputBuffer += key;
                        this.renderMenu();
                    }
                } else if (key === 'BACKSPACE' || event.keyCode === 8) {
                    this.textInputBuffer = this.textInputBuffer.slice(0, -1);
                    this.renderMenu();
                }
            }
        });

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
        this.scrollOffset = 0;  // Reset scroll position
        this.arrowLeft.setVisible(true);
        this.arrowRight.setVisible(true);
        // Visibility is now handled by UIScene animations
        this.renderMenu();
        
        // Emit event to block player movement and other inputs
        this.scene.events.emit('flipper-opened');
    }

    close() {
        // Visibility is now handled by UIScene animations
        this.busy = false;
        this.bruteforceActive = false;
        this.bruteBarBg.setVisible(false);
        this.bruteBarFill.setVisible(false);
        this.flipperBackOverlay.setVisible(false);
        this.textInputMode = false;
        this.textInputBuffer = '';
        this.scrollOffset = 0;
        
        // Emit event to restore player movement and other inputs
        this.scene.events.emit('flipper-closed');
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
        // Handle text input mode for Add ID
        if (this.textInputMode && this.appSubScreen === 'add_id') {
            if (action === 'back') {
                this.textInputMode = false;
                this.textInputBuffer = '';
                this.appSubScreen = 'emulate';
                this.selectedIndex = 0;
                this.scrollOffset = 0;
                this.renderMenu();
                return;
            }
            // Enter/confirm to save and emulate
            if (action === 'enter' && this.textInputBuffer.length > 0) {
                const newUID = this.textInputBuffer.toUpperCase();
                
                // Create a signal object for the custom UID
                const customSignal = {
                    uid: newUID,
                    clearance: 3,  // Default to highest clearance for custom entries
                    source: 'MANUAL_ENTRY',
                    label: 'Manual UID',
                    color: 'Yellow'
                };
                
                // Add the signal to the system (but don't auto-emulate)
                const addedOk = rfidSystem.addSignal(customSignal);

                if (addedOk) {
                    this.statusText = `SAVED: ${newUID} (L3) - Go to Emulate menu`;
                    this.textInputMode = false;
                    this.appSubScreen = 'main'; // Return to main menu instead of emulate
                    this.selectedIndex = 0;
                    this.scrollOffset = 0;
                    console.log(`Custom ID saved: ${newUID} - Manual emulation required`);
                } else {
                    this.statusText = `ERROR: Failed to add ${newUID}`;
                }
                this.textInputBuffer = '';
                this.renderMenu();
                return;
            }
            return;
        }

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
            this.scrollOffset = 0;
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
        if (this.appSubScreen === 'saved') {
            return rfidSystem.getSavedSignals().map((signal) => signal.uid);
        }
        if (this.appSubScreen === 'emulate') {
            const saved = rfidSystem.getSavedSignals().map((signal) => signal.uid);
            return [...saved, 'Add ID'];
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
                this.scrollOffset = 0;
            }
            if (choice === 'Emulate') {
                this.appSubScreen = 'emulate';
                this.selectedIndex = 0;
                this.scrollOffset = 0;
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
            if (choice === 'Add ID') {
                this.appSubScreen = 'add_id';
                this.textInputBuffer = '';
                this.textInputMode = true;
                this.scrollOffset = 0;
                this.renderMenu();
                return;
            }

            const ok = rfidSystem.setActiveSignal(choice);
            if (ok) {
                const signal = rfidSystem.getSavedSignals().find((s) => s.uid === choice);
                this.statusText = signal
                    ? `ACTIVE: ${choice} (L${signal.clearance})`
                    : `ACTIVE: ${choice}`;
                console.log(`Emulation active: ${choice}`);
            } else {
                this.statusText = 'ERROR: Failed to activate';
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
                this.statusText = `SAVED: ${result.signal.uid} (L${result.signal.clearance})`;
            } else if (result.ok) {
                this.statusText = 'FRAGMENT SAVED';
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
                this.bruteBarFill.width = this.BRUTE_BAR.bgWidth * progress;

                if (progress >= 1) {
                    timer.remove(false);
                    const result = rfidSystem.scanTarget(scanTarget);
                    if (result.ok && result.signal) {
                        this.statusText = `CLONED: ${result.signal.uid} (L${result.signal.clearance})`;
                        console.log('L2 Card (UID_TECH_22B) successfully scanned and stored');
                    } else {
                        this.statusText = result.message || 'Scan failed';
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
            this.scrollOffset = 0;
        } else if (this.currentScreen === 'app') {
            const appName = this.mainApps[this.selectedMainApp];

            if (appName === '125kHz RFID') {
                content = this.renderRFIDScreen();
            } else {
                // Decoy app screen
                content = `${appName}\nNot available`;
            }

            // Apply app content text styling with scroll offset
            const displayY = this.APP_CONTENT_TEXT.y - this.scrollOffset;
            this.content.setPosition(this.APP_CONTENT_TEXT.x, displayY);
            this.content.setFontSize(this.APP_CONTENT_TEXT.fontSize);
            this.content.setStyle({ 
                align: this.APP_CONTENT_TEXT.align,
                lineSpacing: 4
            });
            this.content.setWordWrapWidth(this.APP_CONTENT_TEXT.width);
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
        
        // Calculate viewport boundaries (pixel-based)
        const maskTop = this.ORANGE_SCREEN.y - this.ORANGE_SCREEN.height / 2 + this.MASK.padding;
        const maskBottom = this.ORANGE_SCREEN.y + this.ORANGE_SCREEN.height / 2 - this.MASK.padding;
        const viewportHeight = maskBottom - maskTop;
        
        // Calculate scroll for app screen based on selection and content
        if (this.currentScreen === 'app') {
            const contentLines = content.split('\n').length;
            
            // Calculate ACTUAL line height from rendered content
            const actualLineHeight = contentLines > 1 ? this.content.height / contentLines : this.content.height;

            // Account for header line: selectedIndex refers to menu items, but text includes header
            const selectedLineInText = this.selectedIndex + 1;

            // Auto-scroll to keep selection visible (pixel-based)
            const selectedLineTopPixel = selectedLineInText * actualLineHeight;
            const selectedLineBottomPixel = (selectedLineInText + 1) * actualLineHeight;

            // If selected line top is above scroll position, scroll up
            if (selectedLineTopPixel < this.scrollOffset) {
                this.scrollOffset = Math.max(0, selectedLineTopPixel);
            }
            // If selected line bottom goes below visible area, scroll down
            if (selectedLineBottomPixel > this.scrollOffset + viewportHeight) {
                this.scrollOffset = selectedLineBottomPixel - viewportHeight;
            }
        }

        // STRICT bound checking - text must fit entirely within mask bounds
        // Small buffer to keep last item visible while preventing extreme overflow
        const maxScroll = Math.max(0, this.content.height - viewportHeight);
        this.scrollOffset = Phaser.Math.Clamp(this.scrollOffset, 0, maxScroll);
        this.maxScrollOffset = maxScroll;

        if (this.currentScreen === 'app') {
            // Simply apply scroll offset to Y position
            const displayY = this.APP_CONTENT_TEXT.y - this.scrollOffset;
            this.content.setY(displayY);
            
            // Crop to viewport to ensure no overflow
            this.content.setCrop(0, this.scrollOffset, this.APP_CONTENT_TEXT.width, viewportHeight);
        }

        // Update scrollbar (pixelized) when overflow exists
        this.scrollBar.clear();
        const hasOverflow = this.maxScrollOffset > 0;
        this.scrollBar.setVisible(hasOverflow);
        if (hasOverflow) {
            const trackX = this.ORANGE_SCREEN.x + this.ORANGE_SCREEN.width / 2 - this.SCROLLBAR.padding - this.SCROLLBAR.width;
            const trackY = this.ORANGE_SCREEN.y - this.ORANGE_SCREEN.height / 2 + this.SCROLLBAR.padding;
            const trackH = this.ORANGE_SCREEN.height - this.SCROLLBAR.padding * 2;
            const thumbH = Math.max(12, trackH * (viewportHeight / (this.content.height || 1)));
            const thumbY = trackY + (trackH - thumbH) * (this.scrollOffset / (this.maxScrollOffset || 1));

            this.scrollBar.fillStyle(this.SCROLLBAR.trackColor, 0.4);
            this.scrollBar.fillRect(trackX, trackY, this.SCROLLBAR.width, trackH);
            this.scrollBar.fillStyle(this.SCROLLBAR.thumbColor, 1);
            this.scrollBar.fillRect(trackX, thumbY, this.SCROLLBAR.width, thumbH);
        }
    }

    drawAppContentBorder() {
        this.appContentBorder.clear();
        this.appContentBorder.lineStyle(this.APP_BORDER.thickness, this.APP_BORDER.color, 1);
        this.appContentBorder.strokeRoundedRect(
            this.APP_BORDER.x,
            this.APP_BORDER.y,
            this.APP_BORDER.width,
            this.APP_BORDER.height,
            this.APP_BORDER.radius
        );
        this.appContentBorder.setVisible(true);
    }

    renderRFIDScreen() {
        let content = '';
        const active = rfidSystem.getActiveSignal();

        if (this.appSubScreen === 'main') {
            const entries = this.getRFIDEntries();
            content = '125kHz RFID\n';
            content += entries
                .map((entry, index) => {
                    return index === this.selectedIndex ? `► ${entry}` : `  ${entry}`;
                })
                .join('\n');
        } else if (this.appSubScreen === 'saved') {
            const entries = this.getRFIDEntries();
            content = 'SAVED:\n';
            const savedSignals = rfidSystem.getSavedSignals();

            if (entries.length === 0) {
                content += '(No signals)';
            } else {
                content += entries
                    .map((uid, index) => {
                        const signal = savedSignals.find((entry) => entry.uid === uid);
                        const prefix = index === this.selectedIndex ? '► ' : '  ';
                        const activeMarker = (active && active.uid === uid) ? ' ★' : '';
                        let line = `${prefix}${uid}${activeMarker}`;
                        if (signal) {
                            line += ` L${signal.clearance}`;
                        }
                        return line;
                    })
                    .join('\n');
            }
        } else if (this.appSubScreen === 'emulate') {
            const entries = this.getRFIDEntries();
            content = 'EMULATE:\n';
            const savedSignals = rfidSystem.getSavedSignals();

            if (entries.length === 0) {
                content += '(No signals)';
            } else {
                content += entries
                    .map((uid, index) => {
                        if (uid === 'Add ID') {
                            const prefix = index === this.selectedIndex ? '► ' : '  ';
                            return `${prefix}${uid}`;
                        }
                        const signal = savedSignals.find((entry) => entry.uid === uid);
                        const prefix = index === this.selectedIndex ? '► ' : '  ';
                        const activeMarker = (active && active.uid === uid) ? ' ★' : '';
                        let line = `${prefix}${uid}${activeMarker}`;
                        if (signal) {
                            line += ` L${signal.clearance}`;
                        }
                        return line;
                    })
                    .join('\n');
            }
        } else if (this.appSubScreen === 'add_id') {
            content = 'ENTER UID:\n';
            content += this.textInputBuffer;
            const cursorChar = Math.floor(Date.now() / 500) % 2 === 0 ? '█' : ' ';
            content += cursorChar;
            content += '\n[ENTER] Save\n[BSP] Del\n[Q] X';
        }

        return content;
    }

    updateMask() {
        // Recreate the mask with the current container position
        const maskGraphics = this.scene.make.graphics({ x: 0, y: 0, add: false });
        
        // Get the container's world transform to calculate proper mask position
        const worldTransform = this.getWorldTransformMatrix();
        const containerWorldX = worldTransform.tx;
        const containerWorldY = worldTransform.ty;
        
        const maskX = containerWorldX + this.ORANGE_SCREEN.x - this.ORANGE_SCREEN.width / 2 + this.MASK.padding;
        const maskY = containerWorldY + this.ORANGE_SCREEN.y - this.ORANGE_SCREEN.height / 2 + this.MASK.padding;
        const maskW = this.ORANGE_SCREEN.width - this.MASK.padding * 2;
        const maskH = this.ORANGE_SCREEN.height - this.MASK.padding * 2;
        
        maskGraphics.fillStyle(0xffffff, 1);
        maskGraphics.fillRoundedRect(maskX, maskY, maskW, maskH, this.ORANGE_SCREEN.radius);
        
        // Destroy old mask and apply new one
        if (this.contentMask) {
            this.contentMask.destroy();
        }
        this.contentMask = maskGraphics.createGeometryMask();
        this.content.setMask(this.contentMask);
    }
}

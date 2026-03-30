import Phaser from 'phaser';
import { rfidSystem } from '../systems/RFIDSystem.js';

export class FlipperUI extends Phaser.GameObjects.Container {
    constructor(scene, x, y) {
        super(scene, x, y);
        scene.add.existing(this);

        this.currentMenu = 'main';
        this.selectedIndex = 0;
        this.statusText = '';
        this.busy = false;
        this.bruteforceActive = false;

        const body = scene.add.rectangle(0, 0, 430, 520, 0x242a31, 1)
            .setStrokeStyle(4, 0x0f141a, 1);
        const shellTop = scene.add.rectangle(0, -228, 430, 56, 0x1a2027, 1)
            .setStrokeStyle(1, 0x353f48, 0.9);

        const title = scene.add.text(0, -228, 'FLIPPER ZERO', {
            fontFamily: 'monospace',
            fontSize: '20px',
            fill: '#d9e2ea',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const screen = scene.add.rectangle(0, -92, 320, 220, 0xefcf86, 1)
            .setStrokeStyle(3, 0x7e6123, 1);

        this.content = scene.add.text(-150, -190, '', {
            fontFamily: 'monospace',
            fontSize: '15px',
            fill: '#2d2d2d',
            lineSpacing: 5,
            wordWrap: { width: 300 }
        });

        this.status = scene.add.text(-150, 30, '', {
            fontFamily: 'monospace',
            fontSize: '12px',
            fill: '#3a3a3a',
            wordWrap: { width: 300 }
        });

        const controlsPlate = scene.add.rectangle(0, 136, 300, 214, 0x1a2129, 1)
            .setStrokeStyle(1, 0x414f5e, 0.8);

        const dpad = scene.add.circle(-42, 128, 36, 0x0f141a, 1).setStrokeStyle(2, 0x3f4f5e, 1);
        const ok = scene.add.circle(58, 128, 20, 0x0f141a, 1).setStrokeStyle(2, 0x3f4f5e, 1);
        const back = scene.add.circle(108, 162, 12, 0x0f141a, 1).setStrokeStyle(1, 0x3f4f5e, 1);

        this.footerText = scene.add.text(0, 226, 'W/S NAV  ENTER OK  Q BACK  F CLOSE', {
            fontFamily: 'monospace',
            fontSize: '11px',
            fill: '#a8b6c5'
        }).setOrigin(0.5);

        this.bruteBarBg = scene.add.rectangle(0, 10, 290, 16, 0x6f5720, 0.9).setVisible(false);
        this.bruteBarFill = scene.add.rectangle(-144, 10, 0, 10, 0x2c2c2c, 0.95)
            .setOrigin(0, 0.5)
            .setVisible(false);

        this.add([
            body,
            shellTop,
            title,
            screen,
            this.content,
            this.status,
            controlsPlate,
            dpad,
            ok,
            back,
            this.footerText,
            this.bruteBarBg,
            this.bruteBarFill
        ]);

        this.setVisible(false);
        this.setDepth(150);

        scene.input.keyboard.on('keydown-W', () => this.handleInput('up'));
        scene.input.keyboard.on('keydown-S', () => this.handleInput('down'));
        scene.input.keyboard.on('keydown-UP', () => this.handleInput('up'));
        scene.input.keyboard.on('keydown-DOWN', () => this.handleInput('down'));
        scene.input.keyboard.on('keydown-ENTER', () => this.handleInput('enter'));
        scene.input.keyboard.on('keydown-Q', () => this.handleInput('back'));

        rfidSystem.on('signals-updated', () => {
            if (this.visible && (this.currentMenu === 'saved' || this.currentMenu === 'emulate')) {
                this.renderMenu();
            }
        });
    }

    open() {
        this.currentMenu = 'main';
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

        const entries = this.getEntries();

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
            this.handleBack();
            this.renderMenu();
            return;
        }

        if (action === 'enter' && entries.length > 0) {
            this.handleSelect(entries[this.selectedIndex]);
        }
    }

    getEntries() {
        if (this.currentMenu === 'main') {
            return ['RFID', 'STATUS'];
        }
        if (this.currentMenu === 'rfid') {
            return ['SCAN', 'SAVED_SIGNALS', 'EMULATE_CARD'];
        }
        if (this.currentMenu === 'saved' || this.currentMenu === 'emulate') {
            return rfidSystem.getSavedSignals().map((signal) => signal.uid);
        }
        if (this.currentMenu === 'status') {
            return [];
        }
        return [];
    }

    handleBack() {
        if (this.currentMenu === 'main') {
            this.scene.events.emit('close-flipper');
            return;
        }
        if (this.currentMenu === 'rfid' || this.currentMenu === 'status') {
            this.currentMenu = 'main';
            this.selectedIndex = 0;
            return;
        }
        if (this.currentMenu === 'saved' || this.currentMenu === 'emulate') {
            this.currentMenu = 'rfid';
            this.selectedIndex = 0;
        }
    }

    handleSelect(choice) {
        const gameScene = this.scene.scene.get('GameScene');

        if (this.currentMenu === 'main') {
            if (choice === 'RFID') {
                this.currentMenu = 'rfid';
                this.selectedIndex = 0;
            } else if (choice === 'STATUS') {
                this.currentMenu = 'status';
                this.selectedIndex = 0;
            }
            this.renderMenu();
            return;
        }

        if (this.currentMenu === 'rfid') {
            if (choice === 'SCAN') {
                this.runScan(gameScene);
                return;
            }
            if (choice === 'SAVED_SIGNALS') {
                this.currentMenu = 'saved';
                this.selectedIndex = 0;
            }
            if (choice === 'EMULATE_CARD') {
                this.currentMenu = 'emulate';
                this.selectedIndex = 0;
            }
            this.renderMenu();
            return;
        }

        if (this.currentMenu === 'saved') {
            const signal = rfidSystem.getSavedSignals().find((entry) => entry.uid === choice);
            this.statusText = signal
                ? `UID: ${signal.uid} | CLR: L${signal.clearance} (${signal.color}) | SRC: ${signal.source}`
                : 'Unknown signal';
            this.renderMenu();
            return;
        }

        if (this.currentMenu === 'emulate') {
            const ok = rfidSystem.setActiveSignal(choice);
            if (ok) {
                const signal = rfidSystem.getSavedSignals().find((s) => s.uid === choice);
                this.statusText = `EMULATING: ${choice} | Level: ${signal.clearance}`;
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
                this.statusText = `UID: ${result.signal.uid} captured from ${result.signal.source}`;
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
                        this.statusText = 'L2 Card cloned! Go to RFID → EMULATE_CARD to activate.';
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
        const active = rfidSystem.getActiveSignal();
        const heatLine = `Heat: ${rfidSystem.heat.toFixed(2)}/${rfidSystem.maxHeat.toFixed(2)}${rfidSystem.lockdown ? ' (LOCKDOWN)' : ''}`;
        const entries = this.getEntries();
        let content = '';

        if (this.currentMenu === 'main') {
            content += '== MAIN ==\n\n';
            content += this.renderEntries(entries);
        } else if (this.currentMenu === 'rfid') {
            content += '== RFID ==\n\n';
            content += this.renderEntries(entries);
        } else if (this.currentMenu === 'saved') {
            content += '== SAVED SIGNALS ==\n\n';
            content += this.renderSignalEntries(entries);
        } else if (this.currentMenu === 'emulate') {
            content += '== SELECT EMULATION ==\n\n';
            content += this.renderSignalEntries(entries);
        } else if (this.currentMenu === 'status') {
            const fragments = rfidSystem.getFragmentsStatus();
            content += '== DEVICE STATUS ==\n\n';
            content += `Active UID: ${active ? active.uid : 'None'}\n`;
            content += `Clearance: ${active ? `L${active.clearance}` : 'N/A'}\n`;
            content += `${heatLine}\n`;
            content += `Fragments: ${fragments.collected}/${fragments.total}\n`;
            content += `- sticky_note: ${fragments.sticky_note ? 'DONE' : 'MISSING'}\n`;
            content += `- terminal_dump: ${fragments.terminal_dump ? 'DONE' : 'MISSING'}\n`;
            content += `- lab_log: ${fragments.lab_log ? 'DONE' : 'MISSING'}\n`;
            content += '\nPress Q to go back.';
        }

        this.content.setText(content);
        this.status.setText(this.statusText || `${heatLine} | Active: ${active ? active.uid : 'None'}`);
    }

    renderEntries(entries) {
        if (entries.length === 0) {
            return '(No entries)';
        }

        return entries
            .map((entry, index) => (index === this.selectedIndex ? `> ${entry}` : `  ${entry}`))
            .join('\n');
    }

    renderSignalEntries(uids) {
        const savedSignals = rfidSystem.getSavedSignals();
        const active = rfidSystem.getActiveSignal();

        if (uids.length === 0) {
            return '(No saved signals)';
        }

        return uids
            .map((uid, index) => {
                const signal = savedSignals.find((entry) => entry.uid === uid);
                const prefix = index === this.selectedIndex ? '>' : ' ';
                const activeMarker = (active && active.uid === uid) ? ' [ACTIVE]' : '';
                return `${prefix} ${uid} | L${signal.clearance} ${signal.color}${activeMarker}`;
            })
            .join('\n');
    }
}

import Phaser from 'phaser';

export class TerminalUI {
    constructor(scene) {
        this.scene = scene;
        this.visible = false;
        this.currentTerminalId = null;
        this.currentInput = '';
        this.outputLines = [];
        this.maxLines = 26;
        this.executing = false;
        this.prompt = 'root@docker:/workspace#';
        this.bridgeBaseUrl = 'http://localhost:8787';

        this.createUI();
        this.hide();

        this.keydownHandler = (event) => this.handleKeydown(event);
        this.scene.input.keyboard.on('keydown', this.keydownHandler);
    }

    createUI() {
        const { width: screenWidth, height: screenHeight } = this.scene.scale;
        const width = Math.min(740, screenWidth - 60);
        const height = Math.min(470, screenHeight - 50);
        const x = screenWidth / 2;
        const y = screenHeight / 2;

        // Backdrop
        this.backdrop = this.scene.add.rectangle(x, y, screenWidth, screenHeight, 0x000000, 0.86)
            .setDepth(200)
            .setScrollFactor(0)
            .setInteractive();

        // Terminal window background
        this.terminalBg = this.scene.add.rectangle(x, y, width, height, 0x0a0a0a, 0.98)
            .setDepth(201)
            .setScrollFactor(0)
            .setStrokeStyle(2, 0x00ff88, 0.8);

        // Terminal header
        this.header = this.scene.add.rectangle(x, y - height / 2 + 20, width, 40, 0x001a0d, 1)
            .setDepth(202)
            .setScrollFactor(0);

        this.headerText = this.scene.add.text(x - width / 2 + 15, y - height / 2 + 10, 'TERMINAL ACCESS', {
            fontFamily: 'monospace',
            fontSize: '14px',
            fill: '#00ff88',
            fontStyle: 'bold'
        }).setDepth(203).setScrollFactor(0);

        this.closeHint = this.scene.add.text(x + width / 2 - 15, y - height / 2 + 10, '[ESC] CLOSE', {
            fontFamily: 'monospace',
            fontSize: '12px',
            fill: '#00aa66'
        }).setOrigin(1, 0).setDepth(203).setScrollFactor(0);

        // Terminal content area
        this.contentText = this.scene.add.text(x - width / 2 + 20, y - height / 2 + 60, '', {
            fontFamily: 'monospace',
            fontSize: '13px',
            fill: '#00ff88',
            lineSpacing: 4,
            wordWrap: { width: width - 40 }
        }).setDepth(203).setScrollFactor(0);

        // Blinking cursor
        this.cursor = this.scene.add.text(0, 0, '█', {
            fontFamily: 'monospace',
            fontSize: '13px',
            fill: '#00ff88'
        }).setDepth(203).setScrollFactor(0);

        // Cursor blink animation
        this.scene.tweens.add({
            targets: this.cursor,
            alpha: { from: 1, to: 0 },
            duration: 530,
            repeat: -1,
            yoyo: true
        });

        this.uiElements = [
            this.backdrop,
            this.terminalBg,
            this.header,
            this.headerText,
            this.closeHint,
            this.contentText,
            this.cursor
        ];
    }

    open(computerId) {
        if (this.visible) return;

        this.currentTerminalId = computerId;
        this.visible = true;
        this.currentInput = '';
        this.outputLines = [];

        // Show all UI elements
        this.uiElements.forEach(el => el.setVisible(true));

        this.renderTerminal();

        // Emit event to pause player
        this.scene.events.emit('terminal-opened');
    }

    handleKeydown(event) {
        if (!this.visible) {
            return;
        }

        if (event.key === 'Escape') {
            return;
        }

        if (event.key === 'Backspace') {
            event.preventDefault();
            if (this.currentInput.length > 0) {
                this.currentInput = this.currentInput.slice(0, -1);
                this.renderTerminal();
            }
            return;
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            this.submitInput();
            return;
        }

        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            this.currentInput += event.key;
            this.renderTerminal();
        }
    }

    async submitInput() {
        const rawInput = this.currentInput;
        const trimmedInput = rawInput.trim();

        if (this.executing) {
            return;
        }

        if (trimmedInput.length === 0) {
            this.outputLines.push(this.prompt);
            this.currentInput = '';
            this.clampOutputLines();
            this.renderTerminal();
            return;
        }

        if (trimmedInput === 'clear') {
            this.outputLines = [];
            this.currentInput = '';
            this.renderTerminal();
            return;
        }

        if (trimmedInput === 'exit') {
            this.close();
            return;
        }

        this.outputLines.push(`${this.prompt} ${rawInput}`);
        this.currentInput = '';
        this.clampOutputLines();
        this.renderTerminal();

        this.executing = true;
        this.closeHint.setText('[ESC] CLOSE | EXECUTING...');

        try {
            const response = await fetch(`${this.bridgeBaseUrl}/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: rawInput })
            });

            if (!response.ok) {
                this.outputLines.push(`[bridge] request failed: ${response.status}`);
            } else {
                const result = await response.json();
                const output = [];

                if (result.stdout) {
                    output.push(...result.stdout.replace(/\r/g, '').split('\n').filter((line) => line.length > 0));
                }

                if (result.stderr) {
                    output.push(...result.stderr.replace(/\r/g, '').split('\n').filter((line) => line.length > 0));
                }

                if (output.length === 0 && typeof result.exitCode === 'number' && result.exitCode !== 0) {
                    output.push(`command exited with code ${result.exitCode}`);
                }

                this.outputLines.push(...output);
            }
        } catch (error) {
            this.outputLines.push('[bridge] unable to reach docker terminal bridge at http://localhost:8787');
            this.outputLines.push('start bridge: npm run terminal:bridge');
            this.outputLines.push(String(error && error.message ? error.message : error));
        } finally {
            this.executing = false;
            this.closeHint.setText('[ESC] CLOSE');
            this.clampOutputLines();
            this.renderTerminal();
        }
    }

    clampOutputLines() {
        if (this.outputLines.length > this.maxLines) {
            this.outputLines = this.outputLines.slice(this.outputLines.length - this.maxLines);
        }
    }

    renderTerminal() {
        const lines = [...this.outputLines, `${this.prompt} ${this.currentInput}`];
        this.contentText.setText(lines.join('\n'));

        const lineHeight = 13 + 4;
        const cursorX = this.contentText.x + this.contentText.width;
        const cursorY = this.contentText.y + (lines.length - 1) * lineHeight;
        this.cursor.setPosition(cursorX, cursorY);
    }

    close() {
        if (!this.visible) return;

        this.visible = false;
        this.currentTerminalId = null;

        // Hide all UI elements
        this.uiElements.forEach(el => el.setVisible(false));

        // Emit event to resume player
        this.scene.events.emit('terminal-closed');
    }

    hide() {
        this.uiElements.forEach(el => el.setVisible(false));
    }

    isOpen() {
        return this.visible;
    }
}

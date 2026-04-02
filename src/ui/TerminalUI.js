import Phaser from 'phaser';

export class TerminalUI {
    constructor(scene) {
        this.scene = scene;
        this.visible = false;
        this.currentTerminalId = null;
        this.currentInput = '';
        this.outputLines = [];
        this.maxLines = 18;
        this.executing = false;
        this.prompt = 'root@docker:/home/player/files#';
        
        // Detect bridge URL - use window.location.host for port, Docker service name for hostname
        // In Docker: accessible at http://terminal-bridge:8787
        // Locally: accessible at http://localhost:8787
        const hostname = window.location.hostname;
        const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
        const bridgeHost = isLocalhost ? 'localhost' : 'terminal-bridge';
        this.bridgeBaseUrl = `http://${bridgeHost}:8787`;
        
        // Command history
        this.commandHistory = [];
        this.currentHistoryIndex = -1;

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
        const lineHeight = 13 + 4;

        // Store content area position for cursor calculation
        this.contentX = x - width / 2 + 20;
        this.contentY = y - height / 2 + 60;
        this.contentWidth = width - 40;
        this.contentHeight = height - 90;
        this.lineHeight = lineHeight;

        // Keep output capped to guaranteed visible rows so text never bleeds outside window.
        this.maxLines = Math.max(10, Math.floor((height - 120) / lineHeight) - 1);

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
        this.contentText = this.scene.add.text(this.contentX, this.contentY, '', {
            fontFamily: 'monospace',
            fontSize: '13px',
            fill: '#00ff88',
            lineSpacing: 4,
            wordWrap: { width: this.contentWidth }
        }).setDepth(203).setScrollFactor(0);

        // Hard clip output to terminal viewport so long output never draws outside the panel.
        this.contentMaskGraphics = this.scene.add.graphics().setScrollFactor(0).setDepth(202);
        this.contentMaskGraphics.fillStyle(0xffffff, 1);
        this.contentMaskGraphics.fillRect(this.contentX, this.contentY, this.contentWidth, this.contentHeight);
        this.contentMask = this.contentMaskGraphics.createGeometryMask();
        this.contentMaskGraphics.setVisible(false);
        this.contentText.setMask(this.contentMask);

        // Blinking cursor
        this.cursor = this.scene.add.text(0, 0, '█', {
            fontFamily: 'monospace',
            fontSize: '13px',
            fill: '#00ff88'
        }).setDepth(203).setScrollFactor(0);
        this.cursor.setMask(this.contentMask);

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
        this.currentHistoryIndex = -1;

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

        // Block terminal input when FlipperUI is open (FlipperUI has priority)
        const gameScene = this.scene;
        const uiScene = gameScene.scene.get('UIScene');
        if (uiScene && uiScene.flipperOpen) {
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

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (this.commandHistory.length === 0) return;
            
            if (this.currentHistoryIndex === -1) {
                this.currentHistoryIndex = this.commandHistory.length - 1;
            } else if (this.currentHistoryIndex > 0) {
                this.currentHistoryIndex--;
            }
            
            this.currentInput = this.commandHistory[this.currentHistoryIndex];
            this.renderTerminal();
            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (this.commandHistory.length === 0) return;
            
            if (this.currentHistoryIndex < this.commandHistory.length - 1) {
                this.currentHistoryIndex++;
                this.currentInput = this.commandHistory[this.currentHistoryIndex];
            } else {
                this.currentHistoryIndex = -1;
                this.currentInput = '';
            }
            
            this.renderTerminal();
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
            this.currentHistoryIndex = -1;
            this.clampOutputLines();
            this.renderTerminal();
            return;
        }

        if (trimmedInput === 'clear') {
            this.outputLines = [];
            this.currentInput = '';
            this.currentHistoryIndex = -1;
            this.renderTerminal();
            return;
        }

        if (trimmedInput === 'exit') {
            this.close();
            return;
        }

        // Add to command history
        if (!this.commandHistory.includes(rawInput)) {
            this.commandHistory.push(rawInput);
        }
        this.currentHistoryIndex = -1;

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
                body: JSON.stringify({
                    command: rawInput,
                    computerId: this.currentTerminalId
                })
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
            const hostname = window.location.hostname;
            const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
            const expectedUrl = isLocalhost ? 'http://localhost:8787' : 'http://terminal-bridge:8787';
            this.outputLines.push(`[bridge] unable to reach docker terminal bridge at ${expectedUrl}`);
            if (isLocalhost) {
                this.outputLines.push('start bridge: npm run terminal:bridge');
            } else {
                this.outputLines.push('ensure terminal-bridge service is running in docker-compose');
            }
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
        // First, render all output lines without the input line
        const outputOnlyText = this.outputLines.join('\n');
        this.contentText.setText(outputOnlyText);
        
        // Get the actual height of the output text
        const outputHeight = this.contentText.height;
        
        // Now set the full text including input line
        const lines = [...this.outputLines, `${this.prompt} ${this.currentInput}`];
        this.contentText.setText(lines.join('\n'));

        // Calculate cursor position based on current line and character count
        const currentLine = `${this.prompt} ${this.currentInput}`;
        // For monospace font, each character is approximately 7.8 pixels wide at 13px font size
        const charWidth = 7.8;
        const cursorX = this.contentX + (currentLine.length * charWidth);
        
        // Position cursor at the input line level (baseline of the input text)
        // Add small spacing if there's output above
        const cursorY = this.contentY + outputHeight + (this.outputLines.length > 0 ? 4 : 0);
        
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

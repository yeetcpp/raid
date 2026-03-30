import Phaser from 'phaser';

export class LogSystem extends Phaser.Events.EventEmitter {
    constructor() {
        super();
        this.logs = [];
        this.maxLogs = 12;
    }

    addLog(message, type = 'info') {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        const timestamp = `${h}:${m}:${s}`;

        const entry = { text: `[${timestamp}] ${message}`, type, time: Date.now() };
        this.logs.push(entry);

        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        this.emit('log-updated', this.logs);
        this.emit('log-added', entry);
    }

    getColorForType(type) {
        switch (type) {
            case 'success': return '#00ff44';
            case 'error': return '#ff3333';
            case 'warn': return '#ffaa00';
            case 'info':
            default: return '#00cc33';
        }
    }

    clear() {
        this.logs = [];
        this.emit('log-updated', this.logs);
    }
}

export const logSystem = new LogSystem();

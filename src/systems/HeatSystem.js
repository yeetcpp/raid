import Phaser from 'phaser';
import { rfidSystem } from './RFIDSystem.js';
import { logSystem } from './LogSystem.js';

class HeatSystem extends Phaser.Events.EventEmitter {
    constructor() {
        super();
        this.heat = 0;
        this.maxHeat = 100;
        
        rfidSystem.on('suspicion-changed', (val) => {
            this.heat = val;
            this.emit('heat-updated', this.heat);
            
            if (this.heat >= 100) {
                logSystem.addLog('█ LOCKDOWN █ SYSTEM COMPROMISED', 'error');
            }
        });
    }

    getHeatLevel() {
        if (this.heat < 30) return 'LOW';
        if (this.heat < 70) return 'MEDIUM';
        return 'CRITICAL';
    }
}

export const heatSystem = new HeatSystem();

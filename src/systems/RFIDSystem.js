import Phaser from 'phaser';
import { logSystem } from './LogSystem.js';

const SCANNERS = {
    HUB_L1_READER: { name: 'HUB_L1_READER', requiredClearance: 1 },
    LAB_L2_READER: { name: 'LAB_L2_READER', requiredClearance: 2 },
    STAFF_CORRIDOR_L3_READER: { name: 'STAFF_CORRIDOR_L3_READER', requiredClearance: 3 }
};

class RFIDSystem extends Phaser.Events.EventEmitter {
    constructor() {
        super();
        this.reset();
    }

    reset() {
        this.heat = 0;
        this.maxHeat = 3;
        this.lockdown = false;
        this.lastScanAt = 0;
        this.lastUseByUid = {};
        this.serverRoomUnlocked = false;

        this.savedSignals = [
            {
                uid: 'UID_STU_10A',
                clearance: 1,
                source: 'PLAYER_CARD',
                label: 'Student Card',
                color: 'Green'
            }
        ];
        this.activeUID = 'UID_STU_10A';

        this.fragments = {
            sticky_note: false,
            terminal_dump: false,
            lab_log: false
        };

        this.emitState();
    }

    emitState() {
        this.emit('heat-changed', this.heat, this.maxHeat);
        this.emit('signals-updated', this.getSavedSignals());
        this.emit('active-signal-changed', this.getActiveSignal());
        this.emit('fragments-updated', this.getFragmentsStatus());
        this.emit('suspicion-changed', Math.round((this.heat / this.maxHeat) * 100));
    }

    getSavedSignals() {
        return this.savedSignals.map((signal) => ({ ...signal }));
    }

    getActiveSignal() {
        return this.savedSignals.find((signal) => signal.uid === this.activeUID) || null;
    }

    getFragmentsStatus() {
        const keys = Object.keys(this.fragments);
        const collected = keys.filter((key) => this.fragments[key]).length;
        return {
            ...this.fragments,
            collected,
            total: keys.length
        };
    }

    setActiveSignal(uid) {
        if (!this.savedSignals.some((signal) => signal.uid === uid)) {
            return false;
        }

        this.activeUID = uid;
        const active = this.getActiveSignal();
        this.emit('active-signal-changed', active);
        logSystem.addLog(`${active.uid} -> FLIPPER -> EMULATION ACTIVE`, 'info');
        return true;
    }

    addSignal(signal) {
        if (this.savedSignals.some((saved) => saved.uid === signal.uid)) {
            return false;
        }

        this.savedSignals.push(signal);
        this.emit('signals-updated', this.getSavedSignals());
        return true;
    }

    addHeat(amount, reason = 'SUSPICIOUS_ACTIVITY') {
        if (this.lockdown) {
            return;
        }

        this.heat = Math.min(this.maxHeat, this.heat + amount);
        this.emit('heat-changed', this.heat, this.maxHeat);
        this.emit('suspicion-changed', Math.round((this.heat / this.maxHeat) * 100));

        if (amount > 0) {
            logSystem.addLog(`HEAT +${amount.toFixed(2)} -> ${reason}`, 'warn');
        }

        if (this.heat >= this.maxHeat) {
            this.triggerLockdown();
        }
    }

    triggerLockdown() {
        if (this.lockdown) {
            return;
        }

        this.lockdown = true;
        logSystem.addLog('LOCKDOWN -> ALL_SCANNERS -> DISABLED', 'error');
        this.emit('game-lose');
    }

    scanTarget(target) {
        if (this.lockdown) {
            return { ok: false, message: 'LOCKDOWN ACTIVE' };
        }

        const now = Date.now();
        if (now - this.lastScanAt < 900) {
            this.addHeat(0.2, 'REPEATED_SCAN');
        }
        this.lastScanAt = now;

        if (!target) {
            return { ok: false, message: 'NO RFID SOURCE IN RANGE' };
        }

        if (target.kind === 'scanner') {
            const scanner = SCANNERS[target.scannerId];
            const signal = {
                uid: `UID_CAL_${scanner.requiredClearance}_${target.scannerId.slice(0, 4)}`,
                clearance: scanner.requiredClearance,
                source: scanner.name,
                label: `${scanner.name} Calibration`,
                color: this.getClearanceColor(scanner.requiredClearance)
            };

            const added = this.addSignal(signal);
            if (added) {
                logSystem.addLog(`${signal.uid} -> ${scanner.name} -> SCAN CAPTURED`, 'success');
                this.emit('signal-captured', signal);
                return { ok: true, type: 'signal', signal };
            }

            return { ok: false, message: 'SIGNAL ALREADY SAVED' };
        }

        if (target.kind === 'source' && target.sourceId === 'OFFICE_L2_BADGE') {
            const signal = {
                uid: 'UID_TECH_22B',
                clearance: 2,
                source: 'STAFF_OFFICE_BADGE',
                label: 'Technician Badge',
                color: this.getClearanceColor(2)
            };

            const added = this.addSignal(signal);
            if (added) {
                logSystem.addLog(`${signal.uid} -> STAFF_OFFICE -> SCAN CAPTURED`, 'success');
                this.emit('signal-captured', signal);
                return { ok: true, type: 'signal', signal };
            }

            return { ok: false, message: 'TECH BADGE ALREADY CAPTURED' };
        }

        if (target.kind === 'fragment') {
            return this.collectFragment(target.fragmentId);
        }

        return { ok: false, message: 'INVALID SCAN TARGET' };
    }

    collectFragment(fragmentId) {
        if (!Object.prototype.hasOwnProperty.call(this.fragments, fragmentId)) {
            return { ok: false, message: 'UNKNOWN FRAGMENT' };
        }

        if (this.fragments[fragmentId]) {
            return { ok: false, message: 'FRAGMENT ALREADY COLLECTED' };
        }

        this.fragments[fragmentId] = true;
        const status = this.getFragmentsStatus();
        logSystem.addLog(`FRAGMENT_${status.collected}/${status.total} -> UID RECOVERY`, 'info');
        this.emit('fragments-updated', status);

        if (status.collected === status.total) {
            const level3 = {
                uid: 'UID_DIR_9X3',
                clearance: 3,
                source: 'RECONSTRUCTED_L3_UID',
                label: 'Director Credential',
                color: this.getClearanceColor(3)
            };
            this.addSignal(level3);
            logSystem.addLog(`${level3.uid} -> FORENSICS -> UID RECONSTRUCTED`, 'success');
            this.emit('signal-captured', level3);
            return { ok: true, type: 'fragment-complete', signal: level3 };
        }

        return { ok: true, type: 'fragment' };
    }

    attemptAccess(scannerId) {
        const scanner = SCANNERS[scannerId];
        const active = this.getActiveSignal();

        if (this.lockdown || !scanner || !active) {
            return { granted: false, reason: 'STATE_ERROR' };
        }

        const now = Date.now();

        // DOOR ACCESS LOGIC
        // L2 Door requires emulated L2 card (UID_TECH_22B)
        if (scannerId === 'LAB_L2_READER') {
            if (active.uid === 'UID_TECH_22B' && active.clearance >= 2) {
                // SUCCESS: Emulated L2 card → unlock server room
                this.serverRoomUnlocked = true;
                const resultText = 'ACCESS GRANTED - L2 EMULATION';
                logSystem.addLog(`${active.uid} -> ${scanner.name} -> ${resultText}`, 'success');

                this.lastUseByUid[active.uid] = { scannerId, time: now };
                this.emit('access-result', {
                    scannerId,
                    scannerName: scanner.name,
                    uid: active.uid,
                    granted: true,
                    reason: 'SERVER_L2_AUTH'
                });

                console.log('ACCESS GRANTED: L2');
                return { granted: true, reason: 'SERVER_L2_AUTH' };
            } else {
                // DENIED: Wrong card or no emulation active
                this.addHeat(1, `${scanner.name}_DENIED`);
                const resultText = 'ACCESS DENIED - REQUIRES EMULATED L2 CARD';
                logSystem.addLog(`${active.uid} -> ${scanner.name} -> ${resultText}`, 'error');

                console.log('ACCESS DENIED');
                return { granted: false, reason: 'SERVER_READER_REQUIRES_EMULATED_L2' };
            }
        }

        // Standard clearance check for other scanners
        let granted = active.clearance >= scanner.requiredClearance;
        let reason = granted ? 'ACCESS_GRANTED' : 'ACCESS_DENIED';

        if (!granted) {
            this.addHeat(1, `${scanner.name}_DENIED`);
        }

        const resultText = granted ? 'ACCESS GRANTED' : 'ACCESS DENIED';
        logSystem.addLog(`${active.uid} -> ${scanner.name} -> ${resultText}`, granted ? 'success' : 'error');

        this.lastUseByUid[active.uid] = {
            scannerId,
            time: now
        };

        this.emit('access-result', {
            scannerId,
            scannerName: scanner.name,
            uid: active.uid,
            granted,
            reason
        });

        return { granted, reason };
    }

    getClearanceColor(level) {
        if (level === 1) {
            return 'Green';
        }
        if (level === 2) {
            return 'Blue';
        }
        return 'Red';
    }
}

export const rfidSystem = new RFIDSystem();

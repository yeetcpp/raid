import Phaser from 'phaser';

export class HintSystem extends Phaser.Events.EventEmitter {
    constructor() {
        super();
        this.idleTimer = 0;
        this.hintIndex = 0;
        this.idleThreshold = 20000; // 20 seconds idle before first hint
        this.lastActivityTime = Date.now();
        this.currentHint = null;
        this.dismissed = false;

        this.hints = [
            "You have tools you haven't used yet…",
            "Try interacting with nearby terminals [F]",
            "Check your collected signals [I]",
            "Multiple rapid accesses might confuse the system…",
            "What happens if the same ID appears in two places at once?",
            "The system expects a specific sequence. What if you skip a step?",
            "Persistence might reveal a flaw in UID handling…",
            "Server security has a weakness. Think about what you know."
        ];
    }

    recordActivity() {
        this.lastActivityTime = Date.now();
        this.dismissed = false;
    }

    update(time) {
        const elapsed = Date.now() - this.lastActivityTime;

        if (elapsed > this.idleThreshold && !this.dismissed) {
            if (this.hintIndex < this.hints.length) {
                const hint = this.hints[this.hintIndex];
                if (this.currentHint !== hint) {
                    this.currentHint = hint;
                    this.emit('hint-show', hint);
                    this.hintIndex++;
                    this.lastActivityTime = Date.now(); // Reset timer for next hint
                }
            }
        }
    }

    dismiss() {
        this.dismissed = true;
        this.currentHint = null;
        this.emit('hint-hide');
    }

    reset() {
        this.idleTimer = 0;
        this.hintIndex = 0;
        this.currentHint = null;
        this.lastActivityTime = Date.now();
    }
}

export const hintSystem = new HintSystem();

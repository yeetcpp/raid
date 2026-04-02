import Phaser from 'phaser';

export class QuestSystem extends Phaser.Events.EventEmitter {
    constructor() {
        super();
        this.currentIndex = 0;
        this.completed = false;

        this.quests = [
            { id: 'explore_classroom', text: 'Explore the classroom', trigger: 'zone:classroom', auto: true },
            { id: 'open_flipper', text: 'Open the Flipper device [F]', trigger: 'action:open_flipper' },
            { id: 'find_terminal', text: 'Find an RFID terminal', trigger: 'action:near_terminal' },
            { id: 'scan_terminal', text: 'Scan a terminal signal', trigger: 'action:scan' },
            { id: 'use_entry', text: 'Access the Entry door', trigger: 'action:emulate' },
            { id: 'explore_hub', text: 'Explore the central hub', trigger: 'zone:hub' },
            { id: 'find_lab', text: 'Find a way to access the Lab', trigger: 'action:scan_lab' },
            { id: 'reach_server', text: 'Reach the Server Room entrance reader', trigger: 'action:near_server' },
            { id: 'exploit', text: 'Something feels off… exploit the system', trigger: 'action:exploit' }
        ];
    }

    getCurrentQuest() {
        if (this.completed || this.currentIndex >= this.quests.length) return null;
        return this.quests[this.currentIndex];
    }

    advance(trigger) {
        if (this.completed) return;
        const current = this.getCurrentQuest();
        if (!current) return;

        if (current.trigger === trigger) {
            this.currentIndex++;
            const next = this.getCurrentQuest();
            this.emit('quest-updated', next);

            if (!next) {
                this.completed = true;
                this.emit('quests-complete');
            }
        }
    }

    // Force advance to a specific quest by id
    advanceTo(questId) {
        const idx = this.quests.findIndex(q => q.id === questId);
        if (idx > this.currentIndex) {
            this.currentIndex = idx;
            this.emit('quest-updated', this.getCurrentQuest());
        }
    }

    reset() {
        this.currentIndex = 0;
        this.completed = false;
        this.emit('quest-updated', this.getCurrentQuest());
    }
}

export const questSystem = new QuestSystem();

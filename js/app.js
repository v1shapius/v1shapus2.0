/**
 * Main Application Controller
 * Orchestrates all modules and manages match flow
 */

const App = {
    // Match state
    match: {
        format: null,
        player1: { name: '', ign: '' },
        player2: { name: '', ign: '' },
        currentStep: 0,
        currentMapIndex: 0,
        scores: { player1: 0, player2: 0 },
        mapResults: [],
        isTieBreaker: false,
        tieBreakerMap: null,
        startTime: null,
        endTime: null
    },
    
    // UI State
    currentModalAction: null,
    currentModalPlayer: null,
    currentModalSlot: null,
    
    /**
     * Initialize the application
     */
    async init() {
        console.log('Initializing AK:END Judge Tool...');
        
        // Load data
        const dataLoaded = await DataLoader.loadAll();
        if (!dataLoaded) {
            alert('Failed to load game data. Please refresh the page.');
            return;
        }
        
        // Setup event listeners
        this.setupEventListeners();
        
        console.log('Application initialized successfully');
    },
    
    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Match setup
        document.getElementById('btn-start-match')?.addEventListener('click', () => this.startMatch());
        
        // Shop phase
        document.getElementById('btn-finish-shop')?.addEventListener('click', () => this.finishShopPhase());
        
        // Map generation
        document.getElementById('btn-generate-maps')?.addEventListener('click', () => this.generateMaps());
        document.getElementById('btn-confirm-maps')?.addEventListener('click', () => this.confirmMaps());
        
        // Bans & Protections
        document.getElementById('btn-finish-protections')?.addEventListener('click', () => this.finishProtectionsPhase());
        document.getElementById('btn-finish-bans')?.addEventListener('click', () => this.finishBansPhase());
        
        // Team building
        document.getElementById('btn-lock-teams')?.addEventListener('click', () => this.lockTeams());
        
        // Match execution
        document.getElementById('btn-submit-result')?.addEventListener('click', () => this.submitResult());
        document.getElementById('btn-p1-restart')?.addEventListener('click', () => this.requestRestart('player1'));
        document.getElementById('btn-p2-restart')?.addEventListener('click', () => this.requestRestart('player2'));
        
        // Tie-breaker
        document.getElementById('btn-start-tiebreaker')?.addEventListener('click', () => this.startTieBreaker());
        
        // Summary
        document.getElementById('btn-new-match')?.addEventListener('click', () => this.resetMatch());
        
        // Export/Reset
        document.getElementById('btn-export')?.addEventListener('click', () => this.exportData());
        document.getElementById('btn-reset')?.addEventListener('click', () => this.hardReset());
        
        // Modal
        document.getElementById('btn-close-modal')?.addEventListener('click', () => this.closeModal());
        document.getElementById('char-search')?.addEventListener('input', (e) => this.filterCharacterGrid(e.target.value));
    },
    
    /**
     * Start a new match
     */
    startMatch() {
        const p1Name = document.getElementById('player1-name').value.trim();
        const p2Name = document.getElementById('player2-name').value.trim();
        const format = document.getElementById('match-format').value;
        
        if (!p1Name || !p2Name) {
            alert('Please enter both player names');
            return;
        }
        
        // Initialize match state
        this.match = {
            format,
            player1: { name: p1Name, ign: p1Name },
            player2: { name: p2Name, ign: p2Name },
            currentStep: 1,
            currentMapIndex: 0,
            scores: { player1: 0, player2: 0 },
            mapResults: [],
            isTieBreaker: false,
            tieBreakerMap: null,
            startTime: new Date(),
            log: [`Match started: ${p1Name} vs ${p2Name}`, `Format: ${format.toUpperCase()}`]
        };
        
        // Initialize shop
        ShopModule.initialize(format);
        
        // Update UI
        this.updateMatchInfoBar();
        this.renderShopPhase();
        this.showStep('step-shop');
        
        this.log('Shop phase started');
    },
    
    /**
     * Render shop phase UI
     */
    renderShopPhase() {
        ShopModule.renderShop('player1', 'shop-player1', this.match.format);
        ShopModule.renderShop('player2', 'shop-player2', this.match.format);
    },
    
    /**
     * Finish shop phase and move to map generation
     */
    finishShopPhase() {
        this.match.currentStep = 2;
        this.showStep('step-maps');
        this.log('Shop phase completed');
    },
    
    /**
     * Generate maps for the match
     */
    generateMaps() {
        let mapCount = 3; // Default for Bo3
        
        if (this.match.format === 'bo5') {
            mapCount = 5;
        } else if (this.match.format === 'group') {
            mapCount = 3; // Group stage typically 3 maps
        }
        
        MapGenerator.generateMaps(mapCount);
        MapGenerator.renderMaps('generated-maps');
        
        document.getElementById('btn-confirm-maps').classList.remove('hidden');
        document.getElementById('btn-regenerate-maps').classList.remove('hidden');
        
        this.log(`Generated ${mapCount} maps`);
    },
    
    /**
     * Confirm maps and move to bans phase
     */
    confirmMaps() {
        this.match.currentStep = 3;
        
        // Initialize bans/protections module
        const shopState = ShopModule.getState();
        BansProtectionsModule.initialize(shopState, this.match.format);
        
        // Show protections phase
        document.getElementById('protections-area').classList.remove('hidden');
        document.getElementById('bans-area').classList.add('hidden');
        document.getElementById('phase-protections').classList.add('active');
        document.getElementById('phase-bans').classList.remove('active');
        
        // Render character grid for protections
        BansProtectionsModule.renderCharacterGrid('ban-character-grid', 'protection', 'player1');
        BansProtectionsModule.updateProtectionUI();
        
        this.showStep('step-bans');
        this.log('Bans & Protections phase started');
    },
    
    /**
     * Finish protections phase and move to bans
     */
    finishProtectionsPhase() {
        document.getElementById('protections-area').classList.add('hidden');
        document.getElementById('bans-area').classList.remove('hidden');
        document.getElementById('phase-protections').classList.remove('active');
        document.getElementById('phase-bans').classList.add('active');
        
        BansProtectionsModule.renderCharacterGrid('ban-character-grid', 'ban', 'player1');
        BansProtectionsModule.updateBansUI();
        BansProtectionsModule.updateBannedList();
        
        this.log('Protections phase completed');
    },
    
    /**
     * Finish bans phase and move to team building
     */
    finishBansPhase() {
        this.match.currentStep = 4;
        this.match.currentMapIndex = 0;
        
        this.showStep('step-teams');
        this.updateTeamBuilderUI();
        this.log('Bans phase completed. Team building started for Map 1');
    },
    
    /**
     * Update team builder UI for current map
     */
    updateTeamBuilderUI() {
        const mapNum = this.match.currentMapIndex + 1;
        document.getElementById('current-team-map').textContent = mapNum;
        
        // Reset team slots
        document.getElementById('p1-team-slots').innerHTML = '';
        document.getElementById('p2-team-slots').innerHTML = '';
        
        for (let i = 0; i < 4; i++) {
            const slot1 = this.createTeamSlot('player1', i);
            const slot2 = this.createTeamSlot('player2', i);
            document.getElementById('p1-team-slots').appendChild(slot1);
            document.getElementById('p2-team-slots').appendChild(slot2);
        }
        
        // Update extinction status
        document.getElementById('p1-used-chars').textContent = 'None';
        document.getElementById('p2-used-chars').textContent = 'None';
        
        // Update resurrection count
        const p1Res = ShopModule.getTotalResurrections('player1');
        const p2Res = ShopModule.getTotalResurrections('player2');
        document.getElementById('p1-resurrections').textContent = p1Res;
        document.getElementById('p2-resurrections').textContent = p2Res;
        
        // Reset equipment checkboxes
        document.getElementById('equip-check-p1').checked = false;
        document.getElementById('equip-check-p2').checked = false;
    },
    
    /**
     * Create a team slot element
     */
    createTeamSlot(player, slotIndex) {
        const slot = document.createElement('div');
        slot.className = 'team-slot';
        slot.innerHTML = '<span>+ Add</span>';
        slot.onclick = () => this.openCharacterSelectModal(player, slotIndex);
        return slot;
    },
    
    /**
     * Open character selection modal
     */
    openCharacterSelectModal(player, slotIndex) {
        this.currentModalPlayer = player;
        this.currentModalSlot = slotIndex;
        this.currentModalAction = 'select';
        
        document.getElementById('char-select-modal').classList.remove('hidden');
        document.getElementById('char-search').value = '';
        
        this.renderModalCharacterGrid();
    },
    
    /**
     * Render character grid in modal
     */
    renderModalCharacterGrid(filter = '') {
        const container = document.getElementById('modal-character-grid');
        container.innerHTML = '';
        
        let characters = DataLoader.characters;
        
        if (filter) {
            characters = DataLoader.searchCharacters(filter);
        }
        
        // Filter out banned characters
        const bannedChars = BansProtectionsModule.getBannedCharacters().map(c => c.id);
        
        characters.forEach(char => {
            if (bannedChars.includes(char.id)) return;
            
            const charEl = document.createElement('div');
            charEl.className = `char-card rarity-${char.rarity}`;
            charEl.innerHTML = `
                <div style="font-size:1.5rem;">${char.rarity === 6 ? '🔶' : char.rarity === 5 ? '🟣' : char.rarity === 4 ? '🔷' : '⚪'}</div>
                <div class="char-name">${char.name}</div>
            `;
            charEl.onclick = () => this.selectCharacterForTeam(char.id);
            container.appendChild(charEl);
        });
    },
    
    /**
     * Filter character grid based on search
     */
    filterCharacterGrid(query) {
        this.renderModalCharacterGrid(query);
    },
    
    /**
     * Select character for team
     */
    selectCharacterForTeam(charId) {
        // TODO: Implement team selection logic with extinction tracking
        this.closeModal();
        alert(`Selected ${DataLoader.getCharacterById(charId).name} for ${this.currentModalPlayer}`);
    },
    
    /**
     * Close modal
     */
    closeModal() {
        document.getElementById('char-select-modal').classList.add('hidden');
        this.currentModalAction = null;
        this.currentModalPlayer = null;
        this.currentModalSlot = null;
    },
    
    /**
     * Lock teams and move to execution
     */
    lockTeams() {
        const equipP1 = document.getElementById('equip-check-p1').checked;
        const equipP2 = document.getElementById('equip-check-p2').checked;
        
        if (!equipP1 || !equipP2) {
            if (!confirm('Equipment not verified for all players. Continue anyway?')) {
                return;
            }
        }
        
        this.match.currentStep = 5;
        this.showStep('step-execution');
        this.log(`Teams locked for Map ${this.match.currentMapIndex + 1}`);
    },
    
    /**
     * Submit match result
     */
    submitResult() {
        const p1TimeStr = document.getElementById('p1-time').value.trim();
        const p2TimeStr = document.getElementById('p2-time').value.trim();
        
        if (!p1TimeStr || !p2TimeStr) {
            alert('Please enter both player times');
            return;
        }
        
        const p1Time = this.parseTime(p1TimeStr);
        const p2Time = this.parseTime(p2TimeStr);
        
        if (p1Time === null || p2Time === null) {
            alert('Invalid time format. Use MM:SS.ms or SS.ms');
            return;
        }
        
        // Determine winner
        const diff = Math.abs(p1Time - p2Time);
        let winner = null;
        let isDraw = false;
        
        if (diff <= 3000) { // 3 seconds in milliseconds
            isDraw = true;
            this.log(`Map ${this.match.currentMapIndex + 1}: DRAW (${p1TimeStr} vs ${p2TimeStr}, diff: ${diff}ms)`);
        } else if (p1Time < p2Time) {
            winner = 'player1';
            this.match.scores.player1++;
            this.log(`Map ${this.match.currentMapIndex + 1}: ${this.match.player1.name} wins (${p1TimeStr} vs ${p2TimeStr})`);
        } else {
            winner = 'player2';
            this.match.scores.player2++;
            this.log(`Map ${this.match.currentMapIndex + 1}: ${this.match.player2.name} wins (${p1TimeStr} vs ${p2TimeStr})`);
        }
        
        // Store result
        this.match.mapResults.push({
            mapIndex: this.match.currentMapIndex,
            mapName: MapGenerator.getMap(this.match.currentMapIndex)?.name,
            p1Time,
            p2Time,
            p1TimeStr,
            p2TimeStr,
            winner,
            isDraw
        });
        
        this.updateMatchInfoBar();
        
        // Check for tie-breaker or next map
        const maxMaps = this.match.format === 'bo5' ? 5 : 3;
        const mapsNeededToWin = Math.floor(maxMaps / 2) + 1;
        
        if (this.match.scores.player1 >= mapsNeededToWin || this.match.scores.player2 >= mapsNeededToWin) {
            // Match ended
            this.endMatch();
        } else if (this.match.currentMapIndex < maxMaps - 1) {
            // Next map
            this.match.currentMapIndex++;
            this.match.currentStep = 4;
            this.updateTeamBuilderUI();
            this.showStep('step-teams');
            this.log(`Moving to Map ${this.match.currentMapIndex + 1}`);
        } else {
            // All maps played, check for tie
            if (this.match.scores.player1 === this.match.scores.player2) {
                // Tie-breaker
                this.startTieBreakerFlow();
            } else {
                this.endMatch();
            }
        }
    },
    
    /**
     * Parse time string to milliseconds
     */
    parseTime(timeStr) {
        // Support formats: MM:SS.ms, SS.ms, SS
        const parts = timeStr.split(':');
        let minutes = 0, seconds = 0, ms = 0;
        
        if (parts.length === 2) {
            minutes = parseInt(parts[0], 10);
            const secParts = parts[1].split('.');
            seconds = parseInt(secParts[0], 10);
            ms = secParts[1] ? parseInt(secParts[1].padEnd(3, '0').slice(0, 3), 10) : 0;
        } else {
            const secParts = parts[0].split('.');
            seconds = parseInt(secParts[0], 10);
            ms = secParts[1] ? parseInt(secParts[1].padEnd(3, '0').slice(0, 3), 10) : 0;
        }
        
        if (isNaN(minutes) || isNaN(seconds) || isNaN(ms)) {
            return null;
        }
        
        return (minutes * 60 + seconds) * 1000 + ms;
    },
    
    /**
     * Request restart
     */
    requestRestart(player) {
        const totalRestarts = ShopModule.getTotalRestarts(player);
        // TODO: Track used restarts per player
        alert(`${player} requested restart. Restarts available: ${totalRestarts}`);
    },
    
    /**
     * Start tie-breaker flow
     */
    startTieBreakerFlow() {
        this.match.isTieBreaker = true;
        this.match.tieBreakerMap = MapGenerator.generateTieBreakerMap();
        
        if (!this.match.tieBreakerMap) {
            alert('Error: No boss maps available for tie-breaker!');
            return;
        }
        
        this.showStep('step-tiebreaker');
        
        // Display tie-breaker map
        const mapContainer = document.getElementById('tiebreaker-map');
        mapContainer.innerHTML = `
            <h4>${this.match.tieBreakerMap.name}</h4>
            <p>Difficulty: ${this.match.tieBreakerMap.difficulty}</p>
        `;
        
        this.log('Tie-breaker required!');
    },
    
    /**
     * Start tie-breaker match
     */
    startTieBreaker() {
        this.match.currentStep = 4;
        this.match.currentMapIndex = -1; // Special index for tie-breaker
        
        this.showStep('step-teams');
        document.getElementById('current-team-map').textContent = 'TB';
        
        this.log('Tie-breaker team building started');
    },
    
    /**
     * End the match
     */
    endMatch() {
        this.match.endTime = new Date();
        this.match.currentStep = 7;
        
        this.showStep('step-summary');
        
        // Display final score
        const scoreEl = document.getElementById('final-score-display');
        scoreEl.textContent = `${this.match.scores.player1} - ${this.match.scores.player2}`;
        
        // Display match log
        const logEl = document.getElementById('match-log-list');
        logEl.innerHTML = this.match.log.map(entry => `<li>${entry}</li>`).join('');
        
        this.log(`Match ended. Final score: ${this.match.scores.player1} - ${this.match.scores.player2}`);
    },
    
    /**
     * Reset for new match
     */
    resetMatch() {
        if (!confirm('Start a new match? Current data will be lost unless exported.')) {
            return;
        }
        
        // Reset all modules
        ShopModule.reset();
        MapGenerator.reset();
        BansProtectionsModule.reset();
        
        // Reset UI
        document.getElementById('player1-name').value = '';
        document.getElementById('player2-name').value = '';
        document.getElementById('match-format').value = 'bo3';
        
        this.showStep('step-setup');
        this.updateMatchInfoBar(true);
        
        console.log('Reset complete');
    },
    
    /**
     * Hard reset (clear everything)
     */
    hardReset() {
        if (!confirm('HARD RESET: This will clear all data without export. Continue?')) {
            return;
        }
        
        location.reload();
    },
    
    /**
     * Export match data as JSON
     */
    exportData() {
        const exportData = {
            match: this.match,
            shopState: ShopModule.getState(),
            mapGeneratorState: MapGenerator.getState(),
            bansProtectionsState: BansProtectionsModule.getState(),
            exportedAt: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `ak-end-match-${this.match.player1.name}-vs-${this.match.player2.name}-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.log('Match data exported');
    },
    
    /**
     * Update match info bar
     */
    updateMatchInfoBar(reset = false) {
        const formatEl = document.getElementById('match-format-display');
        const scoreEl = document.getElementById('match-score-display');
        const mapEl = document.getElementById('current-map-display');
        
        if (reset) {
            formatEl.textContent = 'Format: --';
            scoreEl.textContent = 'Score: 0 - 0';
            mapEl.textContent = 'Map: --';
            return;
        }
        
        formatEl.textContent = `Format: ${this.match.format.toUpperCase()}`;
        scoreEl.textContent = `Score: ${this.match.scores.player1} - ${this.match.scores.player2}`;
        
        if (this.match.isTieBreaker) {
            mapEl.textContent = 'Map: TIE-BREAKER';
        } else if (this.match.currentMapIndex >= 0) {
            const map = MapGenerator.getMap(this.match.currentMapIndex);
            mapEl.textContent = `Map: ${map?.name || this.match.currentMapIndex + 1}`;
        }
    },
    
    /**
     * Show specific step section
     */
    showStep(stepId) {
        document.querySelectorAll('.step-section').forEach(el => {
            el.classList.remove('active');
            el.classList.add('hidden');
        });
        
        const target = document.getElementById(stepId);
        if (target) {
            target.classList.remove('hidden');
            target.classList.add('active');
        }
    },
    
    /**
     * Add entry to match log
     */
    log(message) {
        const timestamp = new Date().toLocaleTimeString();
        this.match.log.push(`[${timestamp}] ${message}`);
        console.log(`[${timestamp}] ${message}`);
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Make available globally
window.App = App;

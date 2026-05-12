/**
 * Bans & Protections Module
 * Manages the ban and protection phases with complex interaction rules
 */

const BansProtectionsModule = {
    protections: {
        player1: [], // Array of character IDs protected by player1
        player2: []  // Array of character IDs protected by player2
    },
    
    bans: {
        player1: [], // Array of character IDs banned by player1
        player2: []  // Array of character IDs banned by player2
    },
    
    // Available bans per player (includes free 6★ ban)
    availableBans: {
        player1: { total: 1, universal: 0, star4_5: 0, free6: 1 },
        player2: { total: 1, universal: 0, star4_5: 0, free6: 1 }
    },
    
    // Available protections per player
    availableProtections: {
        player1: { universal: 0, star5: 0 },
        player2: { universal: 0, star5: 0 }
    },
    
    /**
     * Initialize bans and protections based on shop inventory
     * @param {Object} shopState - State from ShopModule
     * @param {String} format - Match format
     */
    initialize(shopState, format) {
        this.protections = { player1: [], player2: [] };
        this.bans = { player1: [], player2: [] };
        
        // Set available protections from shop
        const p1Inv = shopState.player1.inventory;
        const p2Inv = shopState.player2.inventory;
        
        this.availableProtections.player1.universal = p1Inv.universalProtection || 0;
        this.availableProtections.player1.star5 = p1Inv.star5Protection || 0;
        this.availableProtections.player2.universal = p2Inv.universalProtection || 0;
        this.availableProtections.player2.star5 = p2Inv.star5Protection || 0;
        
        // Set available bans (start with free 6★ ban)
        this.availableBans.player1 = { total: 1, universal: 0, star4_5: 0, free6: 1 };
        this.availableBans.player2 = { total: 1, universal: 0, star4_5: 0, free6: 1 };
        
        // Add purchased bans
        if (p1Inv.universalBan) {
            this.availableBans.player1.universal = p1Inv.universalBan;
            this.availableBans.player1.total += p1Inv.universalBan;
        }
        if (p1Inv.star4_5Ban) {
            this.availableBans.player1.star4_5 = p1Inv.star4_5Ban;
            this.availableBans.player1.total += p1Inv.star4_5Ban;
        }
        if (p2Inv.universalBan) {
            this.availableBans.player2.universal = p2Inv.universalBan;
            this.availableBans.player2.total += p2Inv.universalBan;
        }
        if (p2Inv.star4_5Ban) {
            this.availableBans.player2.star4_5 = p2Inv.star4_5Ban;
            this.availableBans.player2.total += p2Inv.star4_5Ban;
        }
    },
    
    /**
     * Apply protection for a player
     * @param {String} player - 'player1' or 'player2'
     * @param {String} charId - Character ID to protect
     * @param {String} type - 'universal' or 'star5'
     * @returns {Boolean} - Success status
     */
    applyProtection(player, charId, type) {
        const char = DataLoader.getCharacterById(charId);
        if (!char) return false;
        
        // Check if protection type is available
        if (this.availableProtections[player][type] <= 0) {
            return false;
        }
        
        // Check if character already protected by this player
        if (this.protections[player].includes(charId)) {
            return false;
        }
        
        // Check rarity restriction for star5 protection
        if (type === 'star5' && char.rarity !== 5) {
            return false;
        }
        
        // Apply protection
        this.protections[player].push(charId);
        this.availableProtections[player][type]--;
        
        return true;
    },
    
    /**
     * Remove protection (only allowed before bans phase starts)
     * @param {String} player 
     * @param {String} charId 
     */
    removeProtection(player, charId) {
        const index = this.protections[player].indexOf(charId);
        if (index > -1) {
            this.protections[player].splice(index, 1);
            // Note: Protection resource is not refunded once used
        }
    },
    
    /**
     * Apply ban
     * @param {String} player - 'player1' or 'player2'
     * @param {String} charId - Character ID to ban
     * @param {String} banType - 'free6', 'universal', or 'star4_5'
     * @returns {Object} - { success: Boolean, message: String, removedProtection: Boolean }
     */
    applyBan(player, charId, banType = 'free6') {
        const char = DataLoader.getCharacterById(charId);
        if (!char) {
            return { success: false, message: 'Character not found' };
        }
        
        // Check if character is already banned by anyone
        if (this.bans.player1.includes(charId) || this.bans.player2.includes(charId)) {
            return { success: false, message: 'Character already banned' };
        }
        
        // Check if player has this ban type available
        if (this.availableBans[player][banType] <= 0) {
            return { success: false, message: 'No bans of this type available' };
        }
        
        // Check ban type restrictions
        if (banType === 'free6' && char.rarity !== 6) {
            return { success: false, message: 'Free ban can only target 6★ characters' };
        }
        
        if (banType === 'star4_5' && char.rarity !== 4 && char.rarity !== 5) {
            return { success: false, message: '4-5★ ban can only target 4★ or 5★ characters' };
        }
        
        let removedProtection = false;
        const opponent = player === 'player1' ? 'player2' : 'player1';
        
        // Check if character is protected by opponent
        if (this.protections[opponent].includes(charId)) {
            // Need 2 bans to ban a protected character
            // First ban removes protection, second ban actually bans
            
            // For simplicity in UI flow: we'll handle this as a two-step process
            // First click removes protection, second click applies ban
            return { 
                success: false, 
                message: 'Character is protected! Need to ban twice (first removes protection)',
                protected: true,
                protectedBy: opponent
            };
        }
        
        // Check if character is protected by the same player (self-ban scenario)
        if (this.protections[player].includes(charId)) {
            // Self-ban: protection is removed, character is NOT banned yet
            // This counts as using one ban action
            this.protections[player] = this.protections[player].filter(id => id !== charId);
            removedProtection = true;
            
            // The ban is still consumed but character is only banned for opponent
            // Actually per rules: "если игрок ... сам банит этого же персонажа, его защита немедленно снимается и данный персонаж является забаненым только для опонента"
            // So the character becomes banned only for opponent... but our system uses mutual bans
            // Interpretation: self-banning your own protected character = protection removed, no actual ban applied
            // But we consumed the ban action. Let's just remove protection and NOT add to bans.
            
            this.availableBans[player][banType]--;
            
            return { 
                success: true, 
                message: 'Protection removed (self-ban). Character still available to you.',
                removedProtection: true,
                selfBan: true
            };
        }
        
        // Apply the ban (mutual - affects both players)
        this.bans[player].push(charId);
        this.availableBans[player][banType]--;
        
        return { 
            success: true, 
            message: `Character ${char.name} banned for both players`,
            removedProtection: false
        };
    },
    
    /**
     * Check if a character is banned (for either player)
     * @param {String} charId 
     * @returns {Boolean}
     */
    isBanned(charId) {
        return this.bans.player1.includes(charId) || this.bans.player2.includes(charId);
    },
    
    /**
     * Check if a character is protected
     * @param {String} charId 
     * @returns {Object} - { protected: Boolean, by: Array of players }
     */
    isProtected(charId) {
        const protectedBy = [];
        if (this.protections.player1.includes(charId)) protectedBy.push('player1');
        if (this.protections.player2.includes(charId)) protectedBy.push('player2');
        
        return {
            protected: protectedBy.length > 0,
            by: protectedBy
        };
    },
    
    /**
     * Get all banned characters
     * @returns {Array} - Array of character objects
     */
    getBannedCharacters() {
        const allBannedIds = [...new Set([...this.bans.player1, ...this.bans.player2])];
        return allBannedIds.map(id => DataLoader.getCharacterById(id)).filter(c => c);
    },
    
    /**
     * Get remaining bans for a player
     * @param {String} player 
     * @returns {Object}
     */
    getRemainingBans(player) {
        return { ...this.availableBans[player] };
    },
    
    /**
     * Render character grid for bans/protections
     * @param {String} containerId 
     * @param {String} mode - 'protection' or 'ban'
     * @param {String} currentPlayer - 'player1' or 'player2'
     */
    renderCharacterGrid(containerId, mode, currentPlayer) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = '';
        
        DataLoader.characters.forEach(char => {
            const charEl = document.createElement('div');
            charEl.className = `char-card rarity-${char.rarity}`;
            
            const protectionStatus = this.isProtected(char.id);
            const isBanned = this.isBanned(char.id);
            
            if (isBanned) {
                charEl.classList.add('banned');
            }
            if (protectionStatus.protected) {
                charEl.classList.add('protected');
            }
            
            let tooltip = `${char.name}\nRarity: ${char.rarity}★\nRole: ${char.role}`;
            
            if (mode === 'protection') {
                // Show protection availability
                const canProtectUniversal = this.availableProtections[currentPlayer].universal > 0;
                const canProtectStar5 = this.availableProtections[currentPlayer].star5 > 0;
                const alreadyProtected = this.protections[currentPlayer].includes(char.id);
                
                if (alreadyProtected) {
                    tooltip += '\n[Already Protected]';
                    charEl.style.opacity = '0.5';
                } else if (char.rarity === 5 && !canProtectStar5 && !canProtectUniversal) {
                    charEl.style.opacity = '0.3';
                    tooltip += '\n[No Protections Available]';
                } else if (char.rarity !== 5 && !canProtectUniversal) {
                    charEl.style.opacity = '0.3';
                    tooltip += '\n[No Universal Protection Available]';
                }
            } else if (mode === 'ban') {
                const bansLeft = this.availableBans[currentPlayer];
                if (isBanned) {
                    tooltip += '\n[Already Banned]';
                } else {
                    tooltip += `\n[Bans: Free6:${bansLeft.free6} Univ:${bansLeft.universal} 4-5★:${bansLeft.star4_5}]`;
                }
            }
            
            charEl.title = tooltip;
            charEl.innerHTML = `
                <div style="font-size:1.5rem;">${char.rarity === 6 ? '🔶' : char.rarity === 5 ? '🟣' : char.rarity === 4 ? '🔷' : '⚪'}</div>
                <div class="char-name">${char.name}</div>
            `;
            
            charEl.onclick = () => {
                if (mode === 'protection') {
                    this.handleProtectionClick(currentPlayer, char.id, char.rarity);
                } else {
                    this.handleBanClick(currentPlayer, char.id, char.rarity);
                }
            };
            
            container.appendChild(charEl);
        });
    },
    
    handleProtectionClick(player, charId, rarity) {
        // Try universal first, then star5
        let type = null;
        if (this.availableProtections[player].universal > 0) {
            type = 'universal';
        } else if (rarity === 5 && this.availableProtections[player].star5 > 0) {
            type = 'star5';
        }
        
        if (!type) {
            alert('No protections available!');
            return;
        }
        
        if (this.applyProtection(player, charId, type)) {
            this.renderCharacterGrid('ban-character-grid', 'protection', player);
            this.updateProtectionUI();
        }
    },
    
    handleBanClick(player, charId, rarity) {
        // Determine ban type priority
        let banType = null;
        
        if (rarity === 6 && this.availableBans[player].free6 > 0) {
            banType = 'free6';
        } else if ((rarity === 4 || rarity === 5) && this.availableBans[player].star4_5 > 0) {
            banType = 'star4_5';
        } else if (this.availableBans[player].universal > 0) {
            banType = 'universal';
        } else if (rarity === 6 && this.availableBans[player].universal > 0) {
            banType = 'universal';
        }
        
        if (!banType) {
            alert('No bans available!');
            return;
        }
        
        const result = this.applyBan(player, charId, banType);
        
        if (result.success || result.selfBan) {
            this.renderCharacterGrid('ban-character-grid', 'ban', player);
            this.updateBansUI();
            this.updateBannedList();
        }
        
        alert(result.message);
    },
    
    updateProtectionUI() {
        // Update protection slots display
        ['player1', 'player2'].forEach(player => {
            const container = document.querySelector(`#${player === 'player1' ? 'prot-player1' : 'prot-player2'} .protection-slots`);
            if (!container) return;
            
            container.innerHTML = '';
            this.protections[player].forEach(charId => {
                const char = DataLoader.getCharacterById(charId);
                const slot = document.createElement('div');
                slot.className = 'protection-slot filled';
                slot.innerHTML = `
                    <div style="text-align:center;font-size:0.7rem;">${char?.name || 'Unknown'}</div>
                `;
                container.appendChild(slot);
            });
        });
    },
    
    updateBansUI() {
        ['player1', 'player2'].forEach(player => {
            const el = document.getElementById(`${player === 'player1' ? 'p1' : 'p2'}-bans-left`);
            if (el) {
                const bans = this.availableBans[player];
                el.textContent = `${player === 'player1' ? 'Player 1' : 'Player 2'} Bans Left: ${bans.total} (Free6:${bans.free6}, Univ:${bans.universal}, 4-5★:${bans.star4_5})`;
            }
        });
    },
    
    updateBannedList() {
        const list = document.getElementById('banned-characters');
        if (!list) return;
        
        const banned = this.getBannedCharacters();
        list.innerHTML = banned.map(char => `<li>${char.name} (${char.rarity}★)</li>`).join('');
    },
    
    getState() {
        return {
            protections: JSON.parse(JSON.stringify(this.protections)),
            bans: JSON.parse(JSON.stringify(this.bans)),
            availableBans: JSON.parse(JSON.stringify(this.availableBans)),
            availableProtections: JSON.parse(JSON.stringify(this.availableProtections))
        };
    },
    
    reset() {
        this.protections = { player1: [], player2: [] };
        this.bans = { player1: [], player2: [] };
        this.availableBans = {
            player1: { total: 1, universal: 0, star4_5: 0, free6: 1 },
            player2: { total: 1, universal: 0, star4_5: 0, free6: 1 }
        };
        this.availableProtections = {
            player1: { universal: 0, star5: 0 },
            player2: { universal: 0, star5: 0 }
        };
    }
};

window.BansProtectionsModule = BansProtectionsModule;

/**
 * Shop Module
 * Manages the shop phase where players buy resources with starting coins
 */

const ShopModule = {
    players: {
        player1: { coins: 0, inventory: {} },
        player2: { coins: 0, inventory: {} }
    },
    
    // Shop configuration based on format
    shopConfig: {
        group: {
            startCoins: 8,
            items: {
                universalResurrection: { price: 4.0, max: 2, name: 'Universal Resurrection' },
                star5Resurrection: { price: 3.0, max: 2, name: '5★ Resurrection' },
                star4Resurrection: { price: 0.0, max: Infinity, name: '4★ Resurrection (Free)' },
                universalProtection: { price: 6.0, max: 1, name: 'Universal Protection' },
                star5Protection: { price: 2.0, max: Infinity, name: '5★ Protection' },
                universalBan: { price: 5.0, max: 1, name: 'Universal Ban' },
                star4_5Ban: { price: 4.0, max: 1, name: '4-5★ Ban' },
                extraRestart: { price: 1.0, max: 2, name: 'Extra Restart' }
            }
        },
        bo3: {
            startCoins: 12,
            items: {
                universalResurrection: { price: 3.0, max: 3, name: 'Universal Resurrection' },
                star5Resurrection: { price: 2.0, max: 3, name: '5★ Resurrection' },
                star4Resurrection: { price: 0.0, max: Infinity, name: '4★ Resurrection (Free)' },
                universalProtection: { price: 7.0, max: 1, name: 'Universal Protection' },
                star5Protection: { price: 2.0, max: Infinity, name: '5★ Protection' },
                universalBan: { price: 4.0, max: Infinity, name: 'Universal Ban' },
                star4_5Ban: { price: 3.0, max: 2, name: '4-5★ Ban' },
                extraRestart: { price: 1.0, max: 2, name: 'Extra Restart' },
                startRestart: { price: 0.0, max: 1, name: 'Starting Restart (Free)' }
            }
        },
        bo5: {
            startCoins: 16,
            items: {
                universalResurrection: { price: 3.0, max: 2, name: 'Universal Resurrection' },
                star5Resurrection: { price: 2.0, max: 4, name: '5★ Resurrection' },
                star4Resurrection: { price: 0.0, max: Infinity, name: '4★ Resurrection (Free)' },
                universalProtection: { price: 6.0, max: 1, name: 'Universal Protection' },
                star5Protection: { price: 2.0, max: Infinity, name: '5★ Protection' },
                universalBan: { price: 4.0, max: Infinity, name: 'Universal Ban' },
                star4_5Ban: { price: 3.0, max: Infinity, name: '4-5★ Ban' },
                extraRestart: { price: 1.0, max: 2, name: 'Extra Restart' }
            }
        }
    },
    
    initialize(format) {
        const config = this.shopConfig[format];
        this.players.player1.coins = config.startCoins;
        this.players.player2.coins = config.startCoins;
        this.players.player1.inventory = {};
        this.players.player2.inventory = {};
        
        // Initialize inventory counts
        for (const [key, item] of Object.entries(config.items)) {
            this.players.player1.inventory[key] = 0;
            this.players.player2.inventory[key] = 0;
        }
        
        return config;
    },
    
    buyItem(player, itemKey, config) {
        const item = config.items[itemKey];
        const playerData = this.players[player];
        
        if (!item) return false;
        
        // Check if item is available
        if (playerData.inventory[itemKey] >= item.max) {
            return false;
        }
        
        // Check if player has enough coins (free items always allowed)
        if (item.price > 0 && playerData.coins < item.price) {
            return false;
        }
        
        // Deduct coins and add item
        playerData.coins -= item.price;
        playerData.inventory[itemKey]++;
        
        return true;
    },
    
    sellItem(player, itemKey, config) {
        const item = config.items[itemKey];
        const playerData = this.players[player];
        
        if (!item || playerData.inventory[itemKey] <= 0) {
            return false;
        }
        
        // Refund coins and remove item
        playerData.coins += item.price;
        playerData.inventory[itemKey]--;
        
        return true;
    },
    
    getInventory(player) {
        return this.players[player].inventory;
    },
    
    getCoins(player) {
        return this.players[player].coins;
    },
    
    // Get total resurrections available
    getTotalResurrections(player) {
        const inv = this.players[player].inventory;
        return (inv.universalResurrection || 0) + 
               (inv.star5Resurrection || 0) + 
               (inv.star4Resurrection || 0);
    },
    
    // Get total restarts available
    getTotalRestarts(player) {
        const inv = this.players[player].inventory;
        return (inv.extraRestart || 0) + (inv.startRestart || 0);
    },
    
    // Render shop UI for a player
    renderShop(playerId, containerId, format) {
        const container = document.getElementById(containerId);
        const config = this.shopConfig[format];
        const playerData = this.players[playerId];
        
        // Update coin display
        const coinDisplay = container.querySelector('.coin-display span');
        if (coinDisplay) {
            coinDisplay.textContent = playerData.coins;
        }
        
        // Render items
        const itemsContainer = container.querySelector('.shop-items');
        if (!itemsContainer) return;
        
        itemsContainer.innerHTML = '';
        
        for (const [key, item] of Object.entries(config.items)) {
            const count = playerData.inventory[key] || 0;
            const canBuy = item.price === 0 || playerData.coins >= item.price;
            const atMax = count >= item.max;
            
            const itemEl = document.createElement('div');
            itemEl.className = 'shop-item';
            itemEl.innerHTML = `
                <div class="shop-item-info">
                    <h4>${item.name}</h4>
                    <p>Price: ${item.price === 0 ? 'FREE' : item.price} | Owned: ${count}/${item.max === Infinity ? '∞' : item.max}</p>
                </div>
                <div class="shop-item-controls">
                    <button onclick="ShopModule.decreaseItem('${playerId}', '${key}', '${format}')">-</button>
                    <span>${count}</span>
                    <button onclick="ShopModule.increaseItem('${playerId}', '${key}', '${format}')" 
                            ${(!canBuy || atMax) ? 'disabled' : ''}>+</button>
                </div>
            `;
            itemsContainer.appendChild(itemEl);
        }
    },
    
    increaseItem(player, itemKey, format) {
        const config = this.shopConfig[format];
        if (this.buyItem(player, itemKey, config)) {
            this.renderShop(player === 'player1' ? 'shop-player1' : 'shop-player2', 
                           player === 'player1' ? 'shop-player1' : 'shop-player2', format);
            this.renderShop(player === 'player1' ? 'shop-player2' : 'shop-player1',
                           player === 'player1' ? 'shop-player2' : 'shop-player1', format);
        }
    },
    
    decreaseItem(player, itemKey, format) {
        const config = this.shopConfig[format];
        if (this.sellItem(player, itemKey, config)) {
            this.renderShop(player === 'player1' ? 'shop-player1' : 'shop-player2',
                           player === 'player1' ? 'shop-player1' : 'shop-player2', format);
            this.renderShop(player === 'player1' ? 'shop-player2' : 'shop-player1',
                           player === 'player1' ? 'shop-player2' : 'shop-player1', format);
        }
    },
    
    getState() {
        return JSON.parse(JSON.stringify(this.players));
    },
    
    reset() {
        this.players = {
            player1: { coins: 0, inventory: {} },
            player2: { coins: 0, inventory: {} }
        };
    }
};

window.ShopModule = ShopModule;

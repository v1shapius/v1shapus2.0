/**
 * Data Loader Module
 * Loads JSON data files and provides access to characters, weapons, and maps
 */

const DataLoader = {
    characters: [],
    weapons: [],
    maps: [],
    
    async loadAll() {
        try {
            await Promise.all([
                this.loadCharacters(),
                this.loadWeapons(),
                this.loadMaps()
            ]);
            console.log('All data loaded successfully');
            return true;
        } catch (error) {
            console.error('Error loading data:', error);
            return false;
        }
    },
    
    async loadCharacters() {
        try {
            const response = await fetch('data/characters.json');
            const data = await response.json();
            this.characters = data.characters;
            console.log(`Loaded ${this.characters.length} characters`);
        } catch (error) {
            console.error('Error loading characters:', error);
            throw error;
        }
    },
    
    async loadWeapons() {
        try {
            const response = await fetch('data/weapons.json');
            const data = await response.json();
            this.weapons = data.weapons;
            console.log(`Loaded ${this.weapons.length} weapons`);
        } catch (error) {
            console.error('Error loading weapons:', error);
            throw error;
        }
    },
    
    async loadMaps() {
        try {
            const response = await fetch('data/maps.json');
            const data = await response.json();
            this.maps = data.maps;
            console.log(`Loaded ${this.maps.length} maps`);
        } catch (error) {
            console.error('Error loading maps:', error);
            throw error;
        }
    },
    
    getCharacterById(id) {
        return this.characters.find(c => c.id === id);
    },
    
    getWeaponById(id) {
        return this.weapons.find(w => w.id === id);
    },
    
    getMapById(id) {
        return this.maps.find(m => m.id === id);
    },
    
    searchCharacters(query) {
        const lowerQuery = query.toLowerCase();
        return this.characters.filter(c => 
            c.name.toLowerCase().includes(lowerQuery)
        );
    },
    
    // Get characters by rarity
    getCharactersByRarity(rarity) {
        return this.characters.filter(c => c.rarity === rarity);
    },
    
    // Get boss maps for tie-breaker
    getBossMaps() {
        return this.maps.filter(m => m.hasBoss);
    }
};

// Make available globally
window.DataLoader = DataLoader;

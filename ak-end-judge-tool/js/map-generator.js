/**
 * Map Generator Module
 * Implements controlled random map selection with tag weight system
 */

const MapGenerator = {
    selectedMaps: [],
    
    /**
     * Generate a set of maps with controlled randomness
     * Rules: Total weight of any single tag across all maps must not exceed 1.0
     * @param {number} count - Number of maps to generate (3 for Bo3, 5 for Bo5)
     * @returns {Array} - Array of selected map objects
     */
    generateMaps(count) {
        const allMaps = [...DataLoader.maps];
        this.selectedMaps = [];
        const usedTagWeights = {}; // Track cumulative weight per tag
        
        // Initialize tag weights
        DataLoader.maps.forEach(map => {
            map.tags.forEach(tag => {
                if (!usedTagWeights[tag.name]) {
                    usedTagWeights[tag.name] = 0;
                }
            });
        });
        
        for (let i = 0; i < count; i++) {
            // Filter available maps
            const availableMaps = allMaps.filter(map => {
                // Skip already selected maps
                if (this.selectedMaps.find(m => m.id === map.id)) {
                    return false;
                }
                
                // Check if adding this map would exceed tag weight limit
                for (const tag of map.tags) {
                    const currentWeight = usedTagWeights[tag.name] || 0;
                    if (currentWeight + tag.weight > 1.0) {
                        return false;
                    }
                }
                
                return true;
            });
            
            if (availableMaps.length === 0) {
                console.warn(`No available maps for slot ${i + 1}. Resetting constraints.`);
                // If no maps available, relax constraints and pick from remaining
                const remainingMaps = allMaps.filter(map => 
                    !this.selectedMaps.find(m => m.id === map.id)
                );
                if (remainingMaps.length === 0) {
                    console.error('No maps left at all!');
                    break;
                }
                const randomIndex = Math.floor(Math.random() * remainingMaps.length);
                const selectedMap = remainingMaps[randomIndex];
                this.selectedMaps.push(selectedMap);
                
                // Update tag weights (even if over 1.0 as fallback)
                selectedMap.tags.forEach(tag => {
                    usedTagWeights[tag.name] = (usedTagWeights[tag.name] || 0) + tag.weight;
                });
            } else {
                // Random selection from available maps
                const randomIndex = Math.floor(Math.random() * availableMaps.length);
                const selectedMap = availableMaps[randomIndex];
                this.selectedMaps.push(selectedMap);
                
                // Update tag weights
                selectedMap.tags.forEach(tag => {
                    usedTagWeights[tag.name] = (usedTagWeights[tag.name] || 0) + tag.weight;
                });
            }
        }
        
        return this.selectedMaps;
    },
    
    /**
     * Generate a single boss map for tie-breaker
     * @returns {Object|null} - Random boss map or null if none available
     */
    generateTieBreakerMap() {
        const bossMaps = DataLoader.getBossMaps();
        if (bossMaps.length === 0) {
            return null;
        }
        
        const randomIndex = Math.floor(Math.random() * bossMaps.length);
        return bossMaps[randomIndex];
    },
    
    /**
     * Render the selected maps to the UI
     */
    renderMaps(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = '';
        
        this.selectedMaps.forEach((map, index) => {
            const mapEl = document.createElement('div');
            mapEl.className = 'map-card';
            
            const tagsHtml = map.tags.map(tag => 
                `<span class="tag">${tag.name} (${tag.weight})</span>`
            ).join('');
            
            mapEl.innerHTML = `
                <h4>${index + 1}. ${map.name}</h4>
                <p>Difficulty: ${map.difficulty}</p>
                <p>${map.hasBoss ? '👹 Has Boss' : '⚔️ Standard'}</p>
                <div class="map-tags">${tagsHtml}</div>
            `;
            
            container.appendChild(mapEl);
        });
    },
    
    /**
     * Get the current map by index
     * @param {number} index - Map index (0-based)
     * @returns {Object|null}
     */
    getMap(index) {
        return this.selectedMaps[index] || null;
    },
    
    /**
     * Get total count of selected maps
     * @returns {number}
     */
    getCount() {
        return this.selectedMaps.length;
    },
    
    /**
     * Reset the generator
     */
    reset() {
        this.selectedMaps = [];
    },
    
    /**
     * Get current state for export
     * @returns {Object}
     */
    getState() {
        return {
            selectedMaps: this.selectedMaps,
            tagWeights: this.calculateCurrentTagWeights()
        };
    },
    
    /**
     * Calculate current tag weights for display/debugging
     * @returns {Object}
     */
    calculateCurrentTagWeights() {
        const weights = {};
        this.selectedMaps.forEach(map => {
            map.tags.forEach(tag => {
                weights[tag.name] = (weights[tag.name] || 0) + tag.weight;
            });
        });
        return weights;
    }
};

window.MapGenerator = MapGenerator;

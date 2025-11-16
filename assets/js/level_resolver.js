// levelResolver.js - Converts ObjectIds to level numbers
// Add this file to your project

class LevelResolver {
    constructor() {
        this.levelCache = new Map();
        this.initialized = false;
    }

    /**
     * Initialize the level cache by fetching all levels from the database
     */
    async initialize() {
        if (this.initialized) return;
        
        try {
            // Fetch all levels from your API
            const response = await fetch(`${window.API_URL}/levels`);
            const data = await response.json();
            
            if (data.levels) {
                data.levels.forEach(level => {
                    // Map ObjectId to level_num
                    this.levelCache.set(level._id.toString(), level.level_num);
                });
                
                this.initialized = true;
                console.log('✅ Level cache initialized with', this.levelCache.size, 'levels');
            }
        } catch (error) {
            console.error('❌ Failed to initialize level cache:', error);
        }
    }

    /**
     * Convert ObjectId to level number
     * @param {string|Object} levelId - ObjectId as string or object
     * @returns {number|null} Level number (3-8) or null if not found
     */
    resolve(levelId) {
        if (!levelId) return null;
        
        // Convert ObjectId to string if needed
        const idString = typeof levelId === 'object' ? levelId.toString() : levelId;
        
        return this.levelCache.get(idString) || null;
    }

    /**
     * Format level for display
     * @param {string|Object} levelId - ObjectId
     * @returns {string} Formatted level string (e.g., "Level 5") or "Not specified"
     */
    formatLevel(levelId) {
        const levelNum = this.resolve(levelId);
        return levelNum ? `Level ${levelNum}` : 'Not specified';
    }

    /**
     * Get level number for a given ObjectId
     * @param {string} objectId - The ObjectId string
     * @returns {number|null} Level number or null
     */
    getLevelNumber(objectId) {
        return this.resolve(objectId);
    }

    /**
     * Clear the cache (useful for testing or manual refresh)
     */
    clearCache() {
        this.levelCache.clear();
        this.initialized = false;
    }
}

// Create global instance
window.levelResolver = new LevelResolver();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.levelResolver.initialize();
    });
} else {
    window.levelResolver.initialize();
}

console.log('✅ LevelResolver loaded');

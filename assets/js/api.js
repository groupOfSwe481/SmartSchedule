// frontend/js/utils/api.js - COMPLETE VERSION
// Auto-detect API URL based on environment
const API_URL = (window.location.hostname === 'localhost' ||
                 window.location.hostname === '127.0.0.1' ||
                 window.location.hostname === '')
  ? 'http://localhost:4000/api'  // Local development (or file:// protocol)
  : '/api';  // Production (Vercel and other hosted environments)

// ✅ Make API_URL globally available for other files
window.API_URL = API_URL;
console.log('🔗 API_URL:', API_URL);

class APIClient {
    static async call(endpoint, options = {}) {
        try {
            const url = `${API_URL}${endpoint}`;
            console.log(`📡 API Call: ${options.method || 'GET'} ${url}`);
            
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            console.log('✅ API Success:', endpoint);
            return data;
        } catch (error) {
            console.error('❌ API Error:', endpoint, error.message);
            throw error;
        }
    }

    static async get(endpoint) {
        return this.call(endpoint, { method: 'GET' });
    }

    static async post(endpoint, body) {
        return this.call(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }

    static async put(endpoint, body) {
        return this.call(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    }

    static async delete(endpoint) {
        return this.call(endpoint, { method: 'DELETE' });
    }
}

window.APIClient = APIClient;
console.log('✅ APIClient loaded from external file');

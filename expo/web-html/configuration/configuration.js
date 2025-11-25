// Configuration - Specific functionality for configuration page
class ConfigurationService {
    constructor() {
        this.supabaseUrl = CONFIG.SUPABASE_URL;
        this.supabaseKey = CONFIG.SUPABASE_ANON_KEY;
        this.currentConfig = null;
    }

    async init() {
        console.log('⚙️ Initializing Configuration Service...');
        await this.loadData();
    }

    // Load data for the page
    async loadData() {
        try {
            console.log('⚙️ Loading configuration data...');
            
            // Load all rides for statistics
            const ridesResponse = await fetch(`${this.supabaseUrl}/rest/v1/ride_requests?select=*&order=created_at.desc`, {
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (ridesResponse.ok) {
                const allRides = await ridesResponse.json();
                this.updateStats(allRides);
            }

            // Load current pricing configuration
            await this.loadPricingConfig();

            // Hide loading screen
            document.getElementById('loadingScreen').style.display = 'none';
            document.getElementById('mainContent').style.display = 'block';

            console.log('✅ Configuration data loaded');
        } catch (error) {
            console.error('❌ Error loading configuration data:', error);
            showError('Error loading data: ' + error.message);
        }
    }

    // Update statistics
    updateStats(allRides) {
        const totalRides = allRides.length;
        const activeRides = allRides.filter(ride => ride.status === 'accepted' || ride.status === 'in_progress').length;
        const completedRides = allRides.filter(ride => ride.status === 'completed').length;
        const cancelledRides = allRides.filter(ride => ride.status === 'cancelled').length;

        document.getElementById('totalRidesCount').textContent = totalRides;
        document.getElementById('activeRidesCount').textContent = activeRides;
        document.getElementById('completedRidesCount').textContent = completedRides;
        document.getElementById('cancelledRidesCount').textContent = cancelledRides;
    }

    // Load current pricing configuration
    async loadPricingConfig() {
        try {
            // Get current market pricing from localStorage or use defaults
            const currentMarket = localStorage.getItem('selectedMarket') || 'default';
            const marketPricing = this.getMarketPricing();
            this.currentConfig = marketPricing[currentMarket] || marketPricing['default'];
            
            console.log('💰 Current pricing config loaded:', this.currentConfig);
        } catch (error) {
            console.error('❌ Error loading pricing config:', error);
            // Use default configuration
            this.currentConfig = {
                basePrice: 2.00,
                includedKm: 3,
                pricePerExtraKm: 0.50,
                minimumFare: 2.00
            };
        }
    }

    // Get market pricing configuration
    getMarketPricing() {
        return {
            // El Salvador (San Salvador)
            'SV': {
                name: 'El Salvador',
                currency: 'USD',
                basePrice: 2.00,
                includedKm: 3,
                pricePerExtraKm: 0.50,
                minimumFare: 2.00,
                description: 'Tarifa estándar para El Salvador'
            },
            // Estados Unidos (Nueva York)
            'US-NY': {
                name: 'Nueva York',
                currency: 'USD',
                basePrice: 3.50,
                includedKm: 2,
                pricePerExtraKm: 1.20,
                minimumFare: 4.00,
                description: 'Tarifa estándar para Nueva York'
            },
            // México (Ciudad de México)
            'MX': {
                name: 'México',
                currency: 'MXN',
                basePrice: 50.00,
                includedKm: 3,
                pricePerExtraKm: 15.00,
                minimumFare: 50.00,
                description: 'Tarifa estándar para México'
            },
            // España (Madrid)
            'ES': {
                name: 'España',
                currency: 'EUR',
                basePrice: 2.50,
                includedKm: 2.5,
                pricePerExtraKm: 0.80,
                minimumFare: 3.00,
                description: 'Tarifa estándar para España'
            },
            // Configuración por defecto
            'default': {
                name: 'Configuración por defecto',
                currency: 'USD',
                basePrice: 2.00,
                includedKm: 3,
                pricePerExtraKm: 0.50,
                minimumFare: 2.00,
                description: 'Tarifa estándar'
            }
        };
    }

    // Open pricing configuration modal
    openPricingConfig() {
        // Populate form with current values
        document.getElementById('basePrice').value = this.currentConfig.basePrice;
        document.getElementById('includedKm').value = this.currentConfig.includedKm;
        document.getElementById('pricePerExtraKm').value = this.currentConfig.pricePerExtraKm;
        document.getElementById('minimumFare').value = this.currentConfig.minimumFare;
        
        document.getElementById('pricingConfigModal').style.display = 'flex';
    }

    // Close pricing configuration modal
    closePricingConfig() {
        document.getElementById('pricingConfigModal').style.display = 'none';
    }

    // Save pricing configuration
    async savePricingConfig() {
        try {
            const basePrice = parseFloat(document.getElementById('basePrice').value);
            const includedKm = parseFloat(document.getElementById('includedKm').value);
            const pricePerExtraKm = parseFloat(document.getElementById('pricePerExtraKm').value);
            const minimumFare = parseFloat(document.getElementById('minimumFare').value);

            // Validate inputs
            if (isNaN(basePrice) || isNaN(includedKm) || isNaN(pricePerExtraKm) || isNaN(minimumFare)) {
                showError('Por favor ingresa valores numéricos válidos');
                return;
            }

            if (basePrice < 0 || includedKm < 0 || pricePerExtraKm < 0 || minimumFare < 0) {
                showError('Los valores no pueden ser negativos');
                return;
            }

            // Update current configuration
            this.currentConfig = {
                ...this.currentConfig,
                basePrice,
                includedKm,
                pricePerExtraKm,
                minimumFare
            };

            // Save to localStorage for now (in a real app, this would go to a database)
            const currentMarket = localStorage.getItem('selectedMarket') || 'default';
            const marketPricing = this.getMarketPricing();
            marketPricing[currentMarket] = this.currentConfig;
            
            // Store updated configuration
            localStorage.setItem('marketPricing', JSON.stringify(marketPricing));

            this.closePricingConfig();
            showSuccess('Configuración de precios guardada exitosamente');

            console.log('💰 Pricing config saved:', this.currentConfig);
        } catch (error) {
            console.error('❌ Error saving pricing config:', error);
            showError('Error saving configuration: ' + error.message);
        }
    }

    // Open user configuration (placeholder)
    openUserConfig() {
        showError('Configuración de usuarios no implementada aún');
    }

    // Open notification configuration (placeholder)
    openNotificationConfig() {
        showError('Configuración de notificaciones no implementada aún');
    }

    // Open security configuration (placeholder)
    openSecurityConfig() {
        showError('Configuración de seguridad no implementada aún');
    }

    // Get current pricing configuration
    getCurrentPricingConfig() {
        return this.currentConfig;
    }

    // Calculate price based on distance using current configuration
    calculatePrice(distance) {
        if (!this.currentConfig) {
            return 0;
        }

        let calculatedPrice;
        if (distance <= this.currentConfig.includedKm) {
            // Si la distancia está dentro del rango incluido, solo cobrar tarifa base
            calculatedPrice = this.currentConfig.basePrice;
        } else {
            // Si es más distancia, cobrar tarifa base + km adicionales
            const extraKm = distance - this.currentConfig.includedKm;
            calculatedPrice = this.currentConfig.basePrice + (extraKm * this.currentConfig.pricePerExtraKm);
        }

        // Aplicar tarifa mínima si es necesario
        if (calculatedPrice < this.currentConfig.minimumFare) {
            calculatedPrice = this.currentConfig.minimumFare;
        }

        return calculatedPrice;
    }
}

// Global instance
let configurationService;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async () => {
    console.log('⚙️ Configuration page loading...');
    configurationService = new ConfigurationService();
    await configurationService.init();
});

// Global functions for HTML onclick events
function goBack() {
    console.log('🔙 Going back...');
    // Usar history.back() para navegación sin recarga
    if (window.history.length > 1) {
        window.history.back();
    } else {
        // Fallback si no hay historial
        window.location.href = '../../home/home.html';
    }
}

function loadData() {
    if (configurationService) {
        configurationService.loadData();
    }
}

function navigateToRideManagement() {
    console.log('🚗 Navigating to ride management...');
    window.location.href = '../ride-management/ride-management.html';
}

// Utility functions
function showSuccess(message) {
    console.log('✅ Success:', message);
    alert(message); // Replace with proper notification
}

function showError(message) {
    console.error('❌ Error:', message);
    alert('Error: ' + message); // Replace with proper notification
}

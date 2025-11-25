// Create Ride - Specific functionality for ride creation
class CreateRideService {
    constructor() {
        this.supabaseUrl = CONFIG.SUPABASE_URL;
        this.supabaseKey = CONFIG.SUPABASE_ANON_KEY;
        this.availableDrivers = [];
    }

    async init() {
        console.log('🚗 Initializing Create Ride Service...');
        await this.loadDrivers();
        this.initializeMap();
        this.setupEventListeners();
        await this.loadData();
    }

    // Load available drivers for assignment
    async loadDrivers() {
        try {
            console.log('👥 Loading available drivers...');
            
            // Load drivers directly from Supabase
            const response = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/users?role=eq.driver&is_active=eq.true&select=id,display_name,email,phone_number&order=display_name.asc`, {
                headers: {
                    'apikey': CONFIG.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`
                }
            });
            
            if (response.ok) {
                const drivers = await response.json();
                console.log(`✅ ${drivers.length} drivers loaded from Supabase`);
                
                const driverSelect = document.getElementById('rideUser');
                if (driverSelect) {
                    // Clear existing options except the first one
                    driverSelect.innerHTML = '<option value="">Unassigned (remains pending)</option>';
                    
                    drivers.forEach(driver => {
                        const option = document.createElement('option');
                        option.value = driver.id;
                        option.textContent = driver.display_name || driver.email || `Driver ${driver.id}`;
                        driverSelect.appendChild(option);
                        
                        console.log(`✅ Driver agregado al select:`, {
                            'driver.id': driver.id,
                            'driver.display_name': driver.display_name,
                            'driver.email': driver.email,
                            'texto mostrado': option.textContent
                        });
                    });
                }
                
                return drivers;
            } else {
                console.error('❌ Error loading drivers:', response.status);
                return [];
            }
        } catch (error) {
            console.error('❌ Error loading drivers:', error);
            showError('Error loading drivers: ' + error.message);
            return [];
        }
    }

    // Initialize map for route selection
    initializeMap() {
        try {
            console.log('🗺️ Initializing map...');
            
            // Map initialization is now handled by maps.js
            // The map will be initialized when the modal opens
            console.log('✅ Map initialization delegated to maps.js');
        } catch (error) {
            console.error('❌ Error initializing map:', error);
            showError('Error initializing map: ' + error.message);
        }
    }

    // Setup event listeners
    setupEventListeners() {
        // Map events are now handled by maps.js
        // Form validation
        const form = document.getElementById('createRideForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createRide();
            });
        }
    }

    // Handle map clicks for address selection
    handleMapClick(e) {
        // This function is now handled by maps.js
        console.log('🗺️ Map click handled by maps.js');
    }

    // Set address from coordinates using reverse geocoding
    async setAddressFromCoordinates(lat, lng, inputElement, type) {
        // This function is now handled by maps.js
        console.log(`🔍 Reverse geocoding for ${type} handled by maps.js`);
    }

    // Add marker to map
    addMarkerToMap(lat, lng, type, address) {
        // This function is now handled by maps.js
        console.log(`📍 Adding marker for ${type} handled by maps.js`);
    }

    // Calculate route between origin and destination
    async calculateRoute() {
        // This function is now handled by maps.js
        console.log('🗺️ Route calculation handled by maps.js');
    }

    // Load data for the page
    async loadData() {
        try {
            console.log('📊 Loading create ride data...');
            
            // Pending rides loading removed as not needed in create-ride page

            // Stats loading removed as not needed in create-ride page

            // Hide loading screen
            document.getElementById('loadingScreen').style.display = 'none';
            document.getElementById('mainContent').style.display = 'block';

            console.log('✅ Create ride data loaded');
        } catch (error) {
            console.error('❌ Error loading create ride data:', error);
            showError('Error loading data: ' + error.message);
        }
    }

    // Load statistics - Removed as stats dashboard is not needed in create-ride page

    // Create new ride
    async createRide() {
        try {
            console.log('🚗 Creating new ride...');
            
            // Get form data
            const formData = new FormData(document.getElementById('createRideForm'));
            
            // Get coordinates from the map markers or from input dataset
            const originMarker = window.customMarkers?.find(m => m.type === 'origin');
            const destinationMarker = window.customMarkers?.find(m => m.type === 'destination');
            
            const originInput = document.getElementById('rideOrigin');
            const destinationInput = document.getElementById('rideDestination');
            
            let originCoords, destinationCoords;
            
            // Try to get coordinates from markers first
            if (originMarker && destinationMarker) {
                originCoords = { lat: originMarker.lat, lng: originMarker.lng };
                destinationCoords = { lat: destinationMarker.lat, lng: destinationMarker.lng };
            } 
            // Fallback: get coordinates from input dataset (when selected from autocomplete)
            else if (originInput?.dataset.lat && originInput?.dataset.lon && 
                     destinationInput?.dataset.lat && destinationInput?.dataset.lon) {
                originCoords = { 
                    lat: parseFloat(originInput.dataset.lat), 
                    lng: parseFloat(originInput.dataset.lon) 
                };
                destinationCoords = { 
                    lat: parseFloat(destinationInput.dataset.lat), 
                    lng: parseFloat(destinationInput.dataset.lon) 
                };
                console.log('📍 Using coordinates from input dataset');
            } 
            // If neither is available, show error
            else {
                showError('Please select both origin and destination addresses. Use "Write" or "Take from map" buttons.');
                return;
            }
            
            console.log('📍 Origin coords:', originCoords);
            console.log('📍 Destination coords:', destinationCoords);
            
            console.log('📍 Origin coords:', originCoords);
            console.log('📍 Destination coords:', destinationCoords);
            
            // Get current user ID from Supabase (not Firebase UID)
            const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
            let userId = null;
            
            // Get the Supabase user ID
            try {
                const response = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/users?firebase_uid=eq.${userData.uid}&select=id`, {
                    headers: {
                        'apikey': CONFIG.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`
                    }
                });
                
                if (response.ok) {
                    const users = await response.json();
                    if (users && users.length > 0) {
                        userId = users[0].id;
                        console.log('✅ User ID from Supabase:', userId);
                    }
                }
            } catch (error) {
                console.error('❌ Error getting user ID from Supabase:', error);
            }
            
            const rideData = {
                passengerId: userId || userData.uid, // Use Supabase user ID or fallback to Firebase UID
                originAddress: formData.get('origin'),
                originLat: originCoords?.lat || 0,
                originLng: originCoords?.lng || 0,
                destinationAddress: formData.get('destination'),
                destinationLat: destinationCoords?.lat || 0,
                destinationLng: destinationCoords?.lng || 0,
                estimatedPrice: parseFloat(formData.get('price')),
                client_name: formData.get('client_name'),
                additional_notes: formData.get('additional_notes'),
                driver_id: formData.get('driver_id') || null,
                priority: formData.get('priority') || 'normal'
            };

            // Validate required fields
            if (!rideData.originAddress || !rideData.destinationAddress || !rideData.estimatedPrice || !rideData.client_name) {
                showError('Please fill in all required fields');
                return;
            }

            // Handle scheduled rides
            const scheduledDate = formData.get('scheduled_date');
            const scheduledTime = formData.get('scheduled_time');
            
            if (scheduledDate && scheduledTime) {
                const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
                const now = new Date();
                
                if (scheduledDateTime > now) {
                    rideData.scheduled_at = scheduledDateTime.toISOString();
                    rideData.is_scheduled = true;
                } else {
                    showError('Scheduled date and time must be in the future');
                    return;
                }
            }

            console.log('📋 Ride data:', rideData);

            // Create ride directly
            console.log('🚗 Creating ride via API...');
            
            const requestBody = {
                user_id: rideData.passengerId,
                origin: {
                    address: rideData.originAddress,
                    coordinates: {
                        latitude: rideData.originLat,
                        longitude: rideData.originLng
                    }
                },
                destination: {
                    address: rideData.destinationAddress,
                    coordinates: {
                        latitude: rideData.destinationLat,
                        longitude: rideData.destinationLng
                    }
                },
                status: 'requested',
                price: rideData.estimatedPrice,
                client_name: rideData.client_name,
                additional_notes: rideData.additional_notes,
                driver_id: rideData.driver_id,
                priority: rideData.priority,
                created_at: new Date().toISOString()
            };

            console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));
            console.log('📤 Request URL:', `${CONFIG.SUPABASE_URL}/rest/v1/ride_requests`);
            console.log('📤 Headers:', {
                'Content-Type': 'application/json',
                'apikey': CONFIG.SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
                'Authorization': CONFIG.SUPABASE_ANON_KEY ? 'SET' : 'MISSING'
            });

            const response = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/ride_requests`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': CONFIG.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify(requestBody)
            });

            console.log('📥 Response status:', response.status);
            console.log('📥 Response headers:', response.headers);

            if (!response.ok) {
                const errorText = await response.text();
                console.log('❌ Error response:', errorText);
                throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
            }

            // Supabase returns empty response for successful POST, so we don't need to parse JSON
            let result = null;
            const responseText = await response.text();
            console.log('📥 Response text:', responseText);
            
            if (responseText && responseText.trim()) {
                try {
                    result = JSON.parse(responseText);
                } catch (e) {
                    console.log('⚠️ Response is not JSON, treating as success');
                    result = { success: true };
                }
            } else {
                console.log('✅ Empty response - ride created successfully');
                result = { success: true };
            }
            
            if (result) {
                showSuccess('Viaje creado exitosamente!');
                console.log('✅ Ride created successfully:', result);
                
                // Clear form and markers
                this.resetForm();
                
                // Close modal after successful creation
                this.closeCreateRideModal();
            } else {
                throw new Error('Failed to create ride.');
            }
            
        } catch (error) {
            console.error('❌ Error creating ride:', error);
            showError('Error creating ride: ' + error.message);
        }
    }

    // Close create ride modal
    closeCreateRideModal() {
        const modal = document.getElementById('createRideModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // Reset form
    resetForm() {
        const form = document.getElementById('createRideForm');
        if (form) {
            form.reset();
        }
        
        // Reset input states
        const originInput = document.getElementById('rideOrigin');
        const destinationInput = document.getElementById('rideDestination');
        
        if (originInput) {
            originInput.readOnly = true;
            originInput.placeholder = 'Enter origin address...';
        }
        
        if (destinationInput) {
            destinationInput.readOnly = true;
            destinationInput.placeholder = 'Enter destination address...';
        }
        
        // Clear map markers using maps.js
        if (window.mapsService && window.mapsService.clearMarkers) {
            window.mapsService.clearMarkers();
        }
        
        // Hide route info
        document.getElementById('routeInfo').style.display = 'none';
    }
}

// Global instance
let createRideService;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚗 Create Ride page loading...');
    createRideService = new CreateRideService();
    await createRideService.init();
});

// Global functions for HTML onclick events
function goBack() {
    console.log('🔙 Going back...');
    
    // Verificar si venimos de ride-management
    const referrer = document.referrer;
    const isFromRideManagement = referrer.includes('ride-management');
    
    if (isFromRideManagement) {
        console.log('🔄 Regresando desde ride-management, recargando datos...');
        // Regresar a ride-management y forzar recarga de datos
        window.location.href = '../ride-management.html';
    } else if (window.history.length > 1) {
        console.log('🔙 Usando history.back()...');
        window.history.back();
    } else {
        console.log('🏠 Fallback a home...');
        // Fallback si no hay historial
        window.location.href = '../../home/home.html';
    }
}

function openCreateRideModal() {
    console.log('➕ Opening create ride modal...');
    document.getElementById('createRideModal').style.display = 'flex';
    
    // Initialize map when modal opens - wait longer for modal to be fully visible
    setTimeout(() => {
        console.log('🗺️ Attempting to initialize map...');
        console.log('🔍 window.mapsService available:', !!window.mapsService);
        console.log('🔍 window.mapsService.createMap available:', !!(window.mapsService && window.mapsService.createMap));
        
        if (window.mapsService && window.mapsService.createMap) {
            console.log('✅ Maps service found, initializing...');
            // Try to get current location for map initialization
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        console.log('📍 Got current location:', { lat: latitude, lng: longitude });
                        window.mapsService.createMap('routeMap');
                        // Add click event to map after creation
                        setTimeout(() => {
                            addMapClickHandler();
                        }, 1000);
                    },
                    (error) => {
                        console.log('📍 Using default map view');
                        window.mapsService.createMap('routeMap');
                        // Add click event to map after creation
                        setTimeout(() => {
                            addMapClickHandler();
                        }, 1000);
                    }
                );
            } else {
                console.log('📍 Geolocation not available, using default');
                window.mapsService.createMap('routeMap');
                // Add click event to map after creation
                setTimeout(() => {
                    addMapClickHandler();
                }, 1000);
            }
        } else {
            console.error('❌ Maps service not available!');
            console.error('🔍 Available on window:', Object.keys(window).filter(key => key.includes('map')));
        }
    }, 500); // Increased timeout to ensure modal is fully visible
}

function closeCreateRideModal() {
    console.log('❌ Closing create ride modal...');
    document.getElementById('createRideModal').style.display = 'none';
    
    // Destroy map when modal closes to prevent issues
    if (window.mapsService && window.mapsService.destroy) {
        window.mapsService.destroy();
    }
    
    if (createRideService) {
        createRideService.resetForm();
    }
}

function enableOriginInput() {
    const originInput = document.getElementById('rideOrigin');
    const destinationInput = document.getElementById('rideDestination');
    
    if (originInput) {
        // Remove readonly attribute
        originInput.removeAttribute('readonly');
        originInput.readOnly = false;
        originInput.placeholder = 'Type origin address here...';
        originInput.focus();
        
        // Force styles to ensure visibility
        originInput.style.background = '#ffffff';
        originInput.style.backgroundColor = '#ffffff';
        originInput.style.color = '#1f2937';
        originInput.style.border = '2px solid #3b82f6';
        originInput.style.cursor = 'text';
        originInput.style.opacity = '1';
        
        // Enable autocomplete for origin
        enableAddressAutocomplete(originInput, 'origin');
        
        // Reset destination input state
        if (destinationInput) {
            destinationInput.placeholder = 'Enter destination address...';
        }
        
        console.log('✏️ Origin input enabled for typing with autocomplete');
        console.log('✅ Origin input is now ACTIVE for manual input');
    }
}

function enableDestinationInput() {
    const originInput = document.getElementById('rideOrigin');
    const destinationInput = document.getElementById('rideDestination');
    
    if (destinationInput) {
        // Remove readonly attribute
        destinationInput.removeAttribute('readonly');
        destinationInput.readOnly = false;
        destinationInput.placeholder = 'Type destination address here...';
        destinationInput.focus();
        
        // Force styles to ensure visibility
        destinationInput.style.background = '#ffffff';
        destinationInput.style.backgroundColor = '#ffffff';
        destinationInput.style.color = '#1f2937';
        destinationInput.style.border = '2px solid #3b82f6';
        destinationInput.style.cursor = 'text';
        destinationInput.style.opacity = '1';
        
        // Enable autocomplete for destination
        enableAddressAutocomplete(destinationInput, 'destination');
        
        // Reset origin input state
        if (originInput) {
            originInput.placeholder = 'Enter origin address...';
        }
        
        console.log('✏️ Destination input enabled for typing with autocomplete');
        console.log('✅ Destination input is now ACTIVE for manual input');
    }
}

// Autocomplete function for addresses
function enableAddressAutocomplete(input, type) {
    let autocompleteTimeout;
    let autocompleteResults = [];
    let selectedIndex = -1;
    
    // Create autocomplete container
    const autocompleteContainer = document.createElement('div');
    autocompleteContainer.className = 'address-autocomplete';
    autocompleteContainer.style.cssText = `
        position: fixed !important; 
        top: 100% !important; 
        left: 0 !important; 
        right: 0 !important; 
        background: white !important;
        border: 2px solid red !important; 
        border-radius: 8px !important; 
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
        z-index: 99999 !important; 
        max-height: 200px !important; 
        overflow-y: auto !important; 
        display: none !important;
        width: 100% !important;
    `;
    
    // Position the input relatively
    input.parentElement.style.position = 'relative';
    input.parentElement.style.zIndex = '1';
    input.parentElement.appendChild(autocompleteContainer);
    
    console.log('📍 Autocomplete container created and positioned');
    
    // Search function
    async function searchAddresses(query) {
        if (query.length < 3) {
            hideAutocomplete();
            return;
        }
        
        try {
            console.log('🔍 Searching for:', query);
            
            // Try multiple APIs with fallback
            let results = [];
            let apiUsed = '';
            
            // Use Nominatim API directly (completely free)
            try {
                const nominatimResponse = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=8&addressdetails=1&accept-language=en&extratags=1&namedetails=1&countrycodes=us`,
                    { 
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'User-Agent': 'TaxiApp/1.0'
                        }
                    }
                );
                
                if (nominatimResponse.ok) {
                    const data = await nominatimResponse.json();
                    // Convert Nominatim format to standard format
                    results = data.map(item => ({
                        properties: {
                            name: item.display_name,
                            city: item.address?.city || item.address?.town || '',
                            country: item.address?.country || ''
                        },
                        geometry: {
                            coordinates: [parseFloat(item.lon), parseFloat(item.lat)]
                        }
                    }));
                    apiUsed = 'Nominatim';
                    console.log('✅ Nominatim API success:', results.length, 'results');
                }
            } catch (nominatimError) {
                console.log('❌ Nominatim API failed:', nominatimError.message);
            }
            
            // Final fallback - show mock results
            if (results.length === 0) {
                results = [{
                    properties: {
                        name: `${query} (Mock result)`,
                        city: 'Test location',
                        country: 'Test country'
                    },
                    geometry: {
                        coordinates: [0, 0]
                    }
                }];
                apiUsed = 'Mock';
                console.log('⚠️ Using mock results');
            }
            
            // Filter and prioritize results for better relevance
            const filteredResults = results.filter(item => {
                const name = item.properties?.name || '';
                const city = item.properties?.city || '';
                
                // Prioritize addresses with numbers (specific addresses)
                if (name.match(/\d/)) return true;
                
                // Filter out very generic road names without numbers
                if (name.match(/^[A-Za-z\s]+(?:Rd|Road|St|Street|Ave|Avenue|Blvd|Boulevard|Dr|Drive|Ln|Lane|Way|Ct|Court)$/i) && !name.match(/\d/)) {
                    return false;
                }
                
                // Filter out "Unknown address"
                if (name.toLowerCase().includes('unknown')) return false;
                
                // Prioritize results with city information
                if (city && city.length > 0) return true;
                
                return true;
            })
            .sort((a, b) => {
                // Sort by relevance: addresses with numbers first, then by city presence
                const aHasNumber = a.properties?.name?.match(/\d/) ? 1 : 0;
                const bHasNumber = b.properties?.name?.match(/\d/) ? 1 : 0;
                const aHasCity = a.properties?.city ? 1 : 0;
                const bHasCity = b.properties?.city ? 1 : 0;
                
                return (bHasNumber + bHasCity) - (aHasNumber + aHasCity);
            })
            .slice(0, 5); // Limit to 5 best results
            
            console.log(`📍 Using ${apiUsed} API, found ${filteredResults.length} filtered results`);
            autocompleteResults = filteredResults;
            showAutocomplete(filteredResults);
            
        } catch (error) {
            console.error('💥 Complete failure:', error);
            showAutocomplete([{
                properties: {
                    name: `Error searching for "${query}"`,
                    city: 'Please try again'
                },
                geometry: { coordinates: [0, 0] }
            }]);
        }
    }
    
    // Show autocomplete results
    function showAutocomplete(results) {
        console.log('🎯 Showing autocomplete results:', results);
        autocompleteContainer.innerHTML = '';
        
        if (results.length === 0) {
            autocompleteContainer.innerHTML = '<div class="autocomplete-item" style="padding: 8px 12px; color: #6b7280; font-style: italic;">No addresses found</div>';
        } else {
            results.forEach((result, index) => {
                const item = document.createElement('div');
                item.className = 'autocomplete-item';
                item.style.cssText = `
                    padding: 8px 12px;
                    cursor: pointer;
                    border-bottom: 1px solid #f3f4f6;
                    transition: background-color 0.2s;
                `;
                
                // Photon API format
                const displayName = result.properties?.name || result.properties?.label || 'Unknown address';
                const city = result.properties?.city || result.properties?.county || '';
                const country = result.properties?.country || '';
                const lat = result.geometry?.coordinates?.[1];
                const lon = result.geometry?.coordinates?.[0];
                
                console.log('📍 Result:', { displayName, city, country, lat, lon });
                
                item.innerHTML = `
                    <div style="font-weight: 500; color: #1f2937;">${displayName}</div>
                    <div style="font-size: 0.85rem; color: #6b7280;">${city}${city && country ? ', ' : ''}${country}</div>
                `;
                
                item.addEventListener('mouseenter', () => {
                    item.style.backgroundColor = '#f3f4f6';
                });
                
                item.addEventListener('mouseleave', () => {
                    item.style.backgroundColor = 'transparent';
                });
                
                item.addEventListener('click', () => {
                    console.log('🎯 Address selected:', { displayName, lat, lon });
                    selectAddress({
                        display_name: displayName,
                        lat: lat,
                        lon: lon
                    });
                });
                
                autocompleteContainer.appendChild(item);
            });
        }
        
        // Get input position
        const inputRect = input.getBoundingClientRect();
        
        // Set position directly with more explicit styling
        autocompleteContainer.style.cssText = `
            position: fixed !important;
            top: ${inputRect.bottom + 2}px !important;
            left: ${inputRect.left}px !important;
            width: ${inputRect.width}px !important;
            background: white !important;
            border: 1px solid #e5e7eb !important;
            border-radius: 8px !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
            z-index: 99999 !important;
            max-height: 200px !important;
            overflow-y: auto !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
        `;
        
        console.log('✅ Autocomplete container shown at position:', {
            top: inputRect.bottom + 2,
            left: inputRect.left,
            width: inputRect.width
        });
        
        // Force a reflow to ensure the element is rendered
        autocompleteContainer.offsetHeight;
    }
    
    // Hide autocomplete
    function hideAutocomplete() {
        autocompleteContainer.style.display = 'none';
        selectedIndex = -1;
    }
    
    // Select address
    function selectAddress(result) {
        input.value = result.display_name;
        hideAutocomplete();
        
        // Store coordinates for later use
        input.dataset.lat = result.lat;
        input.dataset.lon = result.lon;
        
        // Add marker to map when address is selected from autocomplete
        if (result.lat && result.lon) {
            addMarkerAtLocation(result.lat, result.lon, type);
        }
        
        // Make input read-only after selection
        input.readOnly = true;
        input.placeholder = `${type === 'origin' ? 'Origin' : 'Destination'} selected`;
        
        console.log(`📍 ${type} address selected:`, result.display_name);
        
        // If origin is selected, enable destination input
        if (type === 'origin') {
            const destinationInput = document.getElementById('rideDestination');
            if (destinationInput) {
                destinationInput.readOnly = false;
                destinationInput.placeholder = 'Click on the map to select destination...';
            }
        }
        
        // If both are selected, calculate route
        if (type === 'destination') {
            const originInput = document.getElementById('rideOrigin');
            if (originInput && originInput.dataset.lat && originInput.dataset.lon) {
                setTimeout(() => {
                    calculateRoute();
                }, 500);
            }
        }
    }
    
    // Input event listener
    input.addEventListener('input', (e) => {
        console.log('🔍 Input changed:', e.target.value);
        clearTimeout(autocompleteTimeout);
        autocompleteTimeout = setTimeout(() => {
            console.log('🚀 Starting address search for:', e.target.value);
            searchAddresses(e.target.value);
        }, 300);
    });
    
    // Hide autocomplete when clicking outside
    document.addEventListener('click', (e) => {
        if (!input.parentElement.contains(e.target)) {
            hideAutocomplete();
        }
    });
    
    // Reposition on scroll
    window.addEventListener('scroll', () => {
        if (autocompleteContainer.style.display === 'block') {
            const inputRect = input.getBoundingClientRect();
            autocompleteContainer.style.cssText = `
                position: fixed !important;
                top: ${inputRect.bottom + 2}px !important;
                left: ${inputRect.left}px !important;
                width: ${inputRect.width}px !important;
                background: white !important;
                border: 1px solid #e5e7eb !important;
                border-radius: 8px !important;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
                z-index: 99999 !important;
                max-height: 200px !important;
                overflow-y: auto !important;
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
            `;
        }
    });
    
    // Keyboard navigation
    input.addEventListener('keydown', (e) => {
        const items = autocompleteContainer.querySelectorAll('.autocomplete-item');
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
            updateSelection(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, -1);
            updateSelection(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIndex >= 0 && autocompleteResults[selectedIndex]) {
                selectAddress(autocompleteResults[selectedIndex]);
            }
        } else if (e.key === 'Escape') {
            hideAutocomplete();
        }
    });
    
    // Update selection highlighting
    function updateSelection(items) {
        items.forEach((item, index) => {
            if (index === selectedIndex) {
                item.style.backgroundColor = '#3b82f6';
                item.style.color = 'white';
            } else {
                item.style.backgroundColor = 'transparent';
                item.style.color = '#1f2937';
            }
        });
    }
}

function selectOriginFromMap() {
    const originInput = document.getElementById('rideOrigin');
    const destinationInput = document.getElementById('rideDestination');
    
    if (originInput) {
        // Enable origin input and set it as active
        originInput.readOnly = false;
        originInput.placeholder = 'Click on the map to select origin...';
        originInput.focus();
        
        // Disable destination input temporarily to avoid conflicts
        if (destinationInput) {
            destinationInput.readOnly = true;
            destinationInput.placeholder = 'Select destination after origin...';
        }
        
        console.log('🗺️ Origin selection from map enabled');
        console.log('✅ Origin input is now ACTIVE for map selection');
    }
}

function selectDestinationFromMap() {
    const originInput = document.getElementById('rideOrigin');
    const destinationInput = document.getElementById('rideDestination');
    
    if (destinationInput) {
        // Enable destination input and set it as active
        destinationInput.readOnly = false;
        destinationInput.placeholder = 'Click on the map to select destination...';
        destinationInput.focus();
        
        // Disable origin input temporarily to avoid conflicts
        if (originInput) {
            originInput.readOnly = true;
            originInput.placeholder = 'Origin selected. Now select destination...';
        }
        
        console.log('🗺️ Destination selection from map enabled');
        console.log('✅ Destination input is now ACTIVE for map selection');
    }
}

function getCurrentLocation() {
    if (window.mapsService && window.mapsService.getCurrentLocation) {
        window.mapsService.getCurrentLocation();
    } else {
        console.log('📍 getCurrentLocation handled by maps.js');
    }
}

// Force map resize (temporary function for debugging)
function refreshMap() {
    if (window.mapsService && window.mapsService.getMap) {
        const map = window.mapsService.getMap();
        if (map) {
            map.invalidateSize();
            console.log('🗺️ Map resized');
        }
    }
}

// Add click handler to map for adding markers
function addMapClickHandler() {
    if (window.mapsService && window.mapsService.getMap) {
        const map = window.mapsService.getMap();
        if (map) {
            // Remove existing click handler if any
            map.off('click');
            
            // Add new click handler
            map.on('click', function(e) {
                const { lat, lng } = e.latlng;
                console.log('🗺️ Map clicked at:', { lat, lng });
                
                // Check which input is currently active
                const originInput = document.getElementById('rideOrigin');
                const destinationInput = document.getElementById('rideDestination');
                
                let markerType = null;
                let targetInput = null;
                
                // Debug: Log the current state of inputs
                debugInputStates();
                
                // Check if origin input is active (not readonly and has specific placeholder)
                if (originInput && !originInput.readOnly && 
                    (originInput.placeholder.includes('Click on the map') || 
                     originInput.placeholder.includes('select origin'))) {
                    markerType = 'origin';
                    targetInput = originInput;
                    console.log('🎯 Adding ORIGIN marker');
                } 
                // Check if destination input is active (not readonly and has specific placeholder)
                else if (destinationInput && !destinationInput.readOnly && 
                         (destinationInput.placeholder.includes('Click on the map') || 
                          destinationInput.placeholder.includes('select destination'))) {
                    markerType = 'destination';
                    targetInput = destinationInput;
                    console.log('🎯 Adding DESTINATION marker');
                } 
                // If neither is active, try to determine from context
                else if (originInput && !originInput.readOnly && destinationInput.readOnly) {
                    // If origin is enabled and destination is disabled, assume origin
                    markerType = 'origin';
                    targetInput = originInput;
                    console.log('🎯 Auto-detecting ORIGIN marker (origin enabled, destination disabled)');
                } else if (destinationInput && !destinationInput.readOnly && originInput.readOnly) {
                    // If destination is enabled and origin is disabled, assume destination
                    markerType = 'destination';
                    targetInput = destinationInput;
                    console.log('🎯 Auto-detecting DESTINATION marker (destination enabled, origin disabled)');
                } else {
                    console.log('⚠️ No input is currently active for address selection');
                    console.log('💡 Tip: Use "Take from map" buttons to enable input selection');
                    return;
                }
                
                // Add marker at clicked location with type
                addMarkerAtLocation(lat, lng, markerType);
                
                // Get address from coordinates and fill input
                getAddressFromCoordinates(lat, lng, targetInput, markerType);
                
                // Show coordinates in console
                console.log(`📍 ${markerType.toUpperCase()} marcador agregado en: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
            });
            
            console.log('✅ Map click handler added with address assignment');
        }
    }
}

// Add marker at specific location with type
function addMarkerAtLocation(lat, lng, type = 'custom') {
    if (window.mapsService && window.mapsService.getMap) {
        const map = window.mapsService.getMap();
        if (map) {
            // Create custom marker icon based on type
            let iconHtml, iconClass;
            
            if (type === 'origin') {
                iconHtml = '<div style="background-color: #4CAF50; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>';
                iconClass = 'origin-marker';
            } else if (type === 'destination') {
                iconHtml = '<div style="background-color: #F44336; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>';
                iconClass = 'destination-marker';
            } else {
                iconHtml = '<div style="background-color: #9C27B0; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>';
                iconClass = 'custom-marker';
            }
            
            const icon = L.divIcon({
                className: iconClass,
                html: iconHtml,
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });
            
            // Add marker to map
            const marker = L.marker([lat, lng], { icon })
                .addTo(map)
                .bindPopup(`
                    <div class="marker-popup">
                        <h4>${type === 'origin' ? 'Origen' : type === 'destination' ? 'Destino' : 'Ubicación'} seleccionado</h4>
                        <p><strong>Latitud:</strong> ${lat.toFixed(6)}</p>
                        <p><strong>Longitud:</strong> ${lng.toFixed(6)}</p>
                        <button class="btn btn-primary btn-sm" onclick="removeMarkerAtLocation(${lat}, ${lng})">
                            Remover marcador
                        </button>
                    </div>
                `);
            
            // Store marker reference with type
            if (!window.customMarkers) {
                window.customMarkers = [];
            }
            window.customMarkers.push({ lat, lng, marker, type });
            
            console.log(`📍 ${type.toUpperCase()} marker added at:`, { lat, lng });
        }
    }
}

// Remove marker at specific location
function removeMarkerAtLocation(lat, lng) {
    if (window.customMarkers) {
        const index = window.customMarkers.findIndex(m => 
            Math.abs(m.lat - lat) < 0.000001 && Math.abs(m.lng - lng) < 0.000001
        );
        
        if (index !== -1) {
            const markerData = window.customMarkers[index];
            markerData.marker.remove();
            window.customMarkers.splice(index, 1);
            console.log('🗑️ Marker removed at:', { lat, lng });
        }
    }
}

// Clear all custom markers
function clearAllMarkers() {
    if (window.customMarkers) {
        window.customMarkers.forEach(markerData => {
            markerData.marker.remove();
        });
        window.customMarkers = [];
        console.log('🗑️ All custom markers cleared');
    }
    
    // Clear route from map
    if (window.mapsService && window.mapsService.clearRoute) {
        window.mapsService.clearRoute();
    }
    
    // Reset form inputs
    const originInput = document.getElementById('rideOrigin');
    const destinationInput = document.getElementById('rideDestination');
    const distanceInput = document.getElementById('rideDistance');
    const durationInput = document.getElementById('routeDuration');
    const priceInput = document.getElementById('ridePrice');
    
    if (originInput) {
        originInput.value = '';
        originInput.readOnly = true;
        originInput.placeholder = 'Enter origin address...';
        // Clear coordinates from dataset
        delete originInput.dataset.lat;
        delete originInput.dataset.lon;
    }
    
    if (destinationInput) {
        destinationInput.value = '';
        destinationInput.readOnly = true;
        destinationInput.placeholder = 'Enter destination address...';
        // Clear coordinates from dataset
        delete destinationInput.dataset.lat;
        delete destinationInput.dataset.lon;
    }
    
    if (distanceInput) distanceInput.value = '0.0';
    if (durationInput) durationInput.textContent = '0 min';
    if (priceInput) priceInput.value = '0.00';
    
    // Hide price display
    const priceDisplay = document.getElementById('priceDisplay');
    if (priceDisplay) {
        priceDisplay.style.display = 'none';
    }
    
    // Hide route info
    const routeInfo = document.getElementById('routeInfo');
    if (routeInfo) {
        routeInfo.style.display = 'none';
    }
    
    console.log('🗑️ Form reset and route cleared');
}

async function calculateRoute() {
    try {
        console.log('🗺️ Calculating route...');
        
        // Get origin and destination coordinates from markers
        const originMarker = window.customMarkers?.find(m => m.type === 'origin');
        const destinationMarker = window.customMarkers?.find(m => m.type === 'destination');
        
        if (!originMarker || !destinationMarker) {
            showError('Please select both origin and destination points on the map first');
            return;
        }
        
        const origin = { lat: originMarker.lat, lng: originMarker.lng };
        const destination = { lat: destinationMarker.lat, lng: destinationMarker.lng };
        
        console.log('📍 Route coordinates:', { origin, destination });
        
        if (window.mapsService && window.mapsService.calculateRoute) {
            const routeData = await window.mapsService.calculateRoute(origin, destination);
            
            if (routeData) {
                // Update distance and duration inputs
                const distanceInput = document.getElementById('rideDistance');
                const durationInput = document.getElementById('routeDuration');
                
                if (distanceInput) {
                    distanceInput.value = routeData.distance.toFixed(1);
                }
                
                if (durationInput) {
                    durationInput.textContent = `${Math.round(routeData.duration)} min`;
                }
                
                // Calculate and update price
                calculatePrice();
                
                // Auto-update price when distance changes
                const distanceInputElement = document.getElementById('rideDistance');
                if (distanceInputElement) {
                    distanceInputElement.addEventListener('input', calculatePrice);
                }
                
                // Show route info
                const routeInfo = document.getElementById('routeInfo');
                if (routeInfo) {
                    routeInfo.style.display = 'block';
                    
                    // Update route info content
                    const routeDistance = routeInfo.querySelector('.route-distance');
                    const routeDuration = routeInfo.querySelector('.route-duration');
                    const routePrice = routeInfo.querySelector('.route-price');
                    
                    if (routeDistance) routeDistance.textContent = `${routeData.distance.toFixed(1)} km`;
                    if (routeDuration) routeDuration.textContent = `${Math.round(routeData.duration)} min`;
                    if (routePrice) routePrice.textContent = `$${document.getElementById('ridePrice').value}`;
                }
                
                console.log('✅ Route calculated successfully:', routeData);
                showSuccess('Route calculated successfully!');
            }
    } else {
            console.error('❌ Maps service not available');
            showError('Maps service not available');
        }
        
    } catch (error) {
        console.error('❌ Error calculating route:', error);
        showError('Error calculating route: ' + error.message);
    }
}

// Calculate price based on distance and duration
// Get address from coordinates using reverse geocoding
async function getAddressFromCoordinates(lat, lng, inputElement, type) {
    try {
        console.log(`🔍 Getting address for ${type} at:`, { lat, lng });
        
        // Use OpenStreetMap Nominatim API for reverse geocoding
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
        );
        
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.display_name) {
            // Format the address nicely
            const address = data.display_name;
            inputElement.value = address;
            
            // Store coordinates in dataset for later use
            inputElement.dataset.lat = lat.toString();
            inputElement.dataset.lon = lng.toString();
            
            // Make input read-only after setting address
            inputElement.readOnly = true;
            inputElement.placeholder = `${type === 'origin' ? 'Origen' : 'Destino'} seleccionado`;
            
            console.log(`✅ Address for ${type}:`, address);
            
            // If this was origin, enable destination input
            if (type === 'origin') {
                const destinationInput = document.getElementById('rideDestination');
                if (destinationInput) {
                    destinationInput.readOnly = false;
                    destinationInput.placeholder = 'Click on the map to select destination...';
                    destinationInput.focus();
                }
                
                // Show estimated price info
                const priceDisplay = document.getElementById('priceDisplay');
                if (priceDisplay) {
                    const priceValue = priceDisplay.querySelector('.price-value');
                    if (priceValue) {
                        // Get pricing info
                        let pricingInfo = 'Select destination to calculate';
                        if (window.getPricingConfig) {
                            const config = window.getPricingConfig();
                            pricingInfo = `Base: $${config.basePrice}, +$${config.pricePerExtraKm}/km after ${config.includedKm}km`;
                        }
                        priceValue.textContent = pricingInfo;
                    }
                    priceDisplay.style.display = 'flex';
                }
            }
            
            // If this was destination, both inputs are now filled
            if (type === 'destination') {
                console.log('✅ Both origin and destination are now set');
                
                // Auto-calculate route and price
                setTimeout(() => {
                    calculateRoute();
                }, 500); // Small delay to ensure UI is updated
            }
            
        } else {
            throw new Error('No address found for these coordinates');
        }
        
    } catch (error) {
        console.error(`❌ Error getting address for ${type}:`, error);
        
        // Fallback: use coordinates as address
        const fallbackAddress = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        inputElement.value = fallbackAddress;
        inputElement.readOnly = true;
        inputElement.placeholder = `${type === 'origin' ? 'Origen' : 'Destino'} (coordenadas)`;
        
        console.log(`⚠️ Using coordinates as fallback for ${type}:`, fallbackAddress);
    }
}

function calculatePrice() {
    const distanceInput = document.getElementById('rideDistance');
    const durationInput = document.getElementById('routeDuration');
    const priceInput = document.getElementById('ridePrice');
    
    if (distanceInput && priceInput) {
        const distance = parseFloat(distanceInput.value) || 0;
        const duration = parseInt(durationInput?.textContent?.replace(' min', '')) || 0;
        
        // Get pricing configuration from admin.js
        let pricingConfig;
        if (window.getPricingConfig) {
            pricingConfig = window.getPricingConfig();
        } else {
            // Fallback pricing configuration
            pricingConfig = {
                basePrice: 2.50,
                includedKm: 3,
                pricePerExtraKm: 0.80,
                minimumFare: 2.50,
                currency: 'USD'
            };
        }
        
        console.log('💰 Using pricing config:', pricingConfig);
        
        let calculatedPrice;
        if (distance <= pricingConfig.includedKm) {
            // If distance is within included range, only charge base price
            calculatedPrice = pricingConfig.basePrice;
            console.log(`💰 Distance ${distance}km within included ${pricingConfig.includedKm}km, using base price: $${pricingConfig.basePrice}`);
        } else {
            // If more distance, charge base price + extra kilometers
            const extraKm = distance - pricingConfig.includedKm;
            calculatedPrice = pricingConfig.basePrice + (extraKm * pricingConfig.pricePerExtraKm);
            console.log(`💰 Distance ${distance}km exceeds included ${pricingConfig.includedKm}km, extra ${extraKm}km at $${pricingConfig.pricePerExtraKm}/km`);
        }
        
        // Apply minimum fare if necessary
        if (calculatedPrice < pricingConfig.minimumFare) {
            calculatedPrice = pricingConfig.minimumFare;
            console.log(`💰 Applied minimum fare: $${pricingConfig.minimumFare}`);
        }
        
        calculatedPrice = calculatedPrice.toFixed(2);
        priceInput.value = calculatedPrice;
        
        console.log(`💰 Final price calculated: $${calculatedPrice} for ${distance}km`);
        
        // Update price display with currency
        const priceDisplay = document.getElementById('priceDisplay');
        if (priceDisplay) {
            const priceValue = priceDisplay.querySelector('.price-value');
            if (priceValue) {
                priceValue.textContent = `${pricingConfig.currency} ${calculatedPrice}`;
            }
            priceDisplay.style.display = 'flex';
        }
    }
}

function createRide() {
    if (createRideService) {
        createRideService.createRide();
    }
}

function loadData() {
    if (createRideService) {
        createRideService.loadData();
    }
}

// Modal functions
function closeDriverSelectionModal() {
    document.getElementById('driverSelectionModal').style.display = 'none';
}

function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
}

// Debug function to check input states
function debugInputStates() {
    const originInput = document.getElementById('rideOrigin');
    const destinationInput = document.getElementById('rideDestination');
    
    console.log('🔍 === DEBUG INPUT STATES ===');
    console.log('Origin Input:', {
        exists: !!originInput,
        readOnly: originInput?.readOnly,
        placeholder: originInput?.placeholder,
        value: originInput?.value,
        disabled: originInput?.disabled
    });
    console.log('Destination Input:', {
        exists: !!destinationInput,
        readOnly: destinationInput?.readOnly,
        placeholder: destinationInput?.placeholder,
        value: destinationInput?.value,
        disabled: destinationInput?.disabled
    });
    console.log('🔍 === END DEBUG ===');
}

// Utility functions
function showSuccess(message) {
    // Implementation depends on your notification system
    console.log('✅ Success:', message);
    alert(message); // Replace with proper notification
}

function showError(message) {
    // Implementation depends on your notification system
    console.error('❌ Error:', message);
    alert('Error: ' + message); // Replace with proper notification
}

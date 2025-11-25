// Reports - Specific functionality for reports page
class ReportsService {
    constructor() {
        this.supabaseUrl = CONFIG.SUPABASE_URL;
        this.supabaseKey = CONFIG.SUPABASE_ANON_KEY;
        this.currentReportType = null;
        this.availableDrivers = [];
    }

    async init() {
        console.log('📊 Initializing Reports Service...');
        await this.loadDrivers();
        await this.loadData();
    }

    // Load available drivers for report filtering
    async loadDrivers() {
        try {
            console.log('👥 Loading drivers for reports...');
            const response = await fetch(`${this.supabaseUrl}/rest/v1/users?role=eq.driver&is_active=eq.true&select=id,display_name,email&order=display_name.asc`, {
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status}`);
            }

            const drivers = await response.json();
            console.log(`✅ ${drivers.length} drivers loaded for reports`);

            // Populate driver filter dropdown
            const driverFilter = document.getElementById('reportDriverFilter');
            if (driverFilter) {
                drivers.forEach(driver => {
                    const option = document.createElement('option');
                    option.value = driver.id;
                    option.textContent = driver.display_name || driver.email;
                    driverFilter.appendChild(option);
                });
            }

            this.availableDrivers = drivers;
            return drivers;
        } catch (error) {
            console.error('❌ Error loading drivers for reports:', error);
            return [];
        }
    }

    // Load data for the page
    async loadData() {
        try {
            console.log('📊 Loading reports data...');
            
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

            // Hide loading screen
            document.getElementById('loadingScreen').style.display = 'none';
            document.getElementById('mainContent').style.display = 'block';

            console.log('✅ Reports data loaded');
        } catch (error) {
            console.error('❌ Error loading reports data:', error);
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

    // Generate completed rides report
    generateCompletedRidesReport() {
        this.currentReportType = 'completed_rides';
        document.getElementById('reportModalTitle').textContent = 'Reporte de Viajes Completados';
        this.openReportModal();
    }

    // Generate revenue report
    generateRevenueReport() {
        this.currentReportType = 'revenue';
        document.getElementById('reportModalTitle').textContent = 'Reporte de Ingresos';
        this.openReportModal();
    }

    // Generate driver performance report
    generateDriverPerformanceReport() {
        this.currentReportType = 'driver_performance';
        document.getElementById('reportModalTitle').textContent = 'Reporte de Rendimiento de Conductores';
        this.openReportModal();
    }

    // Generate client activity report
    generateClientActivityReport() {
        this.currentReportType = 'client_activity';
        document.getElementById('reportModalTitle').textContent = 'Reporte de Actividad de Clientes';
        this.openReportModal();
    }

    // Open report modal
    openReportModal() {
        // Set default dates (last 30 days)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        document.getElementById('reportStartDate').value = startDate.toISOString().split('T')[0];
        document.getElementById('reportEndDate').value = endDate.toISOString().split('T')[0];
        
        document.getElementById('reportModal').style.display = 'flex';
    }

    // Close report modal
    closeReportModal() {
        document.getElementById('reportModal').style.display = 'none';
        this.currentReportType = null;
    }

    // Execute report generation
    async executeReport() {
        try {
            const startDate = document.getElementById('reportStartDate').value;
            const endDate = document.getElementById('reportEndDate').value;
            const driverFilter = document.getElementById('reportDriverFilter').value;

            if (!startDate || !endDate) {
                showError('Por favor selecciona las fechas de inicio y fin');
                return;
            }

            if (new Date(startDate) > new Date(endDate)) {
                showError('La fecha de inicio no puede ser mayor que la fecha de fin');
                return;
            }

            console.log(`📊 Generating ${this.currentReportType} report...`);
            
            // Build query based on report type
            let query = `created_at.gte.${startDate}T00:00:00&created_at.lte.${endDate}T23:59:59`;
            
            if (driverFilter) {
                query += `&driver_id.eq.${driverFilter}`;
            }

            // Add status filter for completed rides report
            if (this.currentReportType === 'completed_rides') {
                query += '&status.eq.completed';
            }

            const response = await fetch(`${this.supabaseUrl}/rest/v1/ride_requests?${query}&select=*&order=created_at.desc`, {
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.generateReportFile(data);
            } else {
                throw new Error(`HTTP Error: ${response.status}`);
            }

        } catch (error) {
            console.error('❌ Error generating report:', error);
            showError('Error generating report: ' + error.message);
        }
    }

    // Generate and download report file
    generateReportFile(data) {
        let reportContent = '';
        let fileName = '';

        switch (this.currentReportType) {
            case 'completed_rides':
                fileName = `completed_rides_report_${new Date().toISOString().split('T')[0]}.csv`;
                reportContent = this.generateCompletedRidesCSV(data);
                break;
            case 'revenue':
                fileName = `revenue_report_${new Date().toISOString().split('T')[0]}.csv`;
                reportContent = this.generateRevenueCSV(data);
                break;
            case 'driver_performance':
                fileName = `driver_performance_report_${new Date().toISOString().split('T')[0]}.csv`;
                reportContent = this.generateDriverPerformanceCSV(data);
                break;
            case 'client_activity':
                fileName = `client_activity_report_${new Date().toISOString().split('T')[0]}.csv`;
                reportContent = this.generateClientActivityCSV(data);
                break;
        }

        // Create and download file
        const blob = new Blob([reportContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.closeReportModal();
        showSuccess(`Reporte generado exitosamente: ${fileName}`);
    }

    // Generate CSV for completed rides
    generateCompletedRidesCSV(data) {
        let csv = 'ID,Cliente,Origen,Destino,Precio,Distancia,Conductor,Fecha Completado\n';
        
        data.forEach(ride => {
            const origin = ride.origin?.address || 'N/A';
            const destination = ride.destination?.address || 'N/A';
            const price = ride.price || 0;
            const distance = ride.distance ? (ride.distance / 1000).toFixed(2) : 'N/A';
            const driver = this.getDriverName(ride.driver_id);
            const completedDate = new Date(ride.updated_at || ride.created_at).toLocaleString('es-ES');
            
            csv += `${ride.id},"${ride.client_name || 'N/A'}","${origin}","${destination}",${price},${distance},"${driver}","${completedDate}"\n`;
        });
        
        return csv;
    }

    // Generate CSV for revenue
    generateRevenueCSV(data) {
        let csv = 'Fecha,ID Viaje,Cliente,Precio,Estado,Conductor\n';
        
        data.forEach(ride => {
            const date = new Date(ride.created_at).toLocaleDateString('es-ES');
            const driver = this.getDriverName(ride.driver_id);
            const status = this.getStatusText(ride.status);
            
            csv += `"${date}",${ride.id},"${ride.client_name || 'N/A'}",${ride.price || 0},"${status}","${driver}"\n`;
        });
        
        return csv;
    }

    // Generate CSV for driver performance
    generateDriverPerformanceCSV(data) {
        // Group by driver
        const driverStats = {};
        
        data.forEach(ride => {
            const driverId = ride.driver_id;
            if (!driverStats[driverId]) {
                driverStats[driverId] = {
                    name: this.getDriverName(driverId),
                    totalRides: 0,
                    totalRevenue: 0,
                    completedRides: 0,
                    cancelledRides: 0
                };
            }
            
            driverStats[driverId].totalRides++;
            driverStats[driverId].totalRevenue += ride.price || 0;
            
            if (ride.status === 'completed') {
                driverStats[driverId].completedRides++;
            } else if (ride.status === 'cancelled') {
                driverStats[driverId].cancelledRides++;
            }
        });
        
        let csv = 'Conductor,Total Viajes,Viajes Completados,Viajes Cancelados,Ingresos Totales,Tasa de Completación\n';
        
        Object.values(driverStats).forEach(stats => {
            const completionRate = stats.totalRides > 0 ? ((stats.completedRides / stats.totalRides) * 100).toFixed(2) : 0;
            csv += `"${stats.name}",${stats.totalRides},${stats.completedRides},${stats.cancelledRides},${stats.totalRevenue.toFixed(2)},${completionRate}%\n`;
        });
        
        return csv;
    }

    // Generate CSV for client activity
    generateClientActivityCSV(data) {
        // Group by client
        const clientStats = {};
        
        data.forEach(ride => {
            const clientName = ride.client_name || 'Cliente Anónimo';
            if (!clientStats[clientName]) {
                clientStats[clientName] = {
                    totalRides: 0,
                    totalSpent: 0,
                    lastRide: null
                };
            }
            
            clientStats[clientName].totalRides++;
            clientStats[clientName].totalSpent += ride.price || 0;
            
            const rideDate = new Date(ride.created_at);
            if (!clientStats[clientName].lastRide || rideDate > new Date(clientStats[clientName].lastRide)) {
                clientStats[clientName].lastRide = ride.created_at;
            }
        });
        
        let csv = 'Cliente,Total Viajes,Gasto Total,Último Viaje,Promedio por Viaje\n';
        
        Object.entries(clientStats).forEach(([clientName, stats]) => {
            const avgSpent = stats.totalRides > 0 ? (stats.totalSpent / stats.totalRides).toFixed(2) : 0;
            const lastRide = stats.lastRide ? new Date(stats.lastRide).toLocaleDateString('es-ES') : 'N/A';
            
            csv += `"${clientName}",${stats.totalRides},${stats.totalSpent.toFixed(2)},"${lastRide}",${avgSpent}\n`;
        });
        
        return csv;
    }

    // Get driver name by ID
    getDriverName(driverId) {
        if (!driverId) return 'Sin asignar';
        const driver = this.availableDrivers.find(d => d.id === driverId);
        return driver ? (driver.display_name || driver.email) : 'Conductor desconocido';
    }

    // Get status text
    getStatusText(status) {
        const statusTexts = {
            'requested': 'Solicitado',
            'accepted': 'Aceptado',
            'in_progress': 'En progreso',
            'completed': 'Completado',
            'cancelled': 'Cancelado'
        };
        return statusTexts[status] || 'Desconocido';
    }
}

// Global instance
let reportsService;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📊 Reports page loading...');
    reportsService = new ReportsService();
    await reportsService.init();
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
    if (reportsService) {
        reportsService.loadData();
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

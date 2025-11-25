# Taxi App - Web Admin Interface

## 📁 Project Structure

```
web-html/
├── 📄 index.html                    # Admin Home + Login
├── 📁 admin/                        # Admin sections
│   ├── 🚗 create-ride/             # Create Ride functionality
│   │   ├── index.html
│   │   ├── js/
│   │   │   ├── create-ride.js      # Ride creation logic
│   │   │   └── maps.js             # Map functionality
│   │   └── css/
│   │       └── create-ride.css     # Ride creation styles
│   ├── 👤 drivers/                 # Driver management
│   │   ├── index.html
│   │   ├── js/
│   │   │   └── drivers.js          # Driver management logic
│   │   └── css/
│   │       └── drivers.css         # Driver management styles
│   ├── 📋 ride-management/         # Ride management & assignment
│   │   ├── index.html
│   │   ├── js/
│   │   └── css/
│   ├── 📊 reports/                 # Reports & analytics
│   │   ├── index.html
│   │   ├── js/
│   │   └── css/
│   └── ⚙️ configuration/           # System configuration
│       ├── index.html
│       ├── js/
│       └── css/
├── 📁 js/                          # Global scripts
│   ├── config.js                   # Configuration
│   ├── auth.js                     # Authentication
│   ├── api.js                      # API communication
│   ├── admin.js                    # Admin functionality
│   └── app.js                      # Main application
├── 📁 css/                         # Global styles
│   ├── style.css                   # Main styles
│   ├── components.css              # Component styles
│   └── responsive.css              # Responsive design
└── 📁 docs/                        # Documentation
    └── README.md                   # This file
```

## 🚀 Getting Started

### Prerequisites
- Web server (Apache, Nginx, or local development server)
- Modern web browser
- Internet connection (for maps and external APIs)

### Installation
1. Clone or download the project
2. Place the `web-html` folder in your web server directory
3. Access via `http://localhost/web-html/` (or your server URL)

## 📋 Features

### 🏠 Admin Home (`index.html`)
- **Login/Authentication**: Secure admin access
- **Dashboard**: Overview with quick stats
- **Navigation**: Access to all admin sections

### 🚗 Create Ride (`admin/create-ride/`)
- **Ride Creation**: Form to create new rides
- **Map Integration**: Interactive map for route selection
- **Driver Assignment**: Optional driver assignment
- **Scheduling**: Future ride scheduling
- **Pending Rides**: View rides awaiting assignment

### 👤 Drivers (`admin/drivers/`)
- **Driver List**: View all drivers with search and filters
- **Driver Management**: Create, edit, delete drivers
- **Status Management**: Active/inactive status tracking
- **Availability**: Track driver availability
- **Vehicle Information**: License, vehicle details, documents
- **Statistics Dashboard**: Total, active, and available drivers
- **Real-time Updates**: Live driver status updates

### 📋 Ride Management (`admin/ride-management/`)
- **All Rides**: Complete ride listing
- **Filters**: Filter by status (All, Accepted, Completed, Cancelled)
- **Driver Assignment**: Assign/reassign drivers
- **Ride Actions**: Edit, cancel, delete rides
- **Compact View**: Expandable ride cards

### 📊 Reports (`admin/reports/`)
- **Dashboard Reports**: Overview statistics
- **Ride Reports**: Detailed ride analytics
- **Financial Reports**: Revenue and cost analysis
- **Driver Reports**: Driver performance metrics

### ⚙️ Configuration (`admin/configuration/`)
- **User Management**: Admin user management
- **System Settings**: Application configuration
- **Security Settings**: Access control and permissions
- **Notification Settings**: Alert configuration

## 🔧 Technical Details

### Frontend Technologies
- **HTML5**: Semantic markup
- **CSS3**: Modern styling with CSS Grid and Flexbox
- **JavaScript (ES6+)**: Modern JavaScript features
- **Leaflet.js**: Interactive maps
- **Font Awesome**: Icons

### Key Features
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Progressive Web App**: Modern web app capabilities
- **Real-time Updates**: Live data updates
- **Offline Support**: Basic offline functionality
- **Accessibility**: WCAG compliant

### API Integration
- **Supabase**: Backend database and authentication
- **OpenStreetMap**: Map tiles and geocoding
- **OSRM**: Route calculation
- **Nominatim**: Reverse geocoding

## 🎨 Design System

### Color Scheme
- **Primary**: Blue (#3b82f6)
- **Secondary**: Gray (#6b7280)
- **Success**: Green (#10b981)
- **Warning**: Yellow (#f59e0b)
- **Error**: Red (#ef4444)

### Typography
- **Primary Font**: System fonts (San Francisco, Segoe UI, etc.)
- **Monospace**: For code and technical data

### Components
- **Cards**: Information containers
- **Modals**: Overlay dialogs
- **Buttons**: Action triggers
- **Forms**: Data input
- **Tables**: Data display

## 📱 Responsive Breakpoints

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

## 🔒 Security

- **Authentication**: Secure login system
- **Authorization**: Role-based access control
- **Data Validation**: Input sanitization
- **HTTPS**: Secure communication (recommended)

## 🚀 Performance

- **Lazy Loading**: Images and non-critical resources
- **Minification**: CSS and JavaScript optimization
- **Caching**: Browser and server caching
- **CDN**: External resources from CDN

## 📝 Development

### Code Style
- **JavaScript**: ES6+ with consistent naming
- **CSS**: BEM methodology for class naming
- **HTML**: Semantic HTML5 elements

### File Naming
- **Files**: kebab-case (e.g., `create-ride.js`)
- **Classes**: PascalCase (e.g., `CreateRideService`)
- **Functions**: camelCase (e.g., `calculateRoute`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_URL`)

## 🐛 Troubleshooting

### Common Issues
1. **Maps not loading**: Check internet connection and API keys
2. **Authentication errors**: Verify Supabase configuration
3. **Responsive issues**: Check CSS breakpoints
4. **JavaScript errors**: Check browser console for details

### Debug Mode
Enable debug mode by setting `DEBUG = true` in `config.js`

## 📄 License

This project is proprietary software. All rights reserved.

## 🤝 Contributing

1. Follow the established code style
2. Test on multiple devices and browsers
3. Update documentation for new features
4. Ensure accessibility compliance

## 📞 Support

For technical support or questions, contact the development team.

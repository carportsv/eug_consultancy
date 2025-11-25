const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Configuración del servidor
const PORT = 8000;
const DIRECTORY = __dirname;

// MIME types para diferentes tipos de archivo
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject'
};

// Clientes conectados para WebSocket (simulado con Server-Sent Events)
let clients = [];

// Función para obtener el tipo MIME
function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return MIME_TYPES[ext] || 'application/octet-stream';
}

// Función para servir archivos estáticos
function serveFile(filePath, res) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // Archivo no encontrado
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end(`
                    <!DOCTYPE html>
                    <html>
                    <head><title>404 - No encontrado</title></head>
                    <body>
                        <h1>404 - Archivo no encontrado</h1>
                        <p>El archivo ${filePath} no existe.</p>
                        <a href="/">Volver al inicio</a>
                    </body>
                    </html>
                `);
            } else {
                // Error del servidor
                res.writeHead(500, { 'Content-Type': 'text/html' });
                res.end(`
                    <!DOCTYPE html>
                    <html>
                    <head><title>500 - Error del servidor</title></head>
                    <body>
                        <h1>500 - Error del servidor</h1>
                        <p>Error interno del servidor.</p>
                    </body>
                    </html>
                `);
            }
            return;
        }

        // Servir el archivo
        const mimeType = getMimeType(filePath);
        res.writeHead(200, { 
            'Content-Type': mimeType,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        res.end(data);
    });
}

// Función para monitorear cambios en archivos
function watchFiles() {
    const directories = ['css', 'js', 'assets'];
    
    directories.forEach(dir => {
        const dirPath = path.join(DIRECTORY, dir);
        if (fs.existsSync(dirPath)) {
            fs.watch(dirPath, { recursive: true }, (eventType, filename) => {
                if (filename) {
                    console.log(`📝 Archivo modificado: ${dir}/${filename}`);
                    notifyClients(`Archivo ${dir}/${filename} modificado`);
                }
            });
        }
    });

    // Monitorear archivo principal
    fs.watch(path.join(DIRECTORY, 'index.html'), (eventType, filename) => {
        if (filename) {
            console.log(`📝 Archivo principal modificado: ${filename}`);
            notifyClients('Archivo principal modificado - Recarga recomendada');
        }
    });
}

// Función para notificar a los clientes
function notifyClients(message) {
    clients.forEach(client => {
        try {
            client.write(`data: ${JSON.stringify({ message, timestamp: new Date().toISOString() })}\n\n`);
        } catch (error) {
            // Cliente desconectado, remover de la lista
            const index = clients.indexOf(client);
            if (index > -1) {
                clients.splice(index, 1);
            }
        }
    });
}

// Función para manejar Server-Sent Events
function handleSSE(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Enviar mensaje inicial
    res.write(`data: ${JSON.stringify({ message: 'Conectado al servidor de desarrollo', timestamp: new Date().toISOString() })}\n\n`);

    // Agregar cliente a la lista
    clients.push(res);

    // Manejar desconexión
    req.on('close', () => {
        const index = clients.indexOf(res);
        if (index > -1) {
            clients.splice(index, 1);
        }
    });
}

// Crear servidor HTTP
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url);
    let pathname = parsedUrl.pathname;

    // Manejar Server-Sent Events
    if (pathname === '/dev-events') {
        handleSSE(req, res);
        return;
    }

    // Servir archivo index.html para rutas no encontradas (SPA)
    if (pathname === '/') {
        pathname = '/index.html';
    }

    // Construir ruta del archivo
    let filePath = path.join(DIRECTORY, pathname);

    // Verificar si el archivo existe
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            // Si no existe, intentar con .html
            if (!pathname.endsWith('.html')) {
                filePath = path.join(DIRECTORY, pathname + '.html');
                fs.access(filePath, fs.constants.F_OK, (err2) => {
                    if (err2) {
                        // Archivo no encontrado, servir index.html
                        filePath = path.join(DIRECTORY, 'index.html');
                    }
                    serveFile(filePath, res);
                });
            } else {
                // Archivo no encontrado, servir index.html
                filePath = path.join(DIRECTORY, 'index.html');
                serveFile(filePath, res);
            }
        } else {
            serveFile(filePath, res);
        }
    });
});

// Iniciar servidor
server.listen(PORT, () => {
    console.log('🚀 Servidor de desarrollo iniciado!');
    console.log(`📱 Aplicación disponible en: http://localhost:${PORT}`);
    console.log(`🌐 Abre tu navegador y ve a: http://localhost:${PORT}`);
    console.log('');
    console.log('📋 Información:');
    console.log(`   - Puerto: ${PORT}`);
    console.log(`   - Directorio: ${DIRECTORY}`);
    console.log('   - Hot reload: Activado');
    console.log('   - Monitoreo de archivos: Activado');
    console.log('   - Para detener: Ctrl+C');
    console.log('');
    console.log('⚠️  Nota: Esta es una versión de desarrollo.');
    console.log('   Para producción, configura HTTPS y las variables de entorno.');
    console.log('');
    console.log('🔧 Configuración necesaria:');
    console.log('   1. Edita js/config.js con tus credenciales de Firebase y Supabase');
    console.log('   2. Configura las coordenadas por defecto');
    console.log('   3. Asegúrate de que tu backend esté funcionando');
    console.log('');
    console.log('✨ ¡Disfruta probando la aplicación!');
    console.log('🔄 Los cambios se detectarán automáticamente');
});

// Iniciar monitoreo de archivos
watchFiles();

// Manejar cierre del servidor
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo servidor...');
    server.close(() => {
        console.log('✅ Servidor detenido correctamente');
        process.exit(0);
    });
});

// Manejar errores del servidor
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ Error: El puerto ${PORT} ya está en uso`);
        console.log('💡 Solución: Detén otros procesos en el puerto 8000 o cambia el puerto');
    } else {
        console.error('❌ Error del servidor:', error);
    }
}); 
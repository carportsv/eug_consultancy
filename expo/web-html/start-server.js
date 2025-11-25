#!/usr/bin/env node

// Script simple para iniciar un servidor HTTP local
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 8000;
const ROOT_DIR = __dirname;

// MIME types
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

// Función para obtener el tipo MIME
function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return MIME_TYPES[ext] || 'application/octet-stream';
}

// Función para servir archivos estáticos
function serveFile(filePath, res) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 - Archivo no encontrado');
            return;
        }

        const mimeType = getMimeType(filePath);
        res.writeHead(200, { 
            'Content-Type': mimeType,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        });
        res.end(data);
    });
}

// Función para manejar CORS preflight
function handleCORS(req, res) {
    res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
}

// Crear servidor HTTP
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url);
    let pathname = parsedUrl.pathname;

    // Manejar CORS preflight
    if (req.method === 'OPTIONS') {
        handleCORS(req, res);
        return;
    }

    // Normalizar pathname
    if (pathname === '/') {
        pathname = '/index.html';
    }

    // Construir ruta del archivo
    const filePath = path.join(ROOT_DIR, pathname);

    // Verificar si el archivo existe
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            // Si no existe, intentar con index.html
            if (pathname.endsWith('/')) {
                const indexPath = path.join(ROOT_DIR, pathname, 'index.html');
                fs.access(indexPath, fs.constants.F_OK, (indexErr) => {
                    if (indexErr) {
                        res.writeHead(404, { 'Content-Type': 'text/plain' });
                        res.end('404 - Página no encontrada');
                    } else {
                        serveFile(indexPath, res);
                    }
                });
            } else {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('404 - Archivo no encontrado');
            }
        } else {
            serveFile(filePath, res);
        }
    });
});

// Iniciar servidor
server.listen(PORT, () => {
    console.log('🚀 Servidor web iniciado!');
    console.log(`📱 Aplicación disponible en: http://localhost:${PORT}`);
    console.log(`🌐 Abre tu navegador y ve a: http://localhost:${PORT}`);
    console.log('');
    console.log('📋 Información:');
    console.log(`   - Puerto: ${PORT}`);
    console.log(`   - Directorio: ${ROOT_DIR}`);
    console.log(`   - Para detener: Ctrl+C`);
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
});

// Manejar cierre del servidor
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo servidor...');
    server.close(() => {
        console.log('✅ Servidor detenido correctamente');
        process.exit(0);
    });
});

// Manejar errores
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Error: El puerto ${PORT} ya está en uso`);
        console.log(`💡 Intenta con otro puerto: PORT=8001 node start-server.js`);
    } else {
        console.error('❌ Error del servidor:', err);
    }
    process.exit(1);
}); 
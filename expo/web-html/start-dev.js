const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Iniciando servidor de desarrollo...');
console.log('📁 Directorio:', __dirname);
console.log('');

let serverProcess = null;
let restartCount = 0;
const MAX_RESTARTS = 10;

function startServer() {
    console.log(`🔄 Iniciando servidor (intento ${restartCount + 1}/${MAX_RESTARTS})...`);
    
    // Usar el servidor de desarrollo mejorado
    serverProcess = spawn('node', ['dev-server.js'], {
        cwd: __dirname,
        stdio: 'inherit'
    });

    serverProcess.on('error', (error) => {
        console.error('❌ Error al iniciar el servidor:', error.message);
        handleServerError();
    });

    serverProcess.on('exit', (code, signal) => {
        if (code !== 0 && signal !== 'SIGINT') {
            console.log(`⚠️  Servidor terminado con código ${code}`);
            handleServerError();
        } else {
            console.log('✅ Servidor detenido correctamente');
        }
    });

    // Manejar señales del sistema
    process.on('SIGINT', () => {
        console.log('\n🛑 Deteniendo servidor...');
        if (serverProcess) {
            serverProcess.kill('SIGINT');
        }
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        console.log('\n🛑 Deteniendo servidor...');
        if (serverProcess) {
            serverProcess.kill('SIGTERM');
        }
        process.exit(0);
    });
}

function handleServerError() {
    restartCount++;
    
    if (restartCount >= MAX_RESTARTS) {
        console.error('❌ Máximo número de reintentos alcanzado');
        console.log('💡 Verifica que no haya otros procesos usando el puerto 8000');
        process.exit(1);
    }
    
    console.log(`⏳ Reintentando en 3 segundos... (${restartCount}/${MAX_RESTARTS})`);
    
    setTimeout(() => {
        startServer();
    }, 3000);
}

// Verificar si el puerto está en uso
const net = require('net');
const server = net.createServer();

server.listen(8000, () => {
    server.close(() => {
        console.log('✅ Puerto 8000 disponible');
        startServer();
    });
});

server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error('❌ Puerto 8000 ya está en uso');
        console.log('💡 Soluciones:');
        console.log('   1. Detén otros procesos en el puerto 8000');
        console.log('   2. Usa: taskkill /f /im node.exe');
        console.log('   3. O cambia el puerto en dev-server.js');
        process.exit(1);
    }
}); 
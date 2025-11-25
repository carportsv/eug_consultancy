const fs = require('fs');
const path = require('path');

// Leer el archivo .env de la raíz del proyecto
const envPath = path.resolve(__dirname, '..', '.env');
let envContent = {};

// Verificar si el archivo .env existe
try {
    if (fs.existsSync(envPath)) {
        const envFile = fs.readFileSync(envPath, 'utf8');
        
        // Procesar el archivo .env línea por línea
        envFile.split('\n').forEach(line => {
            // Ignorar comentarios y líneas vacías
            if (line && !line.startsWith('#')) {
                const [key, ...value] = line.split('=');
                if (key && value) {
                    envContent[key.trim()] = value.join('=').trim();
                }
            }
        });
        
        console.log('✅ Archivo .env leído correctamente');
    } else {
        console.warn('⚠️ No se encontró el archivo .env en la raíz del proyecto');
    }
} catch (error) {
    console.error('❌ Error al leer el archivo .env:', error);
    process.exit(1);
}

// Crear el contenido del archivo config.env.js
const configContent = `// Configuración generada automáticamente desde .env
window.ENV = ${JSON.stringify(envContent, null, 2)};
`;

// Escribir el archivo config.env.js
const outputPath = path.resolve(__dirname, 'config.env.js');
fs.writeFileSync(outputPath, configContent);

console.log(`✅ Archivo config.env.js generado en: ${outputPath}`);

// src/index.ts
import app from './app.js';
import { testConnection } from './config/database.js';

// Cargar variables de entorno

const PORT = process.env.PORT || 3000;





// Función para inicializar el servidor
const startServer = async () => {
  try {


    // Probar conexión a la base de datos
    console.log('🔗 Conectando a la base de datos...');
    const dbConnected = await testConnection();

    if (!dbConnected) {
      console.error('❌ No se pudo conectar a la base de datos. Saliendo...');
      process.exit(1);
    }

    // Iniciar servidor HTTP
    const server = app.listen(PORT, () => {
      console.log('\n🚀 ===================================');
      console.log('🚀  TASK MANAGEMENT API');
      console.log('🚀 ===================================');
      console.log(`⚡️ Servidor: http://localhost:${PORT}`);
      console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📦 Versión: ${process.env.API_VERSION || '1.0.0'}`);
      console.log('✅ Base de datos conectada');
      console.log('🔒 Middlewares de seguridad activos');
      console.log('🛡️  Rate limiting configurado');
      console.log('🚀 ===================================\n');

      console.log('📋 Endpoints disponibles:');
      console.log('   GET  /              - Health check');
      console.log('   GET  /health        - Status de salud');
      console.log('   GET  /api           - Info de la API');
      console.log('   POST /api/auth/*    - Rutas de autenticación');
      console.log('');
    });

    // Configurar graceful shutdown
    const gracefulShutdown = (signal: string) => {
      console.log(`\n👋 ${signal} recibido, cerrando servidor graciosamente...`);

      server.close(() => {
        console.log('✅ Servidor HTTP cerrado');

        // Aquí podrías cerrar conexiones de DB, Redis, etc.
        // await pool.end();

        console.log('✅ Todas las conexiones cerradas');
        process.exit(0);
      });

      // Forzar cierre después de 10 segundos
      setTimeout(() => {
        console.error('❌ Forzando cierre del servidor...');
        process.exit(1);
      }, 10000);
    };

    // Manejo de señales de terminación
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Error crítico iniciando el servidor:', error);
    process.exit(1);
  }
};

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Error no capturado:', error);
  console.error('❌ Stack trace:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesa rechazada no manejada en:', promise);
  console.error('❌ Razón:', reason);
  process.exit(1);
});





// Iniciar la aplicación
startServer();
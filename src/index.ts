import app from './app.js';
import { testConnection } from './config/database.js';
import { verifyEmailConfig } from './config/email.js';


const PORT = process.env.PORT || 3000;


const startServer = async () => {
  try {


    console.log('Conectando a la base de datos...');
    const dbConnected = await testConnection();

    if (!dbConnected) {
      console.error('No se pudo conectar a la base de datos. Saliendo...');
      process.exit(1);
    }

    console.log('Verificando configuración de email...');
    const emailConfigured = await verifyEmailConfig();

    if (!emailConfigured) {
      console.warn('Email no configurado correctamente.');
    }

    const server = app.listen(PORT, () => {
      console.log(`Servidor: http://localhost:${PORT}`);
      console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Versión: ${process.env.API_VERSION || '1.0.0'}`);
      console.log('Base de datos conectada');
    });

    const gracefulShutdown = (signal: string) => {
      console.log(`\n👋 ${signal} recibido, cerrando servidor graciosamente...`);

      server.close(() => {
        console.log('Servidor HTTP cerrado');
        console.log('✅ Todas las conexiones cerradas');
        process.exit(0);
      });

      setTimeout(() => {
        console.error('❌ Forzando cierre del servidor...');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('Error crítico iniciando el servidor:', error);
    process.exit(1);
  }
};

process.on('uncaughtException', (error) => {
  console.error('Error no capturado:', error);
  console.error('Stack trace:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promesa rechazada no manejada en:', promise);
  process.exit(1);
});



startServer();
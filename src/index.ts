import express, { type Request, type Response } from 'express';
import { testConnection } from './config/database.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.send('API Node.js + TypeScript ¡Funcionando!');
});

(async () => {
  const ok = await testConnection();
  if (!ok) {
    console.error('No se pudo conectar a la base de datos. Saliendo...');
    process.exit(1); // Termina el proceso si falla
  }

  app.listen(PORT, () => {
    console.log(`⚡️[server]: El servidor se está ejecutando en http://localhost:${PORT}`);
  });
})();
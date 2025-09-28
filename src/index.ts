import express, { type Request, type Response } from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.send('API Node.js + TypeScript ¡Funcionando!');
});

app.listen(PORT, () => {
  console.log(`⚡️[server]: El servidor se está ejecutando en http://localhost:${PORT}`);
});
import { Request, Response, NextFunction } from 'express';

// Intercepte toutes les erreurs non gérées et retourne une réponse JSON propre
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error(err.stack);
  res.status(500).json({ error: 'Erreur serveur interne' });
}

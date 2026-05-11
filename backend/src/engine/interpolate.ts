// Contexte disponible lors de l'exécution d'un workflow
export interface ExecutionContext {
  trigger: Record<string, unknown>;
  steps: Record<number, { output: unknown }>;
}

// Résout un chemin pointé ("trigger.from", "steps.0.output.id") dans un objet
function resolvePath(path: string, context: ExecutionContext): string {
  const parts = path.trim().split('.');

  // Seules les racines "trigger" et "steps" sont autorisées — pas d'accès à process, env, etc.
  const root = parts[0];
  if (root !== 'trigger' && root !== 'steps') return `{{${path}}}`;

  let current: unknown = context;

  for (const part of parts) {
    if (current === null || current === undefined) return `{{${path}}}`;
    if (typeof current !== 'object') return `{{${path}}}`;
    current = (current as Record<string, unknown>)[part];
  }

  if (current === null || current === undefined) return `{{${path}}}`;

  // Les objets sont sérialisés en JSON pour qu'ils restent injectables dans une config
  if (typeof current === 'object') return JSON.stringify(current);

  return String(current);
}

// Remplace toutes les occurrences de {{chemin}} dans une valeur de config
export function interpolate(value: unknown, context: ExecutionContext): unknown {
  if (typeof value === 'string') {
    return value.replace(/\{\{([^}]+)\}\}/g, (_, path: string) =>
      resolvePath(path, context)
    );
  }

  // Descend récursivement dans les objets et tableaux pour résoudre toutes les variables
  if (Array.isArray(value)) {
    return value.map((item) => interpolate(item, context));
  }

  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, interpolate(v, context)])
    );
  }

  return value;
}

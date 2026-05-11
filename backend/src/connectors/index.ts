import { Credential } from '../generated/prisma/client';

// Signature commune à toutes les actions de connecteur
export type ConnectorAction = (
  params: Record<string, unknown>,
  credential?: Credential
) => Promise<unknown>;

export interface ConnectorRegistry {
  [connector: string]: {
    [action: string]: ConnectorAction;
  };
}

// Les connecteurs sont implémentés au Sprint 2
// Le registry est vide pour l'instant — le worker gère le cas "connecteur inconnu"
export const connectors: ConnectorRegistry = {};

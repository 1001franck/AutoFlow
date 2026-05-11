import { Credential } from '../generated/prisma/client';
import delay from './delay';
import webhook from './webhook';
import discord from './discord';
import telegram from './telegram';

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

export const connectors: ConnectorRegistry = {
  delay,
  webhook,
  discord,
  telegram,
};

import { ConnectorAction } from './index';

// Met en pause l'exécution du workflow pour N secondes
const wait: ConnectorAction = async (params) => {
  const seconds = Number(params['seconds']) || 1;
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  return { waited: seconds };
};

export default { wait };

export type Lang = 'fr' | 'en';

export const T = {
  fr: {
    // Dashboard
    dashTitle: 'Tableau de bord',
    totalRuns: 'Exécutions totales',
    successRate: 'Taux de succès',
    activeWorkflows: 'Workflows actifs',
    last7Days: '7 derniers jours',
    topWorkflows: 'Top workflows',

    // Commun
    active: 'Actif',
    inactive: 'Inactif',
    cancel: 'Annuler',
    delete: 'Supprimer',
    comingSoon: 'À venir',

    // Triggers
    triggerWebhook: 'Webhook',
    triggerCron: 'Planifié',
    triggerGmail: 'Gmail',
    triggerManual: 'Manuel',

    // Workflows liste
    noWorkflows: 'Aucun workflow',
    noWorkflowsSub: 'Créez votre premier workflow depuis le web',
    deleteTitle: (n: string) => `Supprimer « ${n} » ?`,
    deleteMsg: 'Cette action est irréversible.',
    stepsCount: (n: number) => `${n} étape${n !== 1 ? 's' : ''}`,
    runsCount: (n: number) => `${n} run${n !== 1 ? 's' : ''}`,

    // Settings
    account: 'Compte',
    logout: 'Déconnexion',
    language: 'Langue',

    // Notifications
    notifications: 'Notifications',

    // Services
    services: 'Services',

    // Création workflow
    newWorkflow: 'Nouveau workflow',
    save: 'Sauvegarder',
    nameLabel: 'Nom',
    triggerSection: 'Déclencheur',
    stepsSection: 'Étapes',
    addStep: 'Ajouter une étape',
    chooseAccount: 'Choisir un compte…',
    webhookNote: "L'URL webhook sera générée à la sauvegarde.",
    noAccount: (c: string) => `Aucun compte ${c} — ajoutez-en depuis le web.`,
    chooseAccountTitle: 'Choisir un compte',

    // Onglets
    tabHome: 'Accueil',
    tabWorkflows: 'Workflows',
    tabServices: 'Services',
    tabNotifs: 'Notifs',
    tabAccount: 'Compte',

    // Types d'actions
    actionDiscord: 'Discord — Message',
    actionTelegram: 'Telegram — Message',
    actionGmail: 'Gmail — Email',
    actionNotion: 'Notion — Page',
    actionHttp: 'HTTP POST',
    actionDelay: 'Délai',

    // Labels de champs
    fieldCronExpr: 'Expression cron',
    fieldGmailAccount: 'Compte Gmail',
    fieldGmailLabel: 'Label Gmail',
    fieldDiscordAccount: 'Compte Discord',
    fieldChannelId: 'Channel ID',
    fieldMessage: 'Message',
    fieldTelegramAccount: 'Compte Telegram',
    fieldChatId: 'Chat ID',
    fieldTo: 'Destinataire',
    fieldSubject: 'Sujet',
    fieldBody: 'Corps',
    fieldNotionAccount: 'Compte Notion',
    fieldDatabaseId: 'Database ID',
    fieldTitle: 'Titre',
    fieldUrl: 'URL',
    fieldJsonBody: 'Corps JSON',
    fieldDuration: 'Durée (ms)',
  },
  en: {
    // Dashboard
    dashTitle: 'Dashboard',
    totalRuns: 'Total runs',
    successRate: 'Success rate',
    activeWorkflows: 'Active workflows',
    last7Days: 'Last 7 days',
    topWorkflows: 'Top workflows',

    // Commun
    active: 'Active',
    inactive: 'Inactive',
    cancel: 'Cancel',
    delete: 'Delete',
    comingSoon: 'Coming soon',

    // Triggers
    triggerWebhook: 'Webhook',
    triggerCron: 'Scheduled',
    triggerGmail: 'Gmail',
    triggerManual: 'Manual',

    // Workflows liste
    noWorkflows: 'No workflows',
    noWorkflowsSub: 'Create your first workflow from the web',
    deleteTitle: (n: string) => `Delete "${n}"?`,
    deleteMsg: 'This action cannot be undone.',
    stepsCount: (n: number) => `${n} step${n !== 1 ? 's' : ''}`,
    runsCount: (n: number) => `${n} run${n !== 1 ? 's' : ''}`,

    // Settings
    account: 'Account',
    logout: 'Log out',
    language: 'Language',

    // Notifications
    notifications: 'Notifications',

    // Services
    services: 'Services',

    // Création workflow
    newWorkflow: 'New workflow',
    save: 'Save',
    nameLabel: 'Name',
    triggerSection: 'Trigger',
    stepsSection: 'Steps',
    addStep: 'Add a step',
    chooseAccount: 'Choose an account…',
    webhookNote: 'The webhook URL will be generated on save.',
    noAccount: (c: string) => `No ${c} account — add one from the web.`,
    chooseAccountTitle: 'Choose an account',

    // Onglets
    tabHome: 'Home',
    tabWorkflows: 'Workflows',
    tabServices: 'Services',
    tabNotifs: 'Notifs',
    tabAccount: 'Account',

    // Types d'actions
    actionDiscord: 'Discord — Message',
    actionTelegram: 'Telegram — Message',
    actionGmail: 'Gmail — Email',
    actionNotion: 'Notion — Page',
    actionHttp: 'HTTP POST',
    actionDelay: 'Delay',

    // Labels de champs
    fieldCronExpr: 'Cron expression',
    fieldGmailAccount: 'Gmail account',
    fieldGmailLabel: 'Gmail label',
    fieldDiscordAccount: 'Discord account',
    fieldChannelId: 'Channel ID',
    fieldMessage: 'Message',
    fieldTelegramAccount: 'Telegram account',
    fieldChatId: 'Chat ID',
    fieldTo: 'Recipient',
    fieldSubject: 'Subject',
    fieldBody: 'Body',
    fieldNotionAccount: 'Notion account',
    fieldDatabaseId: 'Database ID',
    fieldTitle: 'Title',
    fieldUrl: 'URL',
    fieldJsonBody: 'JSON body',
    fieldDuration: 'Duration (ms)',
  },
};

export type Tr = typeof T.fr;

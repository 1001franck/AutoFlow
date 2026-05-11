import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  type NodeMouseHandler,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { ArrowLeft, Save, Plus, X, Link } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api from '@/api/client';
import { useToast } from '@/components/ui/Toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StepData {
  label: string;
  type: string;
  config: Record<string, string>;
}

interface WorkflowPayload {
  name: string;
  triggerType: string;
  triggerConfig: Record<string, string>;
  steps: { name: string; type: string; config: Record<string, string>; order: number }[];
}

interface WorkflowDetail {
  id: string;
  name: string;
  triggerType: string;
  triggerConfig: Record<string, string>;
  webhookToken: string | null;
  // La BDD stocke connector + action séparément et position au lieu de order
  steps: { id: string; connector: string; action: string; config: Record<string, string>; position: number; credentialId: string | null }[];
}

interface Credential {
  id: string;
  label: string;
  connector: string;
}

// ─── Catalogue ────────────────────────────────────────────────────────────────

const TRIGGER_TYPES = [
  { type: 'webhook',    label: 'Webhook entrant' },
  { type: 'cron',       label: 'Planification (cron)' },
  { type: 'gmail_poll', label: 'Réception email (Gmail)' },
];

const ACTION_TYPES = [
  { type: 'discord.send_message',  label: 'Discord — Message' },
  { type: 'telegram.send_message', label: 'Telegram — Message' },
  { type: 'gmail.send_email',      label: 'Gmail — Envoyer email' },
  { type: 'notion.create_page',    label: 'Notion — Créer page' },
  { type: 'webhook.http_post',     label: 'HTTP POST' },
  { type: 'delay.wait',            label: 'Délai' },
];

// Champs de config par type d'action
type FieldDef = { key: string; label: string; placeholder: string; credential?: string };

const ACTION_FIELDS: Record<string, FieldDef[]> = {
  'discord.send_message': [
    { key: 'credentialId', label: 'Identifiant Discord', placeholder: '', credential: 'discord' },
    { key: 'channelId',    label: 'Channel ID',          placeholder: '123456789' },
    { key: 'message',      label: 'Message',             placeholder: 'Bonjour {{trigger.body.name}}' },
  ],
  'telegram.send_message': [
    { key: 'credentialId', label: 'Identifiant Telegram', placeholder: '', credential: 'telegram' },
    { key: 'chatId',       label: 'Chat ID',              placeholder: '-1001234567' },
    { key: 'message',      label: 'Message',              placeholder: 'Bonjour {{trigger.body.name}}' },
  ],
  'gmail.send_email': [
    { key: 'credentialId', label: 'Identifiant Gmail', placeholder: '', credential: 'gmail' },
    { key: 'to',           label: 'Destinataire',      placeholder: 'user@example.com' },
    { key: 'subject',      label: 'Sujet',             placeholder: 'Nouveau message de {{trigger.body.name}}' },
    { key: 'body',         label: 'Corps',             placeholder: 'Contenu de l\'email…' },
  ],
  'notion.create_page': [
    { key: 'credentialId', label: 'Identifiant Notion', placeholder: '', credential: 'notion' },
    { key: 'databaseId',   label: 'Database ID',        placeholder: 'abc123...' },
    { key: 'title',        label: 'Titre',              placeholder: '{{trigger.body.name}}' },
  ],
  'webhook.http_post': [
    { key: 'url',    label: 'URL',    placeholder: 'https://example.com/webhook' },
    { key: 'body',   label: 'Corps',  placeholder: '{"key": "{{trigger.body.value}}"}' },
  ],
  'delay.wait': [
    { key: 'ms', label: 'Durée (ms)', placeholder: '1000' },
  ],
};

const TRIGGER_FIELDS: Record<string, FieldDef[]> = {
  cron:       [{ key: 'expression', label: 'Expression cron', placeholder: '0 9 * * 1-5' }],
  gmail_poll: [
    { key: 'credentialId', label: 'Identifiant Gmail', placeholder: '', credential: 'gmail' },
    { key: 'label',        label: 'Label Gmail',       placeholder: 'INBOX' },
  ],
  webhook: [],
};

// ─── Styles des nœuds ─────────────────────────────────────────────────────────

const NODE_STYLE = {
  background: 'var(--color-card)',
  border: '1px solid var(--color-border)',
  borderRadius: '10px',
  padding: '10px 16px',
  fontSize: '13px',
  color: 'var(--color-foreground)',
  minWidth: 180,
};

const TRIGGER_STYLE = { ...NODE_STYLE, borderColor: 'var(--color-foreground)', fontWeight: 600 };
const SELECTED_STYLE = { ...NODE_STYLE, borderColor: 'var(--color-foreground)', borderWidth: 2 };

// ─── Conversion workflow ↔ nœuds ──────────────────────────────────────────────

function workflowToGraph(wf: WorkflowDetail): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [
    {
      id: 'trigger',
      type: 'default',
      position: { x: 250, y: 40 },
      data: { label: TRIGGER_TYPES.find((t) => t.type === wf.triggerType)?.label ?? wf.triggerType, type: wf.triggerType, config: wf.triggerConfig },
      style: TRIGGER_STYLE,
    },
    ...wf.steps.map((s, i) => {
      // Reconstruit le type composite (ex: 'discord.send_message') depuis connector + action
      const type = `${s.connector}.${s.action}`;
      const label = ACTION_TYPES.find((a) => a.type === type)?.label ?? type;
      // Réinjecte credentialId dans le config pour que le panneau de config l'affiche
      const config = s.credentialId ? { ...s.config, credentialId: s.credentialId } : s.config;
      return {
        id: s.id,
        type: 'default' as const,
        position: { x: 250, y: 160 + i * 120 },
        data: { label, type, config },
        style: NODE_STYLE,
      };
    }),
  ];
  const ids = ['trigger', ...wf.steps.map((s) => s.id)];
  const edges: Edge[] = ids.slice(0, -1).map((src, i) => ({
    id: `e-${i}`, source: src, target: ids[i + 1],
    style: { stroke: 'var(--color-border)' },
  }));
  return { nodes, edges };
}

// ─── Panneau de configuration d'un nœud ───────────────────────────────────────

function ConfigPanel({
  node,
  credentials,
  triggerConfig,
  onTriggerConfig,
  onUpdateNode,
  onClose,
}: {
  node: Node;
  credentials: Credential[];
  triggerConfig: Record<string, string>;
  onTriggerConfig: (cfg: Record<string, string>) => void;
  onUpdateNode: (id: string, patch: Partial<StepData>) => void;
  onClose: () => void;
}) {
  const isTrigger = node.id === 'trigger';
  const nodeType = String(node.data.type ?? '');
  const fields = isTrigger
    ? (TRIGGER_FIELDS[nodeType] ?? [])
    : (ACTION_FIELDS[nodeType] ?? []);

  const config = isTrigger ? triggerConfig : ((node.data.config as Record<string, string>) ?? {});
  const setField = (key: string, value: string) => {
    if (isTrigger) {
      onTriggerConfig({ ...config, [key]: value });
    } else {
      onUpdateNode(node.id, { config: { ...config, [key]: value } });
    }
  };

  return (
    <aside className="w-64 shrink-0 border-l border-(--color-border) bg-(--color-background) overflow-y-auto flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-(--color-border)">
        <p className="text-xs font-semibold truncate">{String(node.data.label)}</p>
        <button onClick={onClose} className="text-(--color-muted-foreground) hover:text-(--color-foreground)">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex flex-col gap-4 p-4">
        {/* Nom du nœud (sauf trigger) */}
        {!isTrigger && (
          <Input
            id="node-label"
            label="Nom de l'étape"
            value={String(node.data.label)}
            onChange={(e) => onUpdateNode(node.id, { label: e.target.value })}
          />
        )}

        {fields.length === 0 && (
          <p className="text-xs text-(--color-muted-foreground)">Aucune configuration requise.</p>
        )}

        {fields.map((f) =>
          f.credential ? (
            <div key={f.key} className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">{f.label}</label>
              <select
                value={config[f.key] ?? ''}
                onChange={(e) => setField(f.key, e.target.value)}
                className="h-10 w-full rounded-lg border border-(--color-border) bg-(--color-background) px-3 text-sm text-(--color-foreground) outline-none focus:border-(--color-foreground) transition-colors"
              >
                <option value="">— Choisir —</option>
                {credentials
                  .filter((c) => c.connector === f.credential)
                  .map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
              </select>
            </div>
          ) : (
            <Input
              key={f.key}
              id={`node-${f.key}`}
              label={f.label}
              placeholder={f.placeholder}
              value={config[f.key] ?? ''}
              onChange={(e) => setField(f.key, e.target.value)}
            />
          )
        )}
      </div>
    </aside>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function WorkflowEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const [name, setName] = useState('Nouveau workflow');
  const [triggerType, setTriggerType] = useState(TRIGGER_TYPES[0].type);
  const [triggerConfig, setTriggerConfig] = useState<Record<string, string>>({});
  const [webhookToken, setWebhookToken] = useState<string | null>(null);
  // Compteur stable pour générer des IDs de nœuds uniques sans appeler Date.now() au rendu
  const stepCounter = useRef(0);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const { data: credentials = [] } = useQuery<Credential[]>({
    queryKey: ['credentials'],
    queryFn: () => api.get('/credentials').then((r) => r.data),
  });

  const { data: existing } = useQuery<WorkflowDetail>({
    queryKey: ['workflow', id],
    queryFn: () => api.get(`/workflows/${id}`).then((r) => r.data),
    enabled: !isNew,
  });

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setTriggerType(existing.triggerType);
      setTriggerConfig(existing.triggerConfig);
      setWebhookToken(existing.webhookToken);
      const { nodes: n, edges: e } = workflowToGraph(existing);
      setNodes(n);
      setEdges(e);
    } else if (isNew) {
      setNodes([{
        id: 'trigger',
        type: 'default',
        position: { x: 250, y: 40 },
        data: { label: TRIGGER_TYPES[0].label, type: TRIGGER_TYPES[0].type, config: {} },
        style: TRIGGER_STYLE,
      }]);
    }
  }, [existing, isNew, setNodes, setEdges]);

  const onConnect = useCallback(
    (c: Connection) =>
      setEdges((eds) => addEdge({ ...c, style: { stroke: 'var(--color-border)' } }, eds)),
    [setEdges]
  );

  const onNodeClick: NodeMouseHandler = useCallback((_evt, node) => {
    setSelectedNode(node);
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        style: n.id === node.id
          ? (n.id === 'trigger' ? { ...TRIGGER_STYLE, borderWidth: 2 } : SELECTED_STYLE)
          : (n.id === 'trigger' ? TRIGGER_STYLE : NODE_STYLE),
      }))
    );
  }, [setNodes]);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setNodes((nds) =>
      nds.map((n) => ({ ...n, style: n.id === 'trigger' ? TRIGGER_STYLE : NODE_STYLE }))
    );
  }, [setNodes]);

  const updateNode = (nodeId: string, patch: Partial<StepData>) => {
    setNodes((nds) =>
      nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n)
    );
    setSelectedNode((prev) =>
      prev?.id === nodeId ? { ...prev, data: { ...prev.data, ...patch } } : prev
    );
  };

  const addStep = (type: string, label: string) => {
    const stepId = `step-${++stepCounter.current}`;
    const y = nodes.length > 0 ? Math.max(...nodes.map((n) => n.position.y)) + 120 : 160;
    const newNode: Node = {
      id: stepId, type: 'default',
      position: { x: 250, y },
      data: { label, type, config: {} },
      style: NODE_STYLE,
    };
    const lastId = nodes.at(-1)?.id;
    setNodes((nds) => [...nds, newNode]);
    if (lastId) {
      setEdges((eds) => [
        ...eds,
        { id: `e-${lastId}-${stepId}`, source: lastId, target: stepId, style: { stroke: 'var(--color-border)' } },
      ]);
    }
  };

  const buildPayload = (): WorkflowPayload => ({
    name,
    triggerType,
    triggerConfig,
    steps: nodes
      .filter((n) => n.id !== 'trigger')
      .map((n, i) => ({
        name: String(n.data.label),
        type: String(n.data.type ?? ''),
        config: (n.data.config as Record<string, string>) ?? {},
        order: i,
      })),
  });

  const toast = useToast();

  const save = useMutation({
    mutationFn: () =>
      isNew
        ? api.post('/workflows', buildPayload())
        : api.put(`/workflows/${id}`, buildPayload()),
    onSuccess: (res) => {
      toast('Workflow sauvegardé', 'success');
      // Si c'est un nouveau workflow webhook, redirige vers l'éditeur pour afficher l'URL
      if (isNew && buildPayload().triggerType === 'webhook') {
        navigate(`/workflows/${res.data.id}/edit`);
      } else {
        navigate('/workflows');
      }
    },
    onError: () => toast('Erreur lors de la sauvegarde', 'error'),
  });

  return (
    <div className="flex flex-col h-screen bg-(--color-background)">
      {/* Barre du haut */}
      <header className="h-14 flex items-center justify-between px-6 border-b border-(--color-border) bg-(--color-background) z-10 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/workflows')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Input
            id="wf-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 w-56 text-sm font-medium border-transparent hover:border-(--color-border) focus:border-(--color-foreground)"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* URL webhook — visible uniquement si le trigger est de type webhook et que le workflow existe */}
          {triggerType === 'webhook' && webhookToken && (
            <button
              onClick={() => {
                const url = `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/webhook/${id}/${webhookToken}`;
                navigator.clipboard.writeText(url);
                toast('URL webhook copiée', 'success');
              }}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-(--color-border) text-xs text-(--color-muted-foreground) hover:text-(--color-foreground) hover:border-(--color-foreground) transition-colors"
            >
              <Link className="h-3 w-3" />
              Copier l'URL webhook
            </button>
          )}
          <select
            value={triggerType}
            onChange={(e) => {
              const t = e.target.value;
              setTriggerType(t);
              setTriggerConfig({});
              const label = TRIGGER_TYPES.find((x) => x.type === t)?.label ?? t;
              setNodes((nds) =>
                nds.map((n) =>
                  n.id === 'trigger'
                    ? { ...n, data: { ...n.data, label, type: t, config: {} }, style: TRIGGER_STYLE }
                    : n
                )
              );
            }}
            className="h-8 rounded-lg border border-(--color-border) bg-(--color-background) px-3 text-xs text-(--color-foreground) outline-none"
          >
            {TRIGGER_TYPES.map((t) => (
              <option key={t.type} value={t.type}>{t.label}</option>
            ))}
          </select>

          <Button size="sm" disabled={save.isPending} onClick={() => save.mutate()} className="gap-1.5">
            <Save className="h-3.5 w-3.5" />
            {save.isPending ? 'Sauvegarde…' : 'Sauvegarder'}
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Panneau gauche — catalogue */}
        <aside className="w-52 shrink-0 border-r border-(--color-border) bg-(--color-background) overflow-y-auto">
          <p className="px-4 py-3 text-xs font-semibold text-(--color-muted-foreground) uppercase tracking-wide">
            Actions
          </p>
          {ACTION_TYPES.map((a) => (
            <button
              key={a.type}
              onClick={() => addStep(a.type, a.label)}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-left hover:bg-(--color-muted) transition-colors"
            >
              <Plus className="h-3 w-3 shrink-0 text-(--color-muted-foreground)" />
              {a.label}
            </button>
          ))}
        </aside>

        {/* Canvas */}
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            deleteKeyCode="Delete"
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--color-border)" />
            <Controls showInteractive={false} />
            <MiniMap
              nodeColor="var(--color-muted)"
              maskColor="transparent"
              style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
            />
          </ReactFlow>
        </div>

        {/* Panneau droit — config du nœud sélectionné */}
        {selectedNode && (
          <ConfigPanel
            node={selectedNode}
            credentials={credentials}
            triggerConfig={triggerConfig}
            onTriggerConfig={setTriggerConfig}
            onUpdateNode={updateNode}
            onClose={() => {
              setSelectedNode(null);
              setNodes((nds) =>
                nds.map((n) => ({ ...n, style: n.id === 'trigger' ? TRIGGER_STYLE : NODE_STYLE }))
              );
            }}
          />
        )}
      </div>
    </div>
  );
}

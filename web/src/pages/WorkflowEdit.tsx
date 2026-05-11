import { useCallback, useEffect, useState } from 'react';
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
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { ArrowLeft, Save, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api from '@/api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StepData {
  label: string;
  type: string;
  config: Record<string, unknown>;
}

interface WorkflowPayload {
  name: string;
  description?: string;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  steps: { name: string; type: string; config: Record<string, unknown>; order: number }[];
}

interface WorkflowDetail {
  id: string;
  name: string;
  description: string | null;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  steps: { id: string; name: string; type: string; config: Record<string, unknown>; order: number }[];
}

// ─── Catalogue des blocs disponibles ─────────────────────────────────────────

const TRIGGER_TYPES = [
  { type: 'webhook',    label: 'Webhook entrant' },
  { type: 'cron',       label: 'Planification (cron)' },
  { type: 'gmail_poll', label: 'Réception email (Gmail)' },
];

const ACTION_TYPES = [
  { type: 'discord.send_message',  label: 'Discord — Envoyer message' },
  { type: 'telegram.send_message', label: 'Telegram — Envoyer message' },
  { type: 'gmail.send_email',      label: 'Gmail — Envoyer email' },
  { type: 'notion.create_page',    label: 'Notion — Créer page' },
  { type: 'webhook.http_post',     label: 'HTTP POST' },
  { type: 'delay.wait',            label: 'Délai' },
];

// ─── Styles des nœuds ─────────────────────────────────────────────────────────

const NODE_STYLE = {
  background: 'var(--color-card)',
  border: '1px solid var(--color-border)',
  borderRadius: '10px',
  padding: '10px 16px',
  fontSize: '13px',
  color: 'var(--color-foreground)',
  minWidth: 160,
};

const TRIGGER_STYLE = {
  ...NODE_STYLE,
  borderColor: '#000',
  fontWeight: 600,
};

// ─── Conversion workflow ↔ nœuds RF ──────────────────────────────────────────

function workflowToNodes(wf: WorkflowDetail): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [
    {
      id: 'trigger',
      type: 'default',
      position: { x: 250, y: 40 },
      data: { label: TRIGGER_TYPES.find((t) => t.type === wf.triggerType)?.label ?? wf.triggerType },
      style: TRIGGER_STYLE,
    },
    ...wf.steps.map((s, i) => ({
      id: s.id,
      type: 'default' as const,
      position: { x: 250, y: 160 + i * 120 },
      data: { label: s.name } as StepData & { label: string },
      style: NODE_STYLE,
    })),
  ];

  const ids = ['trigger', ...wf.steps.map((s) => s.id)];
  const edges: Edge[] = ids.slice(0, -1).map((id, i) => ({
    id: `e-${i}`,
    source: id,
    target: ids[i + 1],
    style: { stroke: 'var(--color-border)' },
  }));

  return { nodes, edges };
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function WorkflowEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const [name, setName] = useState('Nouveau workflow');
  const [triggerType, setTriggerType] = useState(TRIGGER_TYPES[0].type);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Chargement en mode édition
  const { data: existing } = useQuery<WorkflowDetail>({
    queryKey: ['workflow', id],
    queryFn: () => api.get(`/workflows/${id}`).then((r) => r.data),
    enabled: !isNew,
  });

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setTriggerType(existing.triggerType);
      const { nodes: n, edges: e } = workflowToNodes(existing);
      setNodes(n);
      setEdges(e);
    } else if (isNew) {
      setNodes([
        {
          id: 'trigger',
          type: 'default',
          position: { x: 250, y: 40 },
          data: { label: TRIGGER_TYPES[0].label },
          style: TRIGGER_STYLE,
        },
      ]);
    }
  }, [existing, isNew, setNodes, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((eds) =>
        addEdge({ ...connection, style: { stroke: 'var(--color-border)' } }, eds)
      ),
    [setEdges]
  );

  // Ajout d'une étape
  const addStep = (type: string, label: string) => {
    const id = `step-${Date.now()}`;
    const y = nodes.length > 0
      ? Math.max(...nodes.map((n) => n.position.y)) + 120
      : 160;

    const newNode: Node = {
      id,
      type: 'default',
      position: { x: 250, y },
      data: { label },
      style: NODE_STYLE,
    };

    setNodes((nds) => [...nds, newNode]);

    // Connecte automatiquement au dernier nœud
    const lastId = nodes.at(-1)?.id;
    if (lastId) {
      setEdges((eds) => [
        ...eds,
        { id: `e-${lastId}-${id}`, source: lastId, target: id, style: { stroke: 'var(--color-border)' } },
      ]);
    }

    // Met à jour le type de la step dans la data du nœud
    setNodes((nds) =>
      nds.map((n) => n.id === id ? { ...n, data: { ...n.data, type, config: {} } } : n)
    );
  };

  // Sauvegarde
  const buildPayload = (): WorkflowPayload => {
    const stepNodes = nodes.filter((n) => n.id !== 'trigger');
    return {
      name,
      triggerType,
      triggerConfig: {},
      steps: stepNodes.map((n, i) => ({
        name: String(n.data.label),
        type: String((n.data as StepData).type ?? ''),
        config: (n.data as StepData).config ?? {},
        order: i,
      })),
    };
  };

  const save = useMutation({
    mutationFn: () =>
      isNew
        ? api.post('/workflows', buildPayload())
        : api.put(`/workflows/${id}`, buildPayload()),
    onSuccess: () => navigate('/workflows'),
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
          <select
            value={triggerType}
            onChange={(e) => {
              setTriggerType(e.target.value);
              const label = TRIGGER_TYPES.find((t) => t.type === e.target.value)?.label ?? e.target.value;
              setNodes((nds) =>
                nds.map((n) => n.id === 'trigger' ? { ...n, data: { label }, style: TRIGGER_STYLE } : n)
              );
            }}
            className="h-8 rounded-lg border border-(--color-border) bg-(--color-background) px-3 text-xs text-(--color-foreground) outline-none"
          >
            {TRIGGER_TYPES.map((t) => (
              <option key={t.type} value={t.type}>{t.label}</option>
            ))}
          </select>

          <Button
            size="sm"
            disabled={save.isPending}
            onClick={() => save.mutate()}
            className="gap-1.5"
          >
            <Save className="h-3.5 w-3.5" />
            {save.isPending ? 'Sauvegarde…' : 'Sauvegarder'}
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Panneau gauche — catalogue d'actions */}
        <aside className="w-56 shrink-0 border-r border-(--color-border) bg-(--color-background) overflow-y-auto">
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

        {/* Canvas React Flow */}
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            deleteKeyCode="Delete"
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="var(--color-border)"
            />
            <Controls showInteractive={false} />
            <MiniMap
              nodeColor="var(--color-muted)"
              maskColor="transparent"
              style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
            />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Pressable, ActivityIndicator, useColorScheme, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { RootStackParamList } from '../../App';
import api from '../api/client';
import { useLang } from '../contexts/LanguageContext';
import type { Tr } from '../i18n';

const THEME = {
  light: {
    bg: '#ffffff', card: '#f9fafb', border: '#e5e7eb',
    text: '#000000', muted: '#6b7280', sub: '#9ca3af', input: '#ffffff',
  },
  dark: {
    bg: '#0a0a0a', card: '#1a1a1a', border: '#2a2a2a',
    text: '#ffffff', muted: '#9ca3af', sub: '#6b7280', input: '#111111',
  },
};

interface Credential { id: string; label: string; connector: string; }
interface StepForm { uid: string; type: string; label: string; config: Record<string, string>; }
type FieldDef = { key: string; label: string; placeholder: string; credential?: string; multiline?: boolean; required?: boolean };

const TRIGGER_TYPES = [
  { type: 'webhook' },
  { type: 'cron' },
  { type: 'gmail_poll' },
];

const ACTION_TYPES = [
  { type: 'discord.send_message' },
  { type: 'telegram.send_message' },
  { type: 'gmail.send_email' },
  { type: 'notion.create_page' },
  { type: 'webhook.http_post' },
  { type: 'delay.wait' },
];

function getTriggerFields(t: Tr): Record<string, FieldDef[]> {
  return {
    cron:       [{ key: 'expression', label: t.fieldCronExpr, placeholder: '0 9 * * 1-5', required: true }],
    gmail_poll: [
      { key: 'credentialId', label: t.fieldGmailAccount, placeholder: '', credential: 'gmail', required: true },
      { key: 'label',        label: t.fieldGmailLabel,   placeholder: 'INBOX', required: true },
    ],
    webhook: [],
  };
}

function getActionFields(t: Tr): Record<string, FieldDef[]> {
  return {
    'discord.send_message': [
      { key: 'credentialId', label: t.fieldDiscordAccount, placeholder: '', credential: 'discord', required: true },
      { key: 'channelId',    label: t.fieldChannelId,      placeholder: '123456789', required: true },
      { key: 'message',      label: t.fieldMessage,        placeholder: '{{trigger.body.name}}', required: true },
    ],
    'telegram.send_message': [
      { key: 'credentialId', label: t.fieldTelegramAccount, placeholder: '', credential: 'telegram', required: true },
      { key: 'chatId',       label: t.fieldChatId,          placeholder: '-1001234567', required: true },
      { key: 'message',      label: t.fieldMessage,         placeholder: '{{trigger.body.name}}', required: true },
    ],
    'gmail.send_email': [
      { key: 'credentialId', label: t.fieldGmailAccount, placeholder: '', credential: 'gmail', required: true },
      { key: 'to',           label: t.fieldTo,           placeholder: 'user@example.com', required: true },
      { key: 'subject',      label: t.fieldSubject,      placeholder: '...', required: true },
      { key: 'body',         label: t.fieldBody,         placeholder: '...', multiline: true },
    ],
    'notion.create_page': [
      { key: 'credentialId', label: t.fieldNotionAccount, placeholder: '', credential: 'notion', required: true },
      { key: 'databaseId',   label: t.fieldDatabaseId,   placeholder: 'abc123...', required: true },
      { key: 'title',        label: t.fieldTitle,        placeholder: '{{trigger.body.name}}' },
    ],
    'webhook.http_post': [
      { key: 'url',  label: t.fieldUrl,      placeholder: 'https://example.com/webhook', required: true },
      { key: 'body', label: t.fieldJsonBody, placeholder: '{"key": "value"}', multiline: true },
    ],
    'delay.wait': [
      { key: 'ms', label: t.fieldDuration, placeholder: '1000', required: true },
    ],
  };
}

type C = typeof THEME.dark;
type Nav = NativeStackNavigationProp<RootStackParamList>;
type CredPicker = { stepUid: string; fieldKey: string; connector: string } | null;

// ─── Champ de formulaire ──────────────────────────────────────────────────────

function Field({
  f, value, c, error, onChangeText, onCredentialPress,
}: {
  f: FieldDef; value: string; c: C; error?: string;
  onChangeText: (v: string) => void;
  onCredentialPress: () => void;
}) {
  const { t } = useLang();
  const hasError = !!error;
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: c.muted }]}>{f.label}</Text>
      {f.credential ? (
        <TouchableOpacity
          style={[
            styles.credBtn,
            { backgroundColor: c.input, borderColor: hasError ? '#ef4444' : c.border },
          ]}
          onPress={onCredentialPress}
          activeOpacity={0.7}
        >
          <Text style={[styles.credBtnText, { color: value ? c.text : c.sub }]} numberOfLines={1}>
            {value || t.chooseAccount}
          </Text>
          <Ionicons name="chevron-down" size={14} color={c.sub} />
        </TouchableOpacity>
      ) : (
        <TextInput
          style={[
            styles.input,
            { backgroundColor: c.input, borderColor: hasError ? '#ef4444' : c.border, color: c.text },
            f.multiline && styles.inputMulti,
          ]}
          placeholder={f.placeholder}
          placeholderTextColor={c.sub}
          value={value}
          onChangeText={onChangeText}
          multiline={f.multiline}
          numberOfLines={f.multiline ? 3 : 1}
          autoCapitalize="none"
          autoCorrect={false}
          textAlignVertical={f.multiline ? 'top' : 'center'}
        />
      )}
      {hasError && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────────

export function WorkflowCreateScreen() {
  const scheme = useColorScheme();
  const c = THEME[scheme === 'dark' ? 'dark' : 'light'];
  const navigation = useNavigation<Nav>();
  const { t } = useLang();

  const TRIGGER_FIELDS = getTriggerFields(t);
  const ACTION_FIELDS = getActionFields(t);
  const ACTION_LABEL: Record<string, string> = {
    'discord.send_message':  t.actionDiscord,
    'telegram.send_message': t.actionTelegram,
    'gmail.send_email':      t.actionGmail,
    'notion.create_page':    t.actionNotion,
    'webhook.http_post':     t.actionHttp,
    'delay.wait':            t.actionDelay,
  };

  const [name, setName] = useState('Nouveau workflow');
  const [triggerType, setTriggerType] = useState('webhook');
  const [triggerConfig, setTriggerConfig] = useState<Record<string, string>>({});
  const [steps, setSteps] = useState<StepForm[]>([]);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [saving, setSaving] = useState(false);
  const [showStepPicker, setShowStepPicker] = useState(false);
  const [credPicker, setCredPicker] = useState<CredPicker>(null);
  const [renamingUid, setRenamingUid] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    api.get<Credential[]>('/credentials').then(({ data }) => setCredentials(data)).catch(() => {});
  }, []);

  const addStep = useCallback((type: string, label: string) => {
    setSteps(prev => [...prev, { uid: `${Date.now()}`, type, label, config: {} }]);
    setShowStepPicker(false);
  }, []);

  const removeStep = useCallback((uid: string) => {
    setSteps(prev => prev.filter(s => s.uid !== uid));
  }, []);

  const renameStep = useCallback((uid: string, label: string) => {
    setSteps(prev => prev.map(s => s.uid === uid ? { ...s, label } : s));
  }, []);

  const moveStep = useCallback((uid: string, dir: -1 | 1) => {
    setSteps(prev => {
      const idx = prev.findIndex(s => s.uid === uid);
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });
  }, []);

  const updateStepConfig = useCallback((uid: string, key: string, value: string) => {
    setSteps(prev => prev.map(s =>
      s.uid === uid ? { ...s, config: { ...s.config, [key]: value } } : s
    ));
  }, []);

  const selectCredential = (credId: string, credLabel: string) => {
    if (!credPicker) return;
    const errKey = credPicker.stepUid === '__trigger__'
      ? `trigger.${credPicker.fieldKey}`
      : `step.${credPicker.stepUid}.${credPicker.fieldKey}`;
    setErrors(e => ({ ...e, [errKey]: '' }));
    if (credPicker.stepUid === '__trigger__') {
      setTriggerConfig(prev => ({ ...prev, [credPicker.fieldKey]: credId }));
    } else {
      updateStepConfig(credPicker.stepUid, credPicker.fieldKey, credLabel);
      updateStepConfig(credPicker.stepUid, `${credPicker.fieldKey}__id`, credId);
    }
    setCredPicker(null);
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs['name'] = t.fieldRequired;

    const tFields = TRIGGER_FIELDS[triggerType] ?? [];
    tFields.filter(f => f.required).forEach(f => {
      const val = f.credential ? triggerConfig[f.key] : triggerConfig[f.key];
      if (!val?.trim()) errs[`trigger.${f.key}`] = t.fieldRequired;
    });

    steps.forEach(step => {
      const sFields = ACTION_FIELDS[step.type] ?? [];
      sFields.filter(f => f.required).forEach(f => {
        const val = f.credential ? step.config[`${f.key}__id`] : step.config[f.key];
        if (!val?.trim()) errs[`step.${step.uid}.${f.key}`] = t.fieldRequired;
      });
    });

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await api.post('/workflows', {
        name: name.trim(),
        triggerType,
        triggerConfig,
        steps: steps.map((s, i) => {
          // Reconstruit le config en remplaçant les labels par les IDs réels
          const config: Record<string, string> = {};
          Object.entries(s.config).forEach(([k, v]) => {
            if (k.endsWith('__id')) return; // champ interne, ignoré
            const idKey = `${k}__id`;
            config[k] = s.config[idKey] ?? v;
          });
          return { name: s.label, type: s.type, config, order: i };
        }),
      });
      navigation.goBack();
    } catch {
      setSaveError(t.saveError);
    } finally { setSaving(false); }
  };

  const filteredCreds = credPicker
    ? credentials.filter(cr => cr.connector === credPicker.connector)
    : [];

  const currentCredId = credPicker
    ? credPicker.stepUid === '__trigger__'
      ? triggerConfig[credPicker.fieldKey]
      : steps.find(s => s.uid === credPicker.stepUid)?.config[`${credPicker.fieldKey}__id`]
    : null;

  const renderTriggerFields = () => {
    const fields = TRIGGER_FIELDS[triggerType] ?? [];
    return fields.map(f => (
      <Field
        key={f.key}
        f={f}
        c={c}
        value={triggerConfig[f.key] ?? ''}
        error={errors[`trigger.${f.key}`]}
        onChangeText={v => {
          setTriggerConfig(prev => ({ ...prev, [f.key]: v }));
          setErrors(e => ({ ...e, [`trigger.${f.key}`]: '' }));
        }}
        onCredentialPress={() => setCredPicker({ stepUid: '__trigger__', fieldKey: f.key, connector: f.credential! })}
      />
    ));
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]}>{t.newWorkflow}</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving || !name.trim()}
          style={[styles.saveBtn, { backgroundColor: c.text, opacity: saving || !name.trim() ? 0.35 : 1 }]}
          activeOpacity={0.8}
        >
          {saving
            ? <ActivityIndicator size="small" color={c.bg} />
            : <Text style={[styles.saveBtnText, { color: c.bg }]}>{t.save}</Text>
          }
        </TouchableOpacity>
      </View>

      {saveError ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={16} color="#ef4444" />
          <Text style={styles.errorBannerText}>{saveError}</Text>
        </View>
      ) : null}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Nom */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: c.muted }]}>{t.nameLabel}</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: c.input, borderColor: errors['name'] ? '#ef4444' : c.border, color: c.text },
              ]}
              value={name}
              onChangeText={v => { setName(v); setErrors(e => ({ ...e, name: '' })); }}
              placeholderTextColor={c.sub}
              autoCorrect={false}
            />
            {errors['name'] ? <Text style={styles.errorText}>{errors['name']}</Text> : null}
          </View>

          {/* Déclencheur */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: c.muted }]}>{t.triggerSection}</Text>
            <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
              <View style={styles.pillRow}>
                {TRIGGER_TYPES.map(tt => (
                  <TouchableOpacity
                    key={tt.type}
                    onPress={() => { setTriggerType(tt.type); setTriggerConfig({}); }}
                    style={[
                      styles.pill,
                      { borderColor: c.border },
                      triggerType === tt.type && { backgroundColor: c.text, borderColor: c.text },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pillText, { color: triggerType === tt.type ? c.bg : c.muted }]}>
                      {({ webhook: t.triggerWebhook, cron: t.triggerCron, gmail_poll: t.triggerGmail } as Record<string,string>)[tt.type] ?? tt.type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {triggerType === 'webhook' && (
                <Text style={[styles.note, { color: c.sub }]}>{t.webhookNote}</Text>
              )}

              {renderTriggerFields()}
            </View>
          </View>

          {/* Étapes */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: c.muted }]}>
              {t.stepsSection}{steps.length > 0 ? ` · ${steps.length}` : ''}
            </Text>

            {steps.map((step, i) => {
              const fields = ACTION_FIELDS[step.type] ?? [];
              return (
                <View key={step.uid} style={[styles.stepCard, { backgroundColor: c.card, borderColor: c.border }]}>
                  <View style={[styles.stepHeader, { borderBottomColor: fields.length > 0 ? c.border : 'transparent' }]}>
                    <View style={[styles.stepBadge, { backgroundColor: c.border }]}>
                      <Text style={[styles.stepBadgeText, { color: c.muted }]}>{i + 1}</Text>
                    </View>
                    <TouchableOpacity
                      style={{ flex: 1 }}
                      onLongPress={() => { setRenamingUid(step.uid); setRenameValue(step.label); }}
                      activeOpacity={1}
                    >
                      <Text style={[styles.stepName, { color: c.text }]} numberOfLines={1}>{step.label}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => moveStep(step.uid, -1)} style={styles.removeBtn} activeOpacity={0.7} disabled={i === 0}>
                      <Ionicons name="chevron-up" size={17} color={i === 0 ? c.border : c.muted} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => moveStep(step.uid, 1)} style={styles.removeBtn} activeOpacity={0.7} disabled={i === steps.length - 1}>
                      <Ionicons name="chevron-down" size={17} color={i === steps.length - 1 ? c.border : c.muted} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeStep(step.uid)} style={styles.removeBtn} activeOpacity={0.7}>
                      <Ionicons name="close" size={17} color={c.muted} />
                    </TouchableOpacity>
                  </View>

                  {fields.length > 0 && (
                    <View style={styles.stepFields}>
                      {fields.map(f => (
                        <Field
                          key={f.key}
                          f={f}
                          c={c}
                          value={f.credential
                            ? (credentials.find(cr => cr.id === step.config[`${f.key}__id`])?.label ?? step.config[f.key] ?? '')
                            : (step.config[f.key] ?? '')
                          }
                          error={errors[`step.${step.uid}.${f.key}`]}
                          onChangeText={v => {
                            updateStepConfig(step.uid, f.key, v);
                            setErrors(e => ({ ...e, [`step.${step.uid}.${f.key}`]: '' }));
                          }}
                          onCredentialPress={() => setCredPicker({ stepUid: step.uid, fieldKey: f.key, connector: f.credential! })}
                        />
                      ))}
                    </View>
                  )}
                </View>
              );
            })}

            <TouchableOpacity
              style={[styles.addBtn, { borderColor: c.border }]}
              onPress={() => setShowStepPicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle-outline" size={18} color={c.muted} />
              <Text style={[styles.addBtnText, { color: c.muted }]}>{t.addStep}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal — choisir une action */}
      <Modal visible={showStepPicker} transparent animationType="slide" onRequestClose={() => setShowStepPicker(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowStepPicker(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={[styles.sheetHeader, { borderBottomColor: c.border }]}>
              <Text style={[styles.sheetTitle, { color: c.text }]}>{t.addStep}</Text>
              <TouchableOpacity onPress={() => setShowStepPicker(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={20} color={c.muted} />
              </TouchableOpacity>
            </View>
            {ACTION_TYPES.map((a, i) => (
              <TouchableOpacity
                key={a.type}
                style={[styles.sheetRow, { borderBottomColor: c.border, borderBottomWidth: i < ACTION_TYPES.length - 1 ? 1 : 0 }]}
                onPress={() => addStep(a.type, ACTION_LABEL[a.type])}
                activeOpacity={0.7}
              >
                <Text style={[styles.sheetRowText, { color: c.text }]}>{ACTION_LABEL[a.type]}</Text>
                <Ionicons name="chevron-forward" size={14} color={c.sub} />
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal — choisir un credential */}
      <Modal visible={!!credPicker} transparent animationType="slide" onRequestClose={() => setCredPicker(null)}>
        <Pressable style={styles.overlay} onPress={() => setCredPicker(null)}>
          <Pressable style={[styles.sheet, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={[styles.sheetHeader, { borderBottomColor: c.border }]}>
              <Text style={[styles.sheetTitle, { color: c.text }]}>{t.chooseAccountTitle}</Text>
              <TouchableOpacity onPress={() => setCredPicker(null)} activeOpacity={0.7}>
                <Ionicons name="close" size={20} color={c.muted} />
              </TouchableOpacity>
            </View>
            {filteredCreds.length === 0 ? (
              <View style={styles.sheetEmpty}>
                <Text style={[styles.sheetEmptyText, { color: c.muted }]}>
                  {t.noAccount(credPicker?.connector ?? '')}
                </Text>
              </View>
            ) : (
              filteredCreds.map((cr, i) => (
                <TouchableOpacity
                  key={cr.id}
                  style={[styles.sheetRow, { borderBottomColor: c.border, borderBottomWidth: i < filteredCreds.length - 1 ? 1 : 0 }]}
                  onPress={() => selectCredential(cr.id, cr.label)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.sheetRowText, { color: c.text }]}>{cr.label}</Text>
                  {cr.id === currentCredId && <Ionicons name="checkmark" size={16} color="#16a34a" />}
                </TouchableOpacity>
              ))
            )}
          </Pressable>
        </Pressable>
      </Modal>
      {/* Modal — renommer une étape */}
      <Modal visible={!!renamingUid} transparent animationType="fade" onRequestClose={() => setRenamingUid(null)}>
        <Pressable style={styles.overlay} onPress={() => setRenamingUid(null)}>
          <Pressable style={[styles.renameBox, { backgroundColor: c.card, borderColor: c.border }]}>
            <TextInput
              style={[styles.input, { backgroundColor: c.input, borderColor: c.border, color: c.text }]}
              value={renameValue}
              onChangeText={setRenameValue}
              autoFocus
              autoCorrect={false}
            />
            <View style={styles.renameActions}>
              <TouchableOpacity onPress={() => setRenamingUid(null)} style={[styles.renameBtn, { borderColor: c.border }]} activeOpacity={0.7}>
                <Text style={[styles.renameBtnText, { color: c.muted }]}>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (renamingUid && renameValue.trim()) renameStep(renamingUid, renameValue.trim());
                  setRenamingUid(null);
                }}
                style={[styles.renameBtn, { backgroundColor: c.text }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.renameBtnText, { color: c.bg }]}>{t.save}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, minWidth: 40, alignItems: 'center' },
  saveBtnText: { fontSize: 13, fontWeight: '600' },

  scroll: { padding: 24, gap: 24 },

  section: { gap: 10 },
  sectionLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  input: {
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14,
  },
  inputMulti: { height: 80, paddingTop: 12 },

  card: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 14 },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  pillText: { fontSize: 13, fontWeight: '500' },

  note: { fontSize: 12, lineHeight: 18 },

  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '500' },
  credBtn: {
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  credBtnText: { fontSize: 14, flex: 1 },

  stepCard: { borderWidth: 1, borderRadius: 14, marginBottom: 10, overflow: 'hidden' },
  stepHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 1,
  },
  stepBadge: { width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  stepBadgeText: { fontSize: 11, fontWeight: '700' },
  stepName: { fontSize: 13, fontWeight: '500', flex: 1 },
  removeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  stepFields: { padding: 16, gap: 14 },

  addBtn: {
    borderWidth: 1, borderRadius: 14, borderStyle: 'dashed',
    paddingVertical: 16, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  addBtnText: { fontSize: 14, fontWeight: '500' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 1,
  },
  sheetTitle: { fontSize: 15, fontWeight: '600' },
  sheetRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  sheetRowText: { fontSize: 14 },
  sheetEmpty: { padding: 24 },
  sheetEmptyText: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  errorText: { fontSize: 11, color: '#ef4444', marginTop: 4 },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#fee2e2',
  },
  errorBannerText: { fontSize: 13, color: '#ef4444', flex: 1 },

  renameBox: {
    margin: 32, borderRadius: 16, borderWidth: 1, padding: 20, gap: 16,
  },
  renameActions: { flexDirection: 'row', gap: 10 },
  renameBtn: {
    flex: 1, height: 42, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  renameBtnText: { fontSize: 14, fontWeight: '600' },
});

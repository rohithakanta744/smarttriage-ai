import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { diagnosisSchema, maskDiagnosis } from './diagnosis';
import { maskSensitive } from './log-processing';

export const listWorkspaces = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.from('triage_workspaces').select('id,name,owner_id,invite_code');
  if (error) throw new Error(error.message); return data;
});
export const createWorkspace = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => z.object({ name: z.string().trim().min(1).max(80) }).parse(v)).handler(async ({ data, context }) => {
  const res = await context.supabase.rpc('create_triage_workspace', { workspace_name: data.name }); if (res.error) throw new Error(res.error.message); return res.data;
});
export const joinWorkspace = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => z.object({ code: z.string().uuid() }).parse(v)).handler(async ({ data, context }) => {
  const res = await context.supabase.rpc('join_triage_workspace', { code: data.code }); if (res.error) throw new Error(res.error.message); return res.data;
});
export const listTeamReports = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => z.object({ workspaceId: z.string().uuid() }).parse(v)).handler(async ({ data, context }) => {
  const res = await context.supabase.from('triage_reports').select('*').eq('workspace_id', data.workspaceId).order('created_at', { ascending: false }).limit(100);
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []).flatMap(row => { const parsed = diagnosisSchema.safeParse(row.diagnosis); if (!parsed.success) return []; return [{ id: row.id, createdAt: row.created_at, mode: row.mode as 'demo'|'backend'|'cloud', log: maskSensitive(row.log).text, tags: row.tags.map(t => maskSensitive(t).text), diagnosis: maskDiagnosis(parsed.data) }]; });
});
export const saveTeamReport = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => z.object({ workspaceId: z.string().uuid(), mode: z.enum(['demo','backend','cloud']), log: z.string().max(50000), diagnosis: diagnosisSchema, tags: z.array(z.string().max(40)).max(8) }).parse(v)).handler(async ({ data, context }) => {
  const safe = maskDiagnosis(data.diagnosis);
  const membership = await context.supabase.from('triage_workspaces').select('id').eq('id', data.workspaceId).single();
  if (!membership.data || membership.error) throw new Error('Workspace access required.');
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const res = await supabaseAdmin.from('triage_reports').insert({ workspace_id: data.workspaceId, user_id: context.userId, mode: data.mode, log: maskSensitive(data.log).text, diagnosis: safe, tags: data.tags.map(t => maskSensitive(t).text) });
  if (res.error) throw new Error(res.error.message); return { ok: true };
});

export const webhookInput = z.object({ workspaceId: z.string().uuid(), provider: z.enum(['teams','slack']) });
export function validateWebhook(url: string, provider: 'teams'|'slack') {
  const u = new URL(url);
  const host = u.hostname.toLowerCase();
  const valid = provider === 'slack' ? host === 'hooks.slack.com' && u.pathname.startsWith('/services/') : host.endsWith('.webhook.office.com') || host.endsWith('.logic.azure.com') || host.endsWith('.api.powerplatform.com');
  if (u.protocol !== 'https:' || u.username || u.password || u.port || !valid) throw new Error('Use an official HTTPS Teams Workflow or Slack incoming webhook URL.');
  return u.toString();
}
export const saveWebhook = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => webhookInput.extend({ url: z.string().min(1).max(2000) }).parse(v)).handler(async ({ data, context }) => {
  const { data: workspace } = await context.supabase.from('triage_workspaces').select('owner_id').eq('id', data.workspaceId).single();
  if (workspace?.owner_id !== context.userId) throw new Error('Only the workspace owner can configure channels.');
  const url = validateWebhook(data.url, data.provider);
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const res = await supabaseAdmin.from('triage_webhooks').upsert({ workspace_id: data.workspaceId, provider: data.provider, url });
  if (res.error) throw new Error('Could not save channel.'); return { ok: true };
});
export function channelPayload(provider: 'teams'|'slack', report: string) {
  const safe = maskSensitive(report).text.slice(0, 6000);
  return provider === 'slack' ? { text: 'SmartTriage AI incident', blocks: [{ type: 'section', text: { type: 'plain_text', text: safe.slice(0, 2900), emoji: false } }] } : { type: 'message', attachments: [{ contentType: 'application/vnd.microsoft.card.adaptive', contentUrl: null, content: { type: 'AdaptiveCard', version: '1.4', $schema: 'http://adaptivecards.io/schemas/adaptive-card.json', body: [{ type: 'TextBlock', text: 'SmartTriage AI incident', weight: 'Bolder' }, { type: 'TextBlock', text: safe, wrap: true }] } }] };
}
export const sendWebhook = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => webhookInput.extend({ report: z.string().min(1).max(16000) }).parse(v)).handler(async ({ data, context }) => {
  const { data: workspace } = await context.supabase.from('triage_workspaces').select('id').eq('id', data.workspaceId).single();
  if (!workspace) throw new Error('Workspace access required.');
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data: channel } = await supabaseAdmin.from('triage_webhooks').select('url').eq('workspace_id', data.workspaceId).eq('provider', data.provider).single();
  if (!channel) return { ok: false, error: 'Ask your workspace owner to configure this channel first.' };
  try {
    const res = await fetch(validateWebhook(channel.url, data.provider), { method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(channelPayload(data.provider, data.report)), signal: AbortSignal.timeout(15000) });
    if (!res.ok) return { ok: false, error: `Channel rejected the report (HTTP ${res.status}). Ask the owner to check the workflow.` };
    return { ok: true, error: '' };
  } catch { return { ok: false, error: 'Channel delivery failed. No automatic retry was made to avoid duplicate messages.' }; }
});
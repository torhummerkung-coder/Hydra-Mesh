import type { ConversationMessage } from '../security/risk-engine';
// Explicitly configured second provider; disabled without a role model and key.
// Uses the existing Mistral integration's wire format. No user-controlled endpoint.
export async function callSecondary(role: 'RISK' | 'COMPANION', system: string, messages: ConversationMessage[]): Promise<string> {
  const model = process.env[`HYDRA_${role}_SECONDARY_MODEL`];
  const key = process.env.MISTRAL_API_KEY;
  if (!model || !key) throw new Error('secondary_not_configured');
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST', signal: AbortSignal.timeout(8000),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, max_tokens: role === 'RISK' ? 512 : 1024,
      messages: [{ role: 'system', content: system }, ...messages] }),
  });
  if (!response.ok) throw new Error(`secondary_http_${response.status}`);
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw new Error('secondary_empty');
  return content;
}

type CooldownStarter = (retryAfter: string | null) => void;

async function quotaWaitAfterUnexpectedResponse(): Promise<number | null> {
  try {
    const response = await fetch('/api/coaster-ideas/status', { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) return null;
    const status = await response.json();
    return status.allowed === false && Number.isFinite(status.retryAfter) && status.retryAfter > 0
      ? status.retryAfter : null;
  } catch { return null; }
}

export async function readGenerationResponse(response: Response, startCooldown: CooldownStarter) {
  if (response.status === 429) {
    startCooldown(response.headers.get('Retry-After'));
    throw new Error('Limite di generazione raggiunto.');
  }

  const nextWait = response.headers.get('X-Generation-Retry-After');
  if (nextWait) startCooldown(nextWait);

  let data;
  try {
    if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Non-JSON response');
    data = await response.json();
  } catch {
    const wait = await quotaWaitAfterUnexpectedResponse();
    if (wait !== null) {
      startCooldown(String(wait));
      throw new Error('La generazione si è interrotta e il limite temporaneo è stato raggiunto.');
    }
    startCooldown('60');
    throw new Error('Il servizio di generazione si è interrotto. Riprova tra un minuto.');
  }

  if (!response.ok) throw new Error(data.error || 'Generazione non disponibile. Riprova.');
  return data;
}

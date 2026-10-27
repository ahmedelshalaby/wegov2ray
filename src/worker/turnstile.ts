export interface TurnstileVerificationResult {
  success: boolean;
  errorCodes?: string[];
}

export async function verifyTurnstileToken(
  token: string | undefined,
  secretKey: string | undefined,
  remoteIp?: string
): Promise<TurnstileVerificationResult> {
  // If no secret key is provided (e.g. local development or before configuration), allow gracefully
  if (!secretKey || secretKey.trim() === '') {
    return { success: true };
  }

  // If token is missing
  if (!token || token.trim() === '') {
    return { success: false, errorCodes: ['missing-input-response'] };
  }

  try {
    const formData = new FormData();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    const url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
    const res = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      console.error(`Turnstile siteverify HTTP error: ${res.status}`);
      return { success: false, errorCodes: [`http-${res.status}`] };
    }

    const data = (await res.json()) as { success: boolean; 'error-codes'?: string[] };
    return {
      success: !!data.success,
      errorCodes: data['error-codes'],
    };
  } catch (err) {
    console.error('Turnstile verification exception:', err);
    return { success: false, errorCodes: ['network-error'] };
  }
}

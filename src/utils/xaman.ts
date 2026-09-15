import QRCode from 'qrcode';

export interface XamanPayloadResponse {
  uuid?: string;
  next?: {
    always: string;
  };
  refs?: {
    qr_png: string;
    websocket_status: string;
  };
  pushed?: boolean;
}

/**
 * Generates an in-browser Data URL QR Code for any text or JSON payload.
 * 100% client-side, zero backend dependencies.
 */
export async function generateClientQRCode(content: string): Promise<string> {
  try {
    return await QRCode.toDataURL(content, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    console.error('QR code generation error:', err);
    throw err;
  }
}

export const DEFAULT_XAMAN_KEY = '16c555db-35ce-4b84-a656-53b2ec76b5bc';
export const DEFAULT_XAMAN_SECRET = '78e21880-3040-4972-9bb7-3a9e06a0ac35';

/**
 * Attempts to create a Xaman Payload using the Xaman API if credentials are provided.
 */
export async function createXamanPayload(
  txJson: Record<string, any>,
  apiKey = DEFAULT_XAMAN_KEY,
  apiSecret = DEFAULT_XAMAN_SECRET
): Promise<XamanPayloadResponse | null> {
  if (!apiKey || !apiSecret) {
    return null;
  }

  try {
    const resp = await fetch('https://xumm.app/api/v1/platform/payload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey.trim(),
        'X-API-Secret': apiSecret.trim(),
      },
      body: JSON.stringify({
        txjson: txJson,
      }),
    });

    if (resp.ok) {
      return await resp.json();
    }
  } catch (err) {
    console.warn('Xaman API direct call failed, falling back to client-side QR:', err);
  }

  return null;
}

/**
 * Creates a sign-in payload for Xaman.
 */
export async function createXamanSignInPayload(
  apiKey = DEFAULT_XAMAN_KEY,
  apiSecret = DEFAULT_XAMAN_SECRET
): Promise<XamanPayloadResponse | null> {
  const signInTx = {
    TransactionType: 'SignIn',
  };
  return createXamanPayload(signInTx, apiKey, apiSecret);
}

/**
 * Subscribes to Xaman WebSocket for live payload updates.
 */
export function subscribeToXamanPayload(
  websocketUrl: string,
  onResolved: (data: any) => void,
  onError: (err: any) => void
): () => void {
  const ws = new WebSocket(websocketUrl);

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.signed !== undefined) {
        onResolved(data);
      }
    } catch (e) {
      console.error('Error parsing Xaman WS message:', e);
    }
  };

  ws.onerror = (err) => {
    onError(err);
  };

  return () => {
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close();
    }
  };
}

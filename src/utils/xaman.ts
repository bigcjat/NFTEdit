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

/**
 * Attempts to create a Xaman Payload using the Xaman API if credentials are provided.
 */
export async function createXamanPayload(
  txJson: Record<string, any>,
  apiKey?: string,
  apiSecret?: string
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
    console.warn('Xaman API direct call failed (likely CORS on static site). Falling back to client-side QR:', err);
  }

  return null;
}

/**
 * Creates a sign-in payload for Xaman.
 */
export async function createXamanSignInPayload(
  apiKey?: string,
  apiSecret?: string
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

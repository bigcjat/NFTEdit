import { XummPkce } from 'xumm-oauth2-pkce';
import QRCode from 'qrcode';

export const DEFAULT_XAMAN_KEY = '16c555db-35ce-4b84-a656-53b2ec76b5bc';

// Singleton instance for client-side OAuth2 PKCE
let xummPkceInstance: XummPkce | null = null;

export function getXumm(apiKey = DEFAULT_XAMAN_KEY): XummPkce {
  if (!xummPkceInstance) {
    xummPkceInstance = new XummPkce(apiKey.trim(), {
      rememberJwt: true,
    });
  }
  return xummPkceInstance;
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

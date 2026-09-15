import type { NFTMetadata } from '../types';

export const DEFAULT_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs/',
  'https://dweb.link/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
];

/**
 * Converts an IPFS URI (e.g. ipfs://CID or CID) to an HTTP gateway URL.
 */
export function resolveIPFSUrl(uri: string, gateway?: string): string {
  if (!uri) return '';
  const cleanGateway = gateway ? (gateway.endsWith('/') ? gateway : `${gateway}/`) : DEFAULT_GATEWAYS[0];

  if (uri.startsWith('ipfs://')) {
    const path = uri.replace(/^ipfs:\/\//, '');
    return `${cleanGateway}${path}`;
  }
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    return uri;
  }
  // Might be raw CID
  if (uri.startsWith('Qm') || uri.startsWith('bafy')) {
    return `${cleanGateway}${uri}`;
  }
  return uri;
}

/**
 * Fetches JSON metadata from IPFS with fallback gateways and timeouts.
 */
export async function fetchIPFSMetadata(uri: string, customGateway?: string): Promise<NFTMetadata> {
  if (!uri) {
    throw new Error('No URI provided');
  }

  // If it's already an HTTP URL and not an IPFS gateway, try directly first
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    try {
      const resp = await fetch(uri, { headers: { Accept: 'application/json' } });
      if (resp.ok) {
        return await resp.json();
      }
    } catch {
      // Continue to gateway fallbacks if it failed
    }
  }

  // Extract CID or path
  let path = uri.replace(/^ipfs:\/\//, '');
  if (path.includes('/ipfs/')) {
    path = path.split('/ipfs/')[1];
  }

  const gateways = customGateway 
    ? [customGateway.endsWith('/') ? customGateway : `${customGateway}/`, ...DEFAULT_GATEWAYS]
    : DEFAULT_GATEWAYS;

  let lastError: any = null;

  for (const gw of gateways) {
    const url = `${gw}${path}`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const resp = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeoutId);

      if (resp.ok) {
        const text = await resp.text();
        try {
          return JSON.parse(text);
        } catch {
          throw new Error('Response was not valid JSON');
        }
      }
    } catch (err) {
      lastError = err;
      // try next gateway
    }
  }

  throw lastError || new Error(`Failed to load IPFS metadata from all gateways for ${uri}`);
}

/**
 * Uploads JSON metadata to IPFS via Pinata.
 */
export async function uploadJSONToPinata(
  metadata: NFTMetadata,
  pinataJwt: string,
  tokenName?: string
): Promise<{ ipfsHash: string; uri: string }> {
  if (!pinataJwt) {
    throw new Error('Pinata JWT is required. Please set it in Settings.');
  }

  const payload = {
    pinataOptions: {
      cidVersion: 1,
    },
    pinataMetadata: {
      name: `${tokenName || metadata.name || 'nft'}-metadata.json`,
      keyvalues: {
        platform: 'XRPL-DynamicNFT-Editor',
        timestamp: new Date().toISOString(),
      },
    },
    pinataContent: metadata,
  };

  const resp = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${pinataJwt.trim()}`,
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`Pinata upload failed (${resp.status}): ${errorText}`);
  }

  const data = await resp.json();
  const ipfsHash = data.IpfsHash;
  return {
    ipfsHash,
    uri: `ipfs://${ipfsHash}`,
  };
}

/**
 * Helper to download JSON data to local device.
 */
export function downloadJsonFile(data: any, filename: string) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.json') ? filename : `${filename}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

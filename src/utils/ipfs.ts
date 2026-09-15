import type { NFTMetadata } from '../types';

export const DEFAULT_GATEWAYS = [
  'https://ipfs.filebase.io/ipfs/',
  'https://ipfs.orbitor.dev/ipfs/',
  'https://eu.orbitor.dev/ipfs/',
  'https://apac.orbitor.dev/ipfs/',
  'https://latam.orbitor.dev/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://dweb.link/ipfs/',
  'https://nftstorage.link/ipfs/',
  'http://127.0.0.1:8080/ipfs/',
];

// In-memory cache to prevent duplicate fetches across component re-renders
const metadataCache = new Map<string, NFTMetadata>();

/**
 * Returns an ordered array of candidate gateway HTTP URLs for an IPFS URI.
 */
export function getFallbackGatewayUrls(uri: string, customGateway?: string): string[] {
  if (!uri) return [];

  // Clean custom gateway if present
  const gws = customGateway
    ? [customGateway.endsWith('/') ? customGateway : `${customGateway}/`, ...DEFAULT_GATEWAYS]
    : DEFAULT_GATEWAYS;

  // If already an HTTP/HTTPS URL
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    if (uri.includes('/ipfs/')) {
      const path = uri.split('/ipfs/')[1];
      return [uri, ...gws.map((gw) => `${gw}${path}`)];
    }
    return [uri];
  }

  // Extract CID or path from ipfs:// or raw CID
  let path = uri.replace(/^ipfs:\/\//, '');
  if (path.includes('/ipfs/')) {
    path = path.split('/ipfs/')[1];
  }

  return gws.map((gw) => `${gw}${path}`);
}

/**
 * Converts an IPFS URI (e.g. ipfs://CID or CID) to an HTTP gateway URL.
 */
export function resolveIPFSUrl(uri: string, gateway?: string): string {
  if (!uri) return '';
  const urls = getFallbackGatewayUrls(uri, gateway);
  return urls[0] || uri;
}

/**
 * Fetches JSON metadata from IPFS with cascading fallback gateways, caching, and timeouts.
 */
export async function fetchIPFSMetadata(uri: string, customGateway?: string): Promise<NFTMetadata> {
  if (!uri) {
    throw new Error('No URI provided');
  }

  // Check in-memory cache first
  if (metadataCache.has(uri)) {
    return metadataCache.get(uri)!;
  }

  const urls = getFallbackGatewayUrls(uri, customGateway);
  let lastError: any = null;

  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const resp = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeoutId);

      if (resp.ok) {
        const text = await resp.text();
        const parsed = JSON.parse(text);
        metadataCache.set(uri, parsed);
        return parsed;
      }
    } catch (err) {
      lastError = err;
      // Try next gateway in fallback list
    }
  }

  throw lastError || new Error(`Failed to load IPFS metadata from all fallback gateways for ${uri}`);
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
 * Uploads JSON metadata directly to a local or self-hosted IPFS Kubo node (e.g. IPFS Desktop, Brave IPFS, or local daemon).
 * 100% Free, local, open-source, and private.
 */
export async function uploadToLocalIPFSNode(
  metadata: NFTMetadata,
  endpoint = 'http://127.0.0.1:5001'
): Promise<{ ipfsHash: string; uri: string }> {
  const cleanEndpoint = endpoint.replace(/\/+$/, '');
  const jsonString = JSON.stringify(metadata, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const formData = new FormData();
  formData.append('file', blob, 'metadata.json');

  const resp = await fetch(`${cleanEndpoint}/api/v0/add?pin=true`, {
    method: 'POST',
    body: formData,
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Local IPFS upload failed (${resp.status}): ${errText}`);
  }

  const data = await resp.json();
  const ipfsHash = data.Hash;
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

import type { NFTMetadata } from '../types';

export const DEFAULT_GATEWAYS = [
  'https://ipfs.filebase.io/ipfs/',
  'https://quicknode.quicknode-ipfs.com/ipfs/',
  'http://127.0.0.1:8080/ipfs/',
];

// In-memory cache to prevent duplicate fetches across component re-renders
const metadataCache = new Map<string, NFTMetadata>();

/**
 * Robustly extracts the CID and optional file subpath from any IPFS URL or URI format.
 */
export function extractIpfsPath(uri: string): string {
  if (!uri) return '';

  // 1. Subdomain gateway format: https://<cid>.ipfs.<domain>/<optional-path>
  const subdomainMatch = uri.match(/https?:\/\/([a-z0-9]+)\.ipfs\.[^/]+(?:\/(.*))?/i);
  if (subdomainMatch) {
    const cid = subdomainMatch[1];
    const subpath = subdomainMatch[2] || '';
    return subpath ? `${cid}/${subpath}` : cid;
  }

  // 2. Standard path gateway format: .../ipfs/<cid-and-path>
  if (uri.includes('/ipfs/')) {
    return uri.split('/ipfs/')[1];
  }

  // 3. ipfs:// URI format: ipfs://<cid-and-path>
  if (uri.startsWith('ipfs://')) {
    return uri.replace(/^ipfs:\/\//, '');
  }

  // 4. Raw CID format
  if (uri.startsWith('Qm') || uri.startsWith('bafy') || uri.startsWith('bafk')) {
    return uri;
  }

  return '';
}

/**
 * Returns an ordered array of candidate gateway HTTP URLs for an IPFS URI.
 */
export function getFallbackGatewayUrls(uri: string, customGateway?: string): string[] {
  if (!uri) return [];

  const gws = customGateway
    ? [customGateway.endsWith('/') ? customGateway : `${customGateway}/`, ...DEFAULT_GATEWAYS]
    : DEFAULT_GATEWAYS;

  const ipfsPath = extractIpfsPath(uri);
  if (ipfsPath) {
    return gws.map((gw) => `${gw}${ipfsPath}`);
  }

  // Non-IPFS standard HTTP URL (e.g. Arweave or HTTPS)
  return [uri];
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
 * Fetches JSON metadata from IPFS with cascading fallback gateways, caching, timeouts,
 * and an optional onXRP/Bidds indexer fallback.
 */
export async function fetchIPFSMetadata(
  uri: string,
  customGateway?: string,
  nftId?: string
): Promise<NFTMetadata> {
  if (!uri && !nftId) {
    throw new Error('No URI or NFTokenID provided');
  }

  // Check in-memory cache first
  const cacheKey = uri || nftId || '';
  if (cacheKey && metadataCache.has(cacheKey)) {
    return metadataCache.get(cacheKey)!;
  }

  let lastError: any = null;

  // 1. Direct IPFS resolution via verified live gateways
  if (uri) {
    const urls = getFallbackGatewayUrls(uri, customGateway);
    for (const url of urls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const resp = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        clearTimeout(timeoutId);

        if (resp.ok) {
          const text = await resp.text();
          const parsed = JSON.parse(text);
          metadataCache.set(cacheKey, parsed);
          return parsed;
        }
      } catch (err) {
        lastError = err;
      }
    }
  }

  // 2. Secondary fallback: onXRP / Bidds metadata indexer API (cached snapshot)
  if (nftId) {
    try {
      const biddsUrl = `https://api.bidds.com/api/metadata/${nftId}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const resp = await fetch(biddsUrl, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeoutId);

      if (resp.ok) {
        const parsed = await resp.json();
        if (parsed && typeof parsed === 'object' && (parsed.name || parsed.image || parsed.attributes)) {
          metadataCache.set(cacheKey, parsed);
          return parsed;
        }
      }
    } catch (biddsErr) {
      console.warn('Bidds fallback metadata fetch failed:', biddsErr);
    }
  }

  throw lastError || new Error(`Failed to load IPFS metadata from all fallback gateways for ${uri || nftId}`);
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

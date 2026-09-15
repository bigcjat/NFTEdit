import type { NFTMetadata } from '../types';

export const DEFAULT_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs/',
  'https://ipfs.filebase.io/ipfs/',
  'https://nftedit.bigcjat.workers.dev/ipfs/',
  'https://4everland.io/ipfs/',
  'https://dweb.link/ipfs/',
  'https://w3s.link/ipfs/',
];

// In-memory cache by URI to prevent duplicate fetches
const metadataCache = new Map<string, NFTMetadata>();
const inFlightRequests = new Map<string, Promise<NFTMetadata>>();

// Concurrency queue to prevent blasting gateways with 50+ simultaneous requests (avoids 429 rate limits)
const MAX_CONCURRENT_METADATA_FETCHES = 6;
let activeMetadataFetches = 0;
const metadataFetchQueue: (() => void)[] = [];

function acquireMetadataFetchSlot(): Promise<void> {
  if (activeMetadataFetches < MAX_CONCURRENT_METADATA_FETCHES) {
    activeMetadataFetches++;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    metadataFetchQueue.push(() => {
      activeMetadataFetches++;
      resolve();
    });
  });
}

function releaseMetadataFetchSlot(): void {
  activeMetadataFetches--;
  if (metadataFetchQueue.length > 0 && activeMetadataFetches < MAX_CONCURRENT_METADATA_FETCHES) {
    const next = metadataFetchQueue.shift();
    if (next) next();
  }
}

/**
 * Clears the metadata cache (or a specific URI) so updated dynamic NFTs reload fresh.
 */
export function clearMetadataCache(uri?: string) {
  if (uri) {
    metadataCache.delete(uri);
  } else {
    metadataCache.clear();
  }
}

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
 * Fetches JSON metadata directly from the IPFS URI with cascading fallback gateways.
 * Never uses third-party static indexers like Bidds so Dynamic NFTs always reflect live updates.
 */
export async function fetchIPFSMetadata(
  uri?: string,
  customGateway?: string
): Promise<NFTMetadata> {
  if (!uri) {
    throw new Error('No URI provided');
  }

  // 1. Check in-memory cache (strictly by URI)
  if (metadataCache.has(uri)) {
    return metadataCache.get(uri)!;
  }

  // 2. Check if a request for this URI is already in-flight (deduplication)
  if (inFlightRequests.has(uri)) {
    return inFlightRequests.get(uri)!;
  }

  // 3. Initiate fetch promise across fast candidate gateways with concurrency queue
  const fetchPromise = (async (): Promise<NFTMetadata> => {
    await acquireMetadataFetchSlot();
    try {
      let lastError: any = null;
      const urls = getFallbackGatewayUrls(uri, customGateway);

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
        }
      }

      throw lastError || new Error(`Failed to load IPFS metadata from all fallback gateways for ${uri}`);
    } finally {
      releaseMetadataFetchSlot();
    }
  })();

  inFlightRequests.set(uri, fetchPromise);

  try {
    return await fetchPromise;
  } finally {
    inFlightRequests.delete(uri);
  }
}


/**
 * Uploads JSON metadata to IPFS via Pinata (supports both V3 scoped keys and V1 legacy keys).
 */
export async function uploadJSONToPinata(
  metadata: NFTMetadata,
  pinataJwt: string,
  tokenName?: string
): Promise<{ ipfsHash: string; uri: string }> {
  if (!pinataJwt) {
    throw new Error('Pinata JWT is required. Please set it in Settings.');
  }

  // 1. Try Pinata V3 Files endpoint (compatible with modern scoped keys)
  try {
    const fileName = `${tokenName || metadata.name || 'metadata'}.json`;
    const jsonBlob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
    const form = new FormData();
    form.append('file', jsonBlob, fileName);
    form.append('name', fileName);
    form.append('network', 'public');

    const v3Resp = await fetch('https://uploads.pinata.cloud/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pinataJwt.trim()}`,
      },
      body: form,
    });

    if (v3Resp.ok) {
      const v3Data: any = await v3Resp.json();
      const cid = v3Data.data?.cid || v3Data.cid || v3Data.IpfsHash;
      if (cid) {
        return {
          ipfsHash: cid,
          uri: `ipfs://${cid}`,
        };
      }
    }
  } catch (v3Err) {
    console.warn('Pinata V3 upload attempt failed, falling back to V1:', v3Err);
  }

  // 2. Fallback to Legacy Pinata V1 endpoint
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
  const ipfsHash = data.IpfsHash || data.cid;
  return {
    ipfsHash,
    uri: `ipfs://${ipfsHash}`,
  };
}

/**
 * Uploads a binary media file (image/video) to IPFS via Pinata (supports V3 and V1).
 */
export async function uploadFileToPinata(
  file: File,
  pinataJwt: string
): Promise<{ ipfsHash: string; uri: string }> {
  if (!pinataJwt) {
    throw new Error('Pinata JWT is required. Please set it in Settings.');
  }

  // 1. Try Pinata V3 Files endpoint
  try {
    const form = new FormData();
    form.append('file', file, file.name);
    form.append('name', file.name);
    form.append('network', 'public');

    const v3Resp = await fetch('https://uploads.pinata.cloud/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pinataJwt.trim()}`,
      },
      body: form,
    });

    if (v3Resp.ok) {
      const v3Data: any = await v3Resp.json();
      const cid = v3Data.data?.cid || v3Data.cid || v3Data.IpfsHash;
      if (cid) {
        return {
          ipfsHash: cid,
          uri: `ipfs://${cid}`,
        };
      }
    }
  } catch (v3Err) {
    console.warn('Pinata V3 file upload failed, falling back to V1:', v3Err);
  }

  // 2. Fallback to Legacy Pinata V1 endpoint
  const formData = new FormData();
  formData.append('file', file);
  formData.append(
    'pinataMetadata',
    JSON.stringify({
      name: file.name,
      keyvalues: {
        platform: 'XRPL-DynamicNFT-Editor',
        timestamp: new Date().toISOString(),
      },
    })
  );
  formData.append('pinataOptions', JSON.stringify({ cidVersion: 1 }));

  const resp = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${pinataJwt.trim()}`,
    },
    body: formData,
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`Pinata file upload failed (${resp.status}): ${errorText}`);
  }

  const data = await resp.json();
  const ipfsHash = data.IpfsHash || data.cid;
  return {
    ipfsHash,
    uri: `ipfs://${ipfsHash}`,
  };
}

export const DEFAULT_RELAY_URL = (
  import.meta.env.VITE_IPFS_RELAY_URL || 'https://nftedit.bigcjat.workers.dev'
).replace(/\/+$/, '');

/**
 * Uploads JSON metadata via the Cloudflare Worker relay.
 * Requires zero keys or accounts in the frontend.
 */
export async function uploadJSONViaRelay(
  metadata: NFTMetadata,
  relayUrl?: string
): Promise<{ ipfsHash: string; uri: string }> {
  const endpoint = (relayUrl || DEFAULT_RELAY_URL).replace(/\/+$/, '');
  if (!endpoint) {
    throw new Error('No IPFS relay URL configured. Please deploy the Cloudflare Worker or set VITE_IPFS_RELAY_URL.');
  }

  const resp = await fetch(`${endpoint}/upload-json`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-nftedit-client': 'xrpl-dynamic-nft-v1',
    },
    body: JSON.stringify(metadata),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Relay upload failed (${resp.status}): ${errText}`);
  }

  const data = await resp.json();
  return {
    ipfsHash: data.ipfsHash,
    uri: data.uri || `ipfs://${data.ipfsHash}`,
  };
}

/**
 * Uploads a binary media file via the Cloudflare Worker relay.
 */
export async function uploadFileViaRelay(
  file: File,
  relayUrl?: string
): Promise<{ ipfsHash: string; uri: string }> {
  const endpoint = (relayUrl || DEFAULT_RELAY_URL).replace(/\/+$/, '');
  if (!endpoint) {
    throw new Error('No IPFS relay URL configured. Please deploy the Cloudflare Worker or set VITE_IPFS_RELAY_URL.');
  }

  const formData = new FormData();
  formData.append('file', file);

  const resp = await fetch(`${endpoint}/upload-file`, {
    method: 'POST',
    headers: {
      'x-nftedit-client': 'xrpl-dynamic-nft-v1',
    },
    body: formData,
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Relay file upload failed (${resp.status}): ${errText}`);
  }

  const data = await resp.json();
  return {
    ipfsHash: data.ipfsHash,
    uri: data.uri || `ipfs://${data.ipfsHash}`,
  };
}

/**
 * Smart JSON upload:
 * Uses Cloudflare Worker relay if available (zero keys for artists!),
 * otherwise falls back to personal Pinata JWT if configured.
 */
export async function uploadMetadataSmart(
  metadata: NFTMetadata,
  pinataJwt?: string,
  relayUrl?: string
): Promise<{ ipfsHash: string; uri: string }> {
  const targetRelay = (relayUrl || DEFAULT_RELAY_URL).trim();
  if (targetRelay) {
    return await uploadJSONViaRelay(metadata, targetRelay);
  }

  if (pinataJwt?.trim()) {
    return await uploadJSONToPinata(metadata, pinataJwt.trim(), metadata.name);
  }

  throw new Error('Please configure a Cloudflare Worker Relay URL or Pinata JWT in Settings to auto-upload to IPFS.');
}

/**
 * Smart file upload:
 * Uses Cloudflare Worker relay if available (zero keys for artists!),
 * otherwise falls back to personal Pinata JWT if configured.
 */
export async function uploadFileSmart(
  file: File,
  pinataJwt?: string,
  relayUrl?: string
): Promise<{ ipfsHash: string; uri: string }> {
  const targetRelay = (relayUrl || DEFAULT_RELAY_URL).trim();
  if (targetRelay) {
    return await uploadFileViaRelay(file, targetRelay);
  }

  if (pinataJwt?.trim()) {
    return await uploadFileToPinata(file, pinataJwt.trim());
  }

  throw new Error('Please configure a Cloudflare Worker Relay URL or Pinata JWT in Settings to auto-upload image files to IPFS.');
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

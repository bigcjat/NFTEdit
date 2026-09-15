import type { NFTMetadata } from '../types';

export const DEFAULT_GATEWAYS = [
  'https://ipfs.filebase.io/ipfs/',
  'https://quicknode.quicknode-ipfs.com/ipfs/',
];

// In-memory cache to prevent duplicate fetches across component re-renders
const metadataCache = new Map<string, NFTMetadata>();
const inFlightRequests = new Map<string, Promise<NFTMetadata>>();

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
 * Fetches JSON metadata from IPFS with cascading fallback gateways, in-memory caching,
 * in-flight request deduplication, and an onXRP/Bidds indexer fallback.
 * 
 * Guarantees that the same URI / NFT is NEVER fetched twice.
 */
export async function fetchIPFSMetadata(
  uri?: string,
  customGateway?: string,
  nftId?: string
): Promise<NFTMetadata> {
  if (!uri && !nftId) {
    throw new Error('No URI or NFTokenID provided');
  }

  // 1. Check in-memory cache (by URI or by NFTokenID)
  if (uri && metadataCache.has(uri)) {
    return metadataCache.get(uri)!;
  }
  if (nftId && metadataCache.has(nftId)) {
    return metadataCache.get(nftId)!;
  }

  // 2. Check if a request for this URI or NFT is already in-flight (deduplication)
  const dedupKey = uri || nftId || '';
  if (inFlightRequests.has(dedupKey)) {
    return inFlightRequests.get(dedupKey)!;
  }

  // 3. Initiate fetch promise and store in inFlightRequests
  const fetchPromise = (async (): Promise<NFTMetadata> => {
    let lastError: any = null;

    // Direct IPFS resolution via verified live gateways
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
            if (uri) metadataCache.set(uri, parsed);
            if (nftId) metadataCache.set(nftId, parsed);
            return parsed;
          }
        } catch (err) {
          lastError = err;
        }
      }
    }

    // Secondary fallback: onXRP / Bidds metadata indexer API (cached snapshot)
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
            if (uri) metadataCache.set(uri, parsed);
            if (nftId) metadataCache.set(nftId, parsed);
            return parsed;
          }
        }
      } catch (biddsErr) {
        console.warn('Bidds fallback metadata fetch failed:', biddsErr);
      }
    }

    throw lastError || new Error(`Failed to load IPFS metadata from all fallback gateways for ${uri || nftId}`);
  })();

  inFlightRequests.set(dedupKey, fetchPromise);

  try {
    const result = await fetchPromise;
    return result;
  } finally {
    inFlightRequests.delete(dedupKey);
  }
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
 * Uploads a binary media file (image/video) to IPFS via Pinata.
 */
export async function uploadFileToPinata(
  file: File,
  pinataJwt: string
): Promise<{ ipfsHash: string; uri: string }> {
  if (!pinataJwt) {
    throw new Error('Pinata JWT is required. Please set it in Settings.');
  }

  const formData = new FormData();
  formData.append('file', file);

  const metadata = JSON.stringify({
    name: file.name,
    keyvalues: {
      platform: 'XRPL-DynamicNFT-Editor',
      timestamp: new Date().toISOString(),
    },
  });
  formData.append('pinataMetadata', metadata);

  const options = JSON.stringify({
    cidVersion: 1,
  });
  formData.append('pinataOptions', options);

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

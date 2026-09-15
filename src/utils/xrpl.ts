import type { NFToken, XRPLNetwork } from '../types';

export const RPC_ENDPOINTS: Record<XRPLNetwork, string[]> = {
  mainnet: [
    'https://s2.ripple.com:51234',
    'https://xrplcluster.com',
    'https://s1.ripple.com:51234',
  ],
  testnet: [
    'https://s.altnet.rippletest.net:51234',
    'https://testnet.xrpl-labs.com',
  ],
};

/**
 * Converts a hex string into a UTF-8 string safely.
 */
export function hexToUtf8(hex: string): string {
  if (!hex) return '';
  const cleanHex = hex.trim().replace(/^0x/i, '');
  if (cleanHex.length % 2 !== 0) return '';
  try {
    const bytes = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < cleanHex.length; i += 2) {
      bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
    }
    return new TextDecoder('utf-8').decode(bytes);
  } catch (err) {
    console.error('Error decoding hex string:', err);
    return '';
  }
}

/**
 * Converts a UTF-8 string into uppercase hex.
 * Verifies byte length does not exceed XRPL 256 byte limit.
 */
export function utf8ToHex(str: string): { hex: string; byteLength: number; exceedsLimit: boolean } {
  if (!str) return { hex: '', byteLength: 0, exceedsLimit: false };
  const bytes = new TextEncoder().encode(str);
  const byteLength = bytes.length;
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0').toUpperCase();
  }
  return {
    hex,
    byteLength,
    exceedsLimit: byteLength > 256,
  };
}

/**
 * Parses a 64-character NFTokenID into its subfields.
 */
export function parseNFTokenID(nftId: string) {
  if (!nftId || nftId.length !== 64) {
    return null;
  }
  const flagsHex = nftId.substring(0, 4);
  const flags = parseInt(flagsHex, 16);
  const feeHex = nftId.substring(4, 8);
  const transferFee = parseInt(feeHex, 16);
  const issuerHex = nftId.substring(8, 48);
  const taxonHex = nftId.substring(48, 56);
  const taxon = parseInt(taxonHex, 16);
  const serialHex = nftId.substring(56, 64);
  const serial = parseInt(serialHex, 16);

  return {
    flags,
    isBurnable: (flags & 0x0001) !== 0,
    isOnlyXRP: (flags & 0x0002) !== 0,
    isTrustLine: (flags & 0x0004) !== 0,
    isTransferable: (flags & 0x0008) !== 0,
    isMutable: (flags & 0x0010) !== 0, // DynamicNFT tfMutable flag
    transferFee, // 0 to 50000 (basis points, 1000 = 1%)
    royaltyPercent: (transferFee / 1000).toFixed(3),
    issuerHex,
    taxon,
    serial,
  };
}

/**
 * Queries XRPL RPC endpoint using JSON-RPC.
 */
async function callXRPLRPC(method: string, params: any[], network: XRPLNetwork = 'mainnet') {
  const endpoints = RPC_ENDPOINTS[network];
  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method,
          params,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();
      if (json.result && json.result.status === 'success') {
        return json.result;
      } else if (json.result && json.result.error) {
        throw new Error(`XRPL RPC Error: ${json.result.error_message || json.result.error}`);
      }
      return json.result;
    } catch (err) {
      lastError = err;
      console.warn(`Endpoint ${endpoint} failed for ${method}:`, err);
    }
  }

  throw lastError || new Error('All XRPL endpoints failed');
}

/**
 * Fetches all NFTs for an account, with pagination.
 */
export async function fetchAccountNFTs(account: string, network: XRPLNetwork = 'mainnet'): Promise<NFToken[]> {
  const allNfts: NFToken[] = [];
  let marker: any = undefined;

  do {
    const params: any = {
      account,
      ledger_index: 'validated',
      limit: 100,
    };
    if (marker) {
      params.marker = marker;
    }

    const result = await callXRPLRPC('account_nfts', [params], network);
    const nfts = result.account_nfts || [];

    for (const item of nfts) {
      const parsed = parseNFTokenID(item.NFTokenID);
      const decodedUri = item.URI ? hexToUtf8(item.URI) : '';
      
      allNfts.push({
        nft_id: item.NFTokenID,
        issuer: item.Issuer,
        nft_taxon: item.NFTokenTaxon,
        nft_serial: item.nft_serial,
        transfer_fee: item.TransferFee || 0,
        flags: item.Flags || 0,
        uri: item.URI,
        decodedUri,
        isMutable: parsed ? parsed.isMutable : ((item.Flags || 0) & 0x0010) !== 0,
        isTransferable: parsed ? parsed.isTransferable : ((item.Flags || 0) & 0x0008) !== 0,
        isBurnable: parsed ? parsed.isBurnable : ((item.Flags || 0) & 0x0001) !== 0,
      });
    }

    marker = result.marker;
  } while (marker);

  return allNfts;
}

/**
 * Queries info for a single NFT using Clio nft_info.
 */
export async function fetchNFTInfo(nftId: string, network: XRPLNetwork = 'mainnet') {
  try {
    const result = await callXRPLRPC('nft_info', [{ nft_id: nftId }], network);
    return result;
  } catch (err) {
    // Fallback to XRPScan API on mainnet if clio returns unknownCmd
    if (network === 'mainnet') {
      const resp = await fetch(`https://api.xrpscan.com/api/v1/nft/${nftId}`);
      if (resp.ok) {
        return await resp.json();
      }
    }
    throw err;
  }
}

/**
 * Builds the unsigned NFTokenModify transaction object.
 */
export function buildNFTokenModifyTx(
  account: string,
  nftId: string,
  hexUri: string,
  owner?: string
) {
  const tx: Record<string, any> = {
    TransactionType: 'NFTokenModify',
    Account: account,
    NFTokenID: nftId,
  };

  if (owner && owner !== account) {
    tx.Owner = owner;
  }

  if (hexUri) {
    tx.URI = hexUri;
  }

  return tx;
}

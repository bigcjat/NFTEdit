import type { NFToken, XRPLNetwork } from '../types';

export const RPC_ENDPOINTS: Record<XRPLNetwork, string[]> = {
  mainnet: [
    'https://s1.ripple.com:51234',
    'https://s2.ripple.com:51234',
  ],
  testnet: [
    'https://s.altnet.rippletest.net:51234',
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
 * Fetches all NFTs minted by an account.
 * First queries the XRPL Data API for all tokens minted by this issuer (including tokens now held by collectors).
 * Falls back to querying Ripple's Clio node (account_nfts filtered to Issuer === account).
 */
export async function fetchAccountNFTs(account: string, network: XRPLNetwork = 'mainnet'): Promise<NFToken[]> {
  // 1. On mainnet, attempt to query all tokens minted by this issuer
  if (network === 'mainnet') {
    try {
      const resp = await fetch(`https://api.xrpldata.com/api/v1/xls20-nfts/issuer/${account}`);
      if (resp.ok) {
        const json = await resp.json();
        const nfts = json?.data?.nfts || [];
        if (nfts.length > 0) {
          return nfts.map((item: any) => {
            const parsed = parseNFTokenID(item.NFTokenID);
            const decodedUri = item.URI ? hexToUtf8(item.URI) : '';
            return {
              nft_id: item.NFTokenID,
              issuer: item.Issuer,
              owner: item.Owner,
              nft_taxon: item.Taxon !== undefined ? item.Taxon : item.NFTokenTaxon,
              nft_serial: item.Sequence !== undefined ? item.Sequence : item.nft_serial,
              transfer_fee: item.TransferFee || 0,
              flags: item.Flags || 0,
              uri: item.URI,
              decodedUri,
              isMutable: parsed ? parsed.isMutable : ((item.Flags || 0) & 0x0010) !== 0,
              isTransferable: parsed ? parsed.isTransferable : ((item.Flags || 0) & 0x0008) !== 0,
              isBurnable: parsed ? parsed.isBurnable : ((item.Flags || 0) & 0x0001) !== 0,
            };
          });
        }
      }
    } catch (err) {
      console.warn('xrpldata issuer query failed, falling back to Clio node:', err);
    }
  }

  // 2. Direct Clio node query (s1/s2.ripple.com) with strict Issuer filter
  const allNfts: NFToken[] = [];
  let marker: any = undefined;

  do {
    const params: any = {
      account,
      ledger_index: 'validated',
      limit: 400,
    };
    if (marker) {
      params.marker = marker;
    }

    const result = await callXRPLRPC('account_nfts', [params], network);
    const nfts = result.account_nfts || [];

    for (const item of nfts) {
      // STRICT FILTER: Only include NFTs that were minted by this account!
      if (item.Issuer !== account) {
        continue;
      }

      const parsed = parseNFTokenID(item.NFTokenID);
      const decodedUri = item.URI ? hexToUtf8(item.URI) : '';
      
      allNfts.push({
        nft_id: item.NFTokenID,
        issuer: item.Issuer,
        owner: account,
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
  return await callXRPLRPC('nft_info', [{ nft_id: nftId }], network);
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

/**
 * Test tokens from the Footwork by MuseForge collection (Taxon 3668)
 * for testing dynamic NFT modifications on Taxon 4.
 */
export interface TestMintToken {
  id: number;
  name: string;
  description: string;
  uri: string;
  hexUri: string;
  image: string;
}

export const TEST_TAXON_4_TOKENS: TestMintToken[] = [
  {
    id: 1,
    name: 'Vincent Van Togh',
    description: 'The artist behind Footwork by MuseForge.',
    uri: 'ipfs://QmcNaakb8LNqsTJaVQ2kCu5HV1sqFRTKiWYyXqS69ic77w',
    hexUri: '697066733A2F2F516D634E61616B62384C4E7173544A615651326B43753548563173714652544B6957597958715336396963373777',
    image: 'ipfs://QmTu25app7RWxfc8GLDsFAfAryaayZNS68EZPgysiFkTKH',
  },
  {
    id: 2,
    name: 'Footwork Timelapse - 3D Dragon',
    description: 'Preserved creation timelapse of the first Footwork drawing.',
    uri: 'ipfs://Qmcv7uJicnnYeUMdxMG1rbZAidA9GUWaR9KbUEthqCq6Do',
    hexUri: '697066733A2F2F516D637637754A69636E6E5965554D64784D473172625A41696441394755576152394B625545746871437136446F',
    image: 'ipfs://QmcByJ3QL3oMjeRJmyadZnTaTmCs4Cbg9mRXYY1brqcd4h',
  },
  {
    id: 3,
    name: '3D Dragon',
    description: 'Inaugural foot-drawn artwork (original token 00181F409C86CAF471D6218D8ECADF1C65F5845E3837EAB571CC418203CA1B3B).',
    uri: 'ipfs://Qmd9RCvyNzhXM9gHHjoofFCuxamRQVzrygJBTFnuTjiK9d',
    hexUri: '697066733A2F2F516D6439524376794E7A68584D396748486A6F6F6646437578616D5251567A7279674A4254466E75546A694B3964',
    image: 'ipfs://QmV6pStymHoAPWgmeq843LAL2N71Nhv2USkJDvKhvJzZA9',
  },
];

/**
 * Builds the unsigned NFTokenMint transaction object.
 * Flags: 24 (tfTransferable = 8 | tfMutable = 16) allows live dynamic metadata editing.
 */
export function buildNFTokenMintTx(
  account: string,
  taxon: number = 4,
  hexUri: string,
  flags: number = 24,
  transferFee: number = 0
) {
  const tx: Record<string, any> = {
    TransactionType: 'NFTokenMint',
    Account: account,
    NFTokenTaxon: taxon,
    Flags: flags,
  };

  if (transferFee > 0) {
    tx.TransferFee = transferFee;
  }

  if (hexUri) {
    tx.URI = hexUri;
  }

  return tx;
}


export type XRPLNetwork = 'mainnet' | 'testnet';

export interface TraitAttribute {
  trait_type: string;
  value: string | number;
  display_type?: string;
  max_value?: number;
}

export interface NFTMetadata {
  schema?: string;
  nftType?: string;
  name: string;
  description?: string;
  image?: string;
  animation?: string;
  video?: string;
  audio?: string;
  '3d_model'?: string;
  collection?: {
    name?: string;
    family?: string;
    description?: string;
  };
  attributes?: TraitAttribute[];
  license?: string;
  [key: string]: any;
}

export interface NFToken {
  nft_id: string;
  ledger_index?: number;
  owner?: string;
  issuer: string;
  nft_taxon: number;
  nft_serial: number;
  transfer_fee: number;
  flags: number;
  uri?: string; // Hex string from ledger
  decodedUri?: string; // UTF-8 string (e.g. ipfs://...)
  isMutable: boolean; // (flags & 0x0010) !== 0
  isTransferable: boolean; // (flags & 0x0008) !== 0
  isBurnable: boolean; // (flags & 0x0001) !== 0
  metadata?: NFTMetadata | null;
  metadataLoading?: boolean;
  metadataError?: string | null;
}

export interface MultiByteDetail {
  char: string;
  bytes: number;
  codePoint: string;
}

export interface FieldAudit {
  charCount: number;
  graphemeCount: number;
  byteCount: number;
  multiByteChars: MultiByteDetail[];
  illegalChars: string[];
  warnings: string[];
  isValid: boolean;
}

export interface XamanSettings {
  apiKey: string;
  apiSecret: string;
  userAddress: string;
  isConnected: boolean;
}

export interface PinataSettings {
  jwt: string;
  gateway: string;
  relayUrl?: string;
}

export interface ModifyPayload {
  nftId: string;
  newUri: string;
  hexUri: string;
  hexByteLength: number;
  metadata: NFTMetadata;
}

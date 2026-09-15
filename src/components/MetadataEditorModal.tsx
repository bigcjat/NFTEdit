import React, { useState, useEffect, useMemo } from 'react';
import type { NFToken, NFTMetadata, TraitAttribute } from '../types';
import { auditField, auditMetadata, sanitizeText } from '../utils/audit';
import { ByteBadge } from './ByteBadge';
import { downloadJsonFile, fetchIPFSMetadata } from '../utils/ipfs';
import { IPFSImage } from './IPFSImage';
import { 
  X, 
  Sparkles, 
  Lock, 
  Download, 
  Wrench, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Code, 
  Eye, 
  ArrowRight,
  Info,
  RefreshCw
} from 'lucide-react';


interface MetadataEditorModalProps {
  nft: NFToken | null;
  isOpen: boolean;
  onClose: () => void;
  onProceedToSign: (updatedMetadata: NFTMetadata) => void;
  customGateway?: string;
}

export const MetadataEditorModal: React.FC<MetadataEditorModalProps> = ({
  nft,
  isOpen,
  onClose,
  onProceedToSign,
  customGateway,
}) => {
  if (!isOpen || !nft) return null;

  // Local editable metadata state: NEVER use fake mock data. Either real metadata or null!
  const initialMetadata: NFTMetadata | null = useMemo(() => {
    if (nft.metadata) {
      return JSON.parse(JSON.stringify(nft.metadata));
    }
    return null;
  }, [nft]);

  const [metadata, setMetadata] = useState<NFTMetadata | null>(initialMetadata);
  const [activeTab, setActiveTab] = useState<'form' | 'raw'>('form');
  const [rawJsonText, setRawJsonText] = useState('');
  const [rawJsonError, setRawJsonError] = useState<string | null>(null);
  const [isFetchingIpfs, setIsFetchingIpfs] = useState<boolean>(false);
  const [fetchIpfsError, setFetchIpfsError] = useState<string | null>(null);

  // Sync initial metadata when opening
  useEffect(() => {
    setMetadata(initialMetadata);
    setRawJsonText(initialMetadata ? JSON.stringify(initialMetadata, null, 2) : '');
  }, [initialMetadata]);

  // Load actual IPFS metadata on-demand if token has decodedUri and metadata is not cached
  const handleLoadFromIPFS = async () => {
    if (!nft?.decodedUri) return;
    setIsFetchingIpfs(true);
    setFetchIpfsError(null);
    try {
      const fetched = await fetchIPFSMetadata(nft.decodedUri, customGateway, nft.nft_id);
      setMetadata(fetched);
      setRawJsonText(JSON.stringify(fetched, null, 2));
      setRawJsonError(null);
    } catch (err: any) {
      console.warn('Could not load IPFS metadata for modal:', err);
      setFetchIpfsError('Could not fetch IPFS metadata from fallback gateways.');
    } finally {
      setIsFetchingIpfs(false);
    }
  };

  useEffect(() => {
    if (isOpen && nft && !nft.metadata && nft.decodedUri) {
      handleLoadFromIPFS();
    }
  }, [isOpen, nft?.nft_id, nft?.decodedUri]);

  // Handle Raw JSON input changes
  const handleRawJsonChange = (val: string) => {
    setRawJsonText(val);
    try {
      const parsed = JSON.parse(val);
      setMetadata(parsed);
      setRawJsonError(null);
    } catch (err: any) {
      setRawJsonError(err.message);
    }
  };

  // Sync raw text when form changes
  const updateFormMetadata = (newMeta: NFTMetadata) => {
    setMetadata(newMeta);
    setRawJsonText(JSON.stringify(newMeta, null, 2));
    setRawJsonError(null);
  };

  // Audits
  const nameAudit = useMemo(() => auditField(metadata?.name || '', 'Name'), [metadata?.name]);
  const descAudit = useMemo(() => auditField(metadata?.description || '', 'Description'), [metadata?.description]);
  const imageAudit = useMemo(() => auditField(metadata?.image || '', 'Image'), [metadata?.image]);
  const collectionAudit = useMemo(
    () => auditField(metadata?.collection?.name || '', 'Collection'),
    [metadata?.collection?.name]
  );

  const globalAudit = useMemo(() => {
    if (!metadata) {
      return { hasErrors: false, totalJsonBytes: 0, totalJsonChars: 0, fieldAudits: [], allMultiByteChars: [] };
    }
    return auditMetadata(metadata);
  }, [metadata]);


  // Sanitize All fields
  const handleSanitizeAll = () => {
    if (!metadata) return;
    const cleaned: NFTMetadata = JSON.parse(JSON.stringify(metadata));
    if (cleaned.name) cleaned.name = sanitizeText(cleaned.name);
    if (cleaned.description) cleaned.description = sanitizeText(cleaned.description);
    if (cleaned.collection?.name) cleaned.collection.name = sanitizeText(cleaned.collection.name);
    if (cleaned.attributes && Array.isArray(cleaned.attributes)) {
      cleaned.attributes = cleaned.attributes.map((attr) => ({
        ...attr,
        trait_type: sanitizeText(attr.trait_type),
        value: typeof attr.value === 'string' ? sanitizeText(attr.value) : attr.value,
      }));
    }
    updateFormMetadata(cleaned);
  };

  // Attribute Handlers
  const handleAttributeChange = (index: number, key: keyof TraitAttribute, val: any) => {
    if (!metadata) return;
    const attrs = [...(metadata.attributes || [])];
    attrs[index] = { ...attrs[index], [key]: val };
    updateFormMetadata({ ...metadata, attributes: attrs });
  };

  const handleAddAttribute = () => {
    if (!metadata) return;
    const attrs = [...(metadata.attributes || []), { trait_type: '', value: '' }];
    updateFormMetadata({ ...metadata, attributes: attrs });
  };

  const handleRemoveAttribute = (index: number) => {
    if (!metadata) return;
    const attrs = (metadata.attributes || []).filter((_, i) => i !== index);
    updateFormMetadata({ ...metadata, attributes: attrs });
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(4, 7, 16, 0.85)',
        backdropFilter: 'blur(10px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1180px',
          height: '92vh',
          backgroundColor: 'rgba(13, 20, 36, 0.98)',
          border: '1px solid var(--border-card)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.85)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div
          style={{
            padding: '16px 22px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: nft.isMutable ? 'var(--accent-cyan-dim)' : 'rgba(255, 255, 255, 0.05)',
                color: nft.isMutable ? 'var(--accent-cyan)' : 'var(--text-muted)',
                border: `1px solid ${nft.isMutable ? 'rgba(0, 230, 203, 0.3)' : 'var(--border-subtle)'}`,
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              {nft.isMutable ? <Sparkles size={13} /> : <Lock size={13} />}
              <span>{nft.isMutable ? 'tfMutable (Dynamic NFT)' : 'Immutable NFT'}</span>
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {metadata?.name || `NFToken Serial #${nft.nft_serial}`}
            </h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Taxon #{nft.nft_taxon} • Serial #{nft.nft_serial}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* View Mode Toggle */}
            <div
              style={{
                display: 'flex',
                background: 'rgba(255, 255, 255, 0.04)',
                borderRadius: 'var(--radius-md)',
                padding: '2px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('form')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  background: activeTab === 'form' ? 'var(--accent-cyan-dim)' : 'transparent',
                  color: activeTab === 'form' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <Eye size={13} /> Form Editor
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('raw')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  background: activeTab === 'raw' ? 'var(--accent-purple-dim)' : 'transparent',
                  color: activeTab === 'raw' ? 'var(--accent-purple)' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <Code size={13} /> Raw JSON
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '6px',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-muted)',
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* On-demand IPFS Load Banner */}
        {!metadata ? (
          <div
            style={{
              flex: 1,
              padding: '60px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '18px',
              textAlign: 'center',
              minHeight: '360px',
            }}
          >
            {isFetchingIpfs ? (
              <>
                <RefreshCw size={44} className="animate-spin" color="var(--accent-cyan)" />
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#fff' }}>
                    Fetching Real Metadata from IPFS...
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '8px', wordBreak: 'break-all' }}>
                    {nft.decodedUri}
                  </p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', marginTop: '10px' }}>
                    Querying fallback gateways (Filebase, Orbitor, Pinata, IPFS.io)...
                  </p>
                </div>
              </>
            ) : (
              <>
                <AlertTriangle size={44} color="var(--accent-amber)" />
                <div style={{ maxWidth: '520px' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#fff' }}>
                    Unable to Fetch IPFS Metadata
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '8px', wordBreak: 'break-all' }}>
                    {nft.decodedUri}
                  </p>
                  <p style={{ fontSize: '0.82rem', color: '#fca5a5', marginTop: '10px', lineHeight: 1.5 }}>
                    {fetchIpfsError || 'Failed to reach IPFS gateways for this token URI.'}
                  </p>
                  <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                    We never display placeholder or fake metadata. You can retry the gateways, or start a new metadata file.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={handleLoadFromIPFS}
                    style={{
                      padding: '10px 20px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--accent-cyan)',
                      color: '#060913',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      border: 'none',
                    }}
                  >
                    Retry Fetch
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const blank: NFTMetadata = {
                        name: '',
                        description: '',
                        image: '',
                        attributes: [],
                      };
                      setMetadata(blank);
                      setRawJsonText(JSON.stringify(blank, null, 2));
                    }}
                    style={{
                      padding: '10px 20px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: 'var(--text-primary)',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    Create Blank Metadata File
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Global Audit Metric Banner */}
            <div
              style={{
                padding: '10px 22px',
                backgroundColor: globalAudit.hasErrors ? 'rgba(244, 63, 94, 0.12)' : 'rgba(15, 23, 42, 0.4)',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                fontSize: '0.8rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                  {globalAudit.hasErrors ? (
                    <AlertTriangle size={16} color="var(--accent-rose)" />
                  ) : (
                    <CheckCircle2 size={16} color="var(--accent-emerald)" />
                  )}
                  <span>Total JSON Payload:</span>
                  <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {globalAudit.totalJsonBytes} bytes
                  </strong>
                  <span style={{ color: 'var(--text-muted)' }}>({globalAudit.totalJsonChars} chars)</span>
                </span>

                {globalAudit.allMultiByteChars.length > 0 && (
                  <span style={{ color: 'var(--accent-amber)', fontSize: '0.75rem' }}>
                    • {globalAudit.allMultiByteChars.length} unique emoji/multi-byte glyphs detected
                  </span>
                )}

                {globalAudit.hasErrors && (
                  <span style={{ color: 'var(--accent-rose)', fontWeight: 600 }}>
                    • Breaking characters detected (such as &quot;&#125;&quot; or illegal syntax)
                  </span>
                )}
              </div>

              {globalAudit.hasErrors && (
                <button
                  type="button"
                  onClick={handleSanitizeAll}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--accent-rose)',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <Wrench size={13} />
                  Sanitize All Breaking Characters
                </button>
              )}
            </div>

            {/* Modal Main Content (2-Column Layout) */}
            <div
              style={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: '320px 1fr',
                overflow: 'hidden',
              }}
              className="editor-grid-layout"
            >
              {/* Left Column: Media & Ledger Details */}
              <div
                style={{
                  padding: '20px',
                  borderRight: '1px solid var(--border-subtle)',
                  overflowY: 'auto',
                  backgroundColor: 'rgba(10, 15, 28, 0.4)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                {/* Image Preview with multi-gateway cycling */}
                <div
                  style={{
                    width: '100%',
                    paddingTop: '100%',
                    position: 'relative',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    backgroundColor: '#0a0f1d',
                    border: '1px solid var(--border-card)',
                  }}
                >
                  <div style={{ position: 'absolute', inset: 0 }}>
                    <IPFSImage
                      src={metadata.image}
                      alt={metadata.name || 'NFT Image'}
                      customGateway={customGateway}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                </div>

            {/* Token Ledger Metadata */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                fontSize: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>On-Ledger Token Info</div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block' }}>NFTokenID:</span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--accent-cyan)',
                    fontSize: '0.68rem',
                    wordBreak: 'break-all',
                  }}
                >
                  {nft.nft_id}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>Transfer Fee:</span>
                  <span style={{ fontWeight: 600, color: 'var(--accent-amber)' }}>
                    {(nft.transfer_fee / 1000).toFixed(2)}%
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>Flags:</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{nft.flags} (0x{nft.flags.toString(16)})</span>
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block' }}>Current URI:</span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.68rem',
                    wordBreak: 'break-all',
                  }}
                >
                  {nft.decodedUri || 'None'}
                </span>
              </div>

            </div>

            {/* Mutable Flag Guidance */}
            {!nft.isMutable && (
              <div
                style={{
                  background: 'rgba(244, 63, 94, 0.1)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  fontSize: '0.75rem',
                  color: '#fca5a5',
                  display: 'flex',
                  gap: '8px',
                }}
              >
                <Info size={18} style={{ flexShrink: 0 }} />
                <span>
                  <strong>Immutable Token:</strong> This NFT was minted without the <code style={{ color: '#fff' }}>tfMutable</code> flag. The XRPL ledger will reject any <code style={{ color: '#fff' }}>NFTokenModify</code> transaction for this token.
                </span>
              </div>
            )}
          </div>

          {/* Right Column: Visual Form / Raw JSON Editor */}
          <div style={{ padding: '22px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {activeTab === 'form' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Field: Token Name */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Token Name
                    </label>
                    <ByteBadge
                      audit={nameAudit}
                      onSanitize={() => updateFormMetadata({ ...metadata, name: sanitizeText(metadata.name) })}
                    />
                  </div>
                  <input
                    type="text"
                    value={metadata.name || ''}
                    onChange={(e) => updateFormMetadata({ ...metadata, name: e.target.value })}
                    placeholder="e.g. 3D Dragon"
                  />
                </div>

                {/* Field: Description */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Description
                    </label>
                    <ByteBadge
                      audit={descAudit}
                      onSanitize={() =>
                        updateFormMetadata({ ...metadata, description: sanitizeText(metadata.description) })
                      }
                    />
                  </div>
                  <textarea
                    rows={6}
                    value={metadata.description || ''}
                    onChange={(e) => updateFormMetadata({ ...metadata, description: e.target.value })}
                    placeholder="Provide token story, provenance, physical delivery terms..."
                    style={{ lineHeight: 1.6 }}
                  />
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    💡 Emojis (e.g. ✍️, 🦶, 🔐) occupy 4 to 8 bytes each due to Unicode variation selectors. Watch the byte total!
                  </div>
                </div>

                {/* Field: Image URI */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Image URI / IPFS CID
                    </label>
                    <ByteBadge audit={imageAudit} compact />
                  </div>
                  <input
                    type="text"
                    value={metadata.image || ''}
                    onChange={(e) => updateFormMetadata({ ...metadata, image: e.target.value })}
                    placeholder="ipfs://Qm... or https://..."
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                  />
                </div>

                {/* Field: Collection Info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Collection Name
                      </label>
                      <ByteBadge audit={collectionAudit} compact />
                    </div>
                    <input
                      type="text"
                      value={metadata.collection?.name || ''}
                      onChange={(e) =>
                        updateFormMetadata({
                          ...metadata,
                          collection: { ...metadata.collection, name: e.target.value },
                        })
                      }
                      placeholder="e.g. Footwork by MuseForge"
                    />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        License
                      </label>
                    </div>
                    <input
                      type="text"
                      value={metadata.license || ''}
                      onChange={(e) => updateFormMetadata({ ...metadata, license: e.target.value })}
                      placeholder="e.g. CC BY-NC-SA"
                    />
                  </div>
                </div>

                {/* Attributes Section */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div>
                      <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Attributes / Traits ({metadata.attributes?.length || 0})
                      </label>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>
                        Each trait has its own character and byte tracking
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddAttribute}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(0, 230, 203, 0.1)',
                        border: '1px solid rgba(0, 230, 203, 0.3)',
                        color: 'var(--accent-cyan)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <Plus size={13} /> Add Trait
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(metadata.attributes || []).map((attr, idx) => {
                      const traitAudit = auditField(attr.trait_type || '', `Trait Type #${idx}`);
                      const valAudit = auditField(String(attr.value || ''), `Trait Value #${idx}`);

                      return (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'rgba(255, 255, 255, 0.02)',
                            padding: '8px 10px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-subtle)',
                            flexWrap: 'wrap',
                          }}
                        >
                          <div style={{ flex: '1 1 140px' }}>
                            <input
                              type="text"
                              value={attr.trait_type}
                              onChange={(e) => handleAttributeChange(idx, 'trait_type', e.target.value)}
                              placeholder="Trait Type"
                              style={{ fontSize: '0.8rem', padding: '5px 8px' }}
                            />
                            <div style={{ marginTop: '2px' }}>
                              <ByteBadge audit={traitAudit} compact />
                            </div>
                          </div>

                          <div style={{ flex: '1 1 140px' }}>
                            <input
                              type="text"
                              value={attr.value}
                              onChange={(e) => handleAttributeChange(idx, 'value', e.target.value)}
                              placeholder="Value"
                              style={{ fontSize: '0.8rem', padding: '5px 8px' }}
                            />
                            <div style={{ marginTop: '2px' }}>
                              <ByteBadge audit={valAudit} compact />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveAttribute(idx)}
                            style={{
                              padding: '6px',
                              borderRadius: 'var(--radius-sm)',
                              color: 'var(--accent-rose)',
                              alignSelf: 'center',
                            }}
                            title="Remove Trait"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* Raw JSON Tab */
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Direct JSON Editor (Validates syntax in real time)
                  </span>
                  {rawJsonError ? (
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-rose)' }}>
                      JSON Syntax Error: {rawJsonError}
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={14} /> Valid JSON Syntax
                    </span>
                  )}
                </div>
                <textarea
                  value={rawJsonText}
                  onChange={(e) => handleRawJsonChange(e.target.value)}
                  style={{
                    flex: 1,
                    minHeight: '380px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.82rem',
                    lineHeight: 1.5,
                    background: '#090e1c',
                    color: '#e2e8f0',
                    border: `1px solid ${rawJsonError ? 'var(--accent-rose)' : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '14px',
                    whiteSpace: 'pre',
                  }}
                />
              </div>
            )}
          </div>
        </div>
        </>
        )}

        {/* Footer Action Bar */}
        <div
          style={{
            padding: '16px 22px',
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: 'rgba(10, 15, 28, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', gap: '10px' }}>
            {metadata && (
              <button
                type="button"
                onClick={() => downloadJsonFile(metadata, `${metadata.name || 'nft'}-metadata`)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Download size={14} /> Download JSON
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-secondary)',
                fontSize: '0.85rem',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => metadata && onProceedToSign(metadata)}
              disabled={!metadata || !nft.isMutable || globalAudit.hasErrors || !!rawJsonError}
              title={
                !nft.isMutable
                  ? 'Token is immutable (tfMutable is not set)'
                  : !metadata
                  ? 'No metadata loaded'
                  : globalAudit.hasErrors
                  ? 'Please resolve or sanitize breaking syntax characters before saving'
                  : 'Save to IPFS & Prepare NFTokenModify'
              }
              style={{
                padding: '9px 22px',
                borderRadius: 'var(--radius-md)',
                background:
                  !metadata || !nft.isMutable || globalAudit.hasErrors || !!rawJsonError
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'linear-gradient(135deg, #00e6cb 0%, #38bdf8 100%)',
                color: !metadata || !nft.isMutable || globalAudit.hasErrors || !!rawJsonError ? 'var(--text-muted)' : '#060913',
                fontWeight: 600,
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: metadata && nft.isMutable && !globalAudit.hasErrors ? '0 0 20px -3px rgba(0, 230, 203, 0.4)' : 'none',
              }}
            >
              <span>Upload to IPFS & Modify URI</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

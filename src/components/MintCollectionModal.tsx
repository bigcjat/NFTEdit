import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Layers, 
  CheckCircle2, 
  RefreshCw, 
  Smartphone, 
  Key, 
  Copy, 
  Check, 
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { 
  TEST_TAXON_4_TOKENS, 
  buildNFTokenMintTx, 
  type TestMintToken 
} from '../utils/xrpl';
import type { XRPLNetwork, XamanSettings } from '../types';
import { createXamanPayload, generateClientQRCode, subscribeToXamanPayload } from '../utils/xaman';
import { Client, Wallet } from 'xrpl';
import { IPFSImage } from './IPFSImage';

interface MintCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  userAccount: string;
  network: XRPLNetwork;
  xamanSettings: XamanSettings;
  customGateway?: string;
  onMintSuccess: (taxon: number) => void;
}

interface TokenMintStatus {
  status: 'idle' | 'preparing' | 'signing' | 'minting' | 'minted' | 'error';
  txHash?: string;
  error?: string;
}

export const MintCollectionModal: React.FC<MintCollectionModalProps> = ({
  isOpen,
  onClose,
  userAccount,
  network,
  xamanSettings,
  customGateway,
  onMintSuccess,
}) => {
  if (!isOpen) return null;

  const [activeAccount, setActiveAccount] = useState<string>(userAccount || '');
  const [activeMethod, setActiveMethod] = useState<'xaman' | 'seed' | 'raw'>('xaman');
  const [activeTokenIndex, setActiveTokenIndex] = useState<number>(0);

  // Mint status for each token (index 0, 1, 2)
  const [statuses, setStatuses] = useState<Record<number, TokenMintStatus>>({
    0: { status: 'idle' },
    1: { status: 'idle' },
    2: { status: 'idle' },
  });

  // Xaman signing state
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [isCreatingPayload, setIsCreatingPayload] = useState<boolean>(false);
  const [xamanError, setXamanError] = useState<string | null>(null);

  // Seed signing state
  const [secretKey, setSecretKey] = useState<string>('');
  const [isBatchMinting, setIsBatchMinting] = useState<boolean>(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<string>('');

  // Raw JSON copy state
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const rpcServer = network === 'mainnet' ? 'https://s2.ripple.com:51234' : 'https://s.altnet.rippletest.net:51234';

  const currentToken = TEST_TAXON_4_TOKENS[activeTokenIndex];
  const allMinted = Object.values(statuses).every((s) => s.status === 'minted');

  // Generate Tx for a given token
  const getTxForToken = (token: TestMintToken) => {
    return buildNFTokenMintTx(
      activeAccount.trim(),
      4, // Taxon 4
      token.hexUri,
      24 // tfTransferable | tfMutable
    );
  };

  // Start Xaman Sign for activeTokenIndex
  const handleStartXamanSign = async (index: number) => {
    const targetAccount = activeAccount.trim();
    if (!targetAccount.startsWith('r') || targetAccount.length < 25) {
      setXamanError('Please enter a valid XRPL account address (r...).');
      return;
    }

    setActiveTokenIndex(index);
    setIsCreatingPayload(true);
    setXamanError(null);
    setQrDataUrl(null);
    setDeepLink(null);

    const token = TEST_TAXON_4_TOKENS[index];
    const tx = buildNFTokenMintTx(targetAccount, 4, token.hexUri, 24);

    setStatuses((prev) => ({
      ...prev,
      [index]: { status: 'signing' },
    }));

    // If Xaman API configured
    if (xamanSettings.apiKey && xamanSettings.apiSecret) {
      try {
        const payload = await createXamanPayload(tx, xamanSettings.apiKey, xamanSettings.apiSecret);
        if (payload?.refs?.qr_png) {
          setQrDataUrl(payload.refs.qr_png);
          if (payload.next?.always) {
            setDeepLink(payload.next.always);
          }
          if (payload.refs.websocket_status) {
            subscribeToXamanPayload(
              payload.refs.websocket_status,
              (res) => {
                if (res.signed && res.txid) {
                  setStatuses((prev) => ({
                    ...prev,
                    [index]: { status: 'minted', txHash: res.txid },
                  }));
                  setQrDataUrl(null);
                  setDeepLink(null);

                  // Auto advance to next unminted token
                  const nextIndex = TEST_TAXON_4_TOKENS.findIndex((_, i) => i > index && statuses[i]?.status !== 'minted');
                  if (nextIndex !== -1) {
                    setActiveTokenIndex(nextIndex);
                  }
                }
              },
              (err) => {
                console.error('Xaman WS error:', err);
                setXamanError('WebSocket error from Xaman. Please retry.');
              }
            );
          }
          setIsCreatingPayload(false);
          return;
        }
      } catch (err: any) {
        console.warn('Xaman API payload creation failed, falling back to QR:', err);
      }
    }

    // Fallback: Client QR & xumm.app deep link
    try {
      const qrUrl = await generateClientQRCode(JSON.stringify(tx));
      setQrDataUrl(qrUrl);
      setDeepLink(`https://xumm.app/sign?payload=${encodeURIComponent(JSON.stringify(tx))}`);
    } catch (e: any) {
      setXamanError('Could not generate client QR code: ' + e.message);
    } finally {
      setIsCreatingPayload(false);
    }
  };

  // Batch mint with seed
  const handleBatchMintWithSeed = async () => {
    const targetAccount = activeAccount.trim();
    if (!secretKey.trim()) {
      setBatchError('Please enter your account family seed (s...).');
      return;
    }

    setIsBatchMinting(true);
    setBatchError(null);
    setBatchProgress('Connecting to XRPL node...');

    let client: Client | null = null;
    try {
      client = new Client(rpcServer);
      await client.connect();

      const wallet = Wallet.fromSeed(secretKey.trim());
      const accountToUse = targetAccount || wallet.classicAddress;
      setActiveAccount(accountToUse);

      for (let i = 0; i < TEST_TAXON_4_TOKENS.length; i++) {
        const token = TEST_TAXON_4_TOKENS[i];
        if (statuses[i]?.status === 'minted') {
          continue; // skip already minted
        }

        setBatchProgress(`Submitting Token ${i + 1}/3: ${token.name}...`);
        setStatuses((prev) => ({
          ...prev,
          [i]: { status: 'minting' },
        }));

        const tx = buildNFTokenMintTx(wallet.classicAddress, 4, token.hexUri, 24);
        const prepared = await client.autofill(tx as any);
        const signed = wallet.sign(prepared);
        const response = await client.submitAndWait(signed.tx_blob);

        const meta = response.result.meta;
        const txResult = typeof meta === 'object' && meta ? (meta as any).TransactionResult : '';

        if (txResult === 'tesSUCCESS') {
          const hash = response.result.hash;
          setStatuses((prev) => ({
            ...prev,
            [i]: { status: 'minted', txHash: hash },
          }));
        } else {
          throw new Error(`Token ${i + 1} mint failed with code: ${txResult}`);
        }
      }

      setBatchProgress('All 3 tokens minted successfully to Taxon 4!');
    } catch (err: any) {
      console.error('Batch mint error:', err);
      setBatchError(err.message || 'Minting error occurred.');
    } finally {
      if (client) {
        await client.disconnect();
      }
      setIsBatchMinting(false);
    }
  };

  // Copy raw JSON
  const handleCopyJson = (index: number) => {
    const token = TEST_TAXON_4_TOKENS[index];
    const tx = getTxForToken(token);
    navigator.clipboard.writeText(JSON.stringify(tx, null, 2));
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(4, 7, 16, 0.88)',
        backdropFilter: 'blur(10px)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '860px',
          maxHeight: '92vh',
          backgroundColor: 'rgba(13, 20, 36, 0.98)',
          border: '1px solid var(--border-card)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.9)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(0, 230, 203, 0.12)',
                border: '1px solid rgba(0, 230, 203, 0.35)',
                color: 'var(--accent-cyan)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff' }}>
                  Mint Test Collection (Taxon 4)
                </h2>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(0, 230, 203, 0.15)',
                    border: '1px solid rgba(0, 230, 203, 0.3)',
                    color: 'var(--accent-cyan)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                  }}
                >
                  tfMutable (Flags: 24)
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Mints the 3 tokens from Footwork / 3D Dragon to Taxon 4 so you can test editing dynamic NFTs
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Account selector banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={16} color="var(--accent-cyan)" />
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Target Account (Issuer):</span>
              <input
                type="text"
                value={activeAccount}
                onChange={(e) => setActiveAccount(e.target.value)}
                placeholder="Enter XRPL Address (r...)"
                style={{
                  padding: '5px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(0, 0, 0, 0.3)',
                  color: '#fff',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8rem',
                  width: '320px',
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <span>Target Taxon:</span>
              <span style={{ color: '#fff', fontWeight: 700, background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                4
              </span>
              <span>Network:</span>
              <span style={{ color: 'var(--accent-cyan)', fontWeight: 600, textTransform: 'capitalize' }}>
                {network}
              </span>
            </div>
          </div>

          {/* Token Cards Grid */}
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
              Collection Tokens to Mint (3 Total)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
              {TEST_TAXON_4_TOKENS.map((token, i) => {
                const status = statuses[i];
                const isSelected = activeTokenIndex === i;
                return (
                  <div
                    key={token.id}
                    onClick={() => setActiveTokenIndex(i)}
                    style={{
                      padding: '12px',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'rgba(0, 230, 203, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                      border: `1px solid ${
                        status.status === 'minted'
                          ? 'rgba(34, 197, 94, 0.5)'
                          : isSelected
                          ? 'var(--accent-cyan)'
                          : 'var(--border-subtle)'
                      }`,
                      cursor: 'pointer',
                      display: 'flex',
                      gap: '12px',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <div
                      style={{
                        width: '54px',
                        height: '54px',
                        borderRadius: 'var(--radius-sm)',
                        overflow: 'hidden',
                        background: '#040710',
                        flexShrink: 0,
                      }}
                    >
                      <IPFSImage
                        src={token.image}
                        alt={token.name}
                        customGateway={customGateway}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {token.name}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                          {token.description}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                        <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                          Taxon 4
                        </span>
                        {status.status === 'minted' ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#4ade80', fontSize: '0.72rem', fontWeight: 700 }}>
                            <CheckCircle2 size={12} /> Minted
                          </span>
                        ) : status.status === 'signing' || status.status === 'minting' ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--accent-cyan)', fontSize: '0.72rem' }}>
                            <RefreshCw size={11} className="animate-spin" /> In Progress
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                            Ready
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Minting Tabs: Xaman / Seed / Raw */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', gap: '16px' }}>
            <button
              type="button"
              onClick={() => setActiveMethod('xaman')}
              style={{
                padding: '8px 4px',
                borderBottom: `2px solid ${activeMethod === 'xaman' ? 'var(--accent-cyan)' : 'transparent'}`,
                color: activeMethod === 'xaman' ? '#ffffff' : 'var(--text-muted)',
                fontWeight: activeMethod === 'xaman' ? 600 : 400,
                fontSize: '0.85rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Smartphone size={15} />
              <span>Sign with Xaman (Mobile / QR)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMethod('seed')}
              style={{
                padding: '8px 4px',
                borderBottom: `2px solid ${activeMethod === 'seed' ? 'var(--accent-cyan)' : 'transparent'}`,
                color: activeMethod === 'seed' ? '#ffffff' : 'var(--text-muted)',
                fontWeight: activeMethod === 'seed' ? 600 : 400,
                fontSize: '0.85rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Key size={15} />
              <span>Fast Batch Mint with Family Seed</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMethod('raw')}
              style={{
                padding: '8px 4px',
                borderBottom: `2px solid ${activeMethod === 'raw' ? 'var(--accent-cyan)' : 'transparent'}`,
                color: activeMethod === 'raw' ? '#ffffff' : 'var(--text-muted)',
                fontWeight: activeMethod === 'raw' ? 600 : 400,
                fontSize: '0.85rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Copy size={15} />
              <span>Raw Tx JSON</span>
            </button>
          </div>

          {/* METHOD 1: XAMAN */}
          {activeMethod === 'xaman' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '8px 0' }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.88rem', color: '#fff', fontWeight: 600 }}>
                  Mint Token {activeTokenIndex + 1} of 3: {currentToken.name}
                </span>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Click below to generate the signing payload for Xaman
                </p>
              </div>

              {xamanError && (
                <div style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(244,63,94,0.15)', color: '#fca5a5', fontSize: '0.78rem' }}>
                  {xamanError}
                </div>
              )}

              {/* QR Code Container */}
              {qrDataUrl ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      padding: '10px',
                      background: '#ffffff',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    }}
                  >
                    <img src={qrDataUrl} alt="Xaman Mint QR" style={{ width: '190px', height: '190px', display: 'block' }} />
                  </div>
                  {deepLink && (
                    <a
                      href={deepLink}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '10px 20px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--accent-cyan)',
                        color: '#060913',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        textDecoration: 'none',
                      }}
                    >
                      <Smartphone size={16} /> Open in Xaman App
                    </a>
                  )}
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Listening for your signature in Xaman...
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleStartXamanSign(activeTokenIndex)}
                  disabled={isCreatingPayload || statuses[activeTokenIndex]?.status === 'minted'}
                  style={{
                    padding: '12px 24px',
                    borderRadius: 'var(--radius-md)',
                    background: statuses[activeTokenIndex]?.status === 'minted' ? 'rgba(255,255,255,0.1)' : 'var(--accent-cyan)',
                    color: statuses[activeTokenIndex]?.status === 'minted' ? 'var(--text-muted)' : '#060913',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: statuses[activeTokenIndex]?.status === 'minted' ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    border: 'none',
                  }}
                >
                  {isCreatingPayload ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Creating Xaman Payload...</span>
                    </>
                  ) : statuses[activeTokenIndex]?.status === 'minted' ? (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Token Already Minted</span>
                    </>
                  ) : (
                    <>
                      <Smartphone size={16} />
                      <span>Generate Xaman Sign Request</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* METHOD 2: SEED BATCH MINT */}
          {activeMethod === 'seed' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={16} color="var(--accent-blue)" />
                <span>
                  Family seeds are processed purely in-memory in your local browser and are never saved or sent to any server.
                </span>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Issuer Family Seed (s...)
                </label>
                <input
                  type="password"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder="s..."
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.85rem',
                    width: '100%',
                  }}
                />
              </div>

              {batchProgress && (
                <div style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <RefreshCw size={14} className={isBatchMinting ? 'animate-spin' : ''} />
                  <span>{batchProgress}</span>
                </div>
              )}

              {batchError && (
                <div style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'rgba(244,63,94,0.15)', color: '#fca5a5', fontSize: '0.78rem' }}>
                  {batchError}
                </div>
              )}

              <button
                type="button"
                onClick={handleBatchMintWithSeed}
                disabled={isBatchMinting || !secretKey.trim() || allMinted}
                style={{
                  alignSelf: 'flex-start',
                  padding: '12px 24px',
                  borderRadius: 'var(--radius-md)',
                  background: allMinted || !secretKey.trim() ? 'rgba(255,255,255,0.1)' : 'var(--accent-cyan)',
                  color: allMinted || !secretKey.trim() ? 'var(--text-muted)' : '#060913',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: allMinted || !secretKey.trim() ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  border: 'none',
                }}
              >
                {isBatchMinting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Minting All 3 Tokens...</span>
                  </>
                ) : allMinted ? (
                  <>
                    <CheckCircle2 size={16} />
                    <span>All 3 Tokens Minted!</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Mint All 3 Tokens to Taxon 4</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* METHOD 3: RAW JSON */}
          {activeMethod === 'raw' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Inspect or copy the exact <code>NFTokenMint</code> transaction payloads for each token:
              </div>
              {TEST_TAXON_4_TOKENS.map((token, i) => {
                const tx = getTxForToken(token);
                return (
                  <div
                    key={token.id}
                    style={{
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 14px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                        #{i + 1} - {token.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyJson(i)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: copiedIndex === i ? '#4ade80' : 'var(--text-muted)',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {copiedIndex === i ? <Check size={13} /> : <Copy size={13} />}
                        <span>{copiedIndex === i ? 'Copied' : 'Copy JSON'}</span>
                      </button>
                    </div>
                    <pre
                      style={{
                        margin: 0,
                        fontSize: '0.72rem',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-secondary)',
                        overflowX: 'auto',
                      }}
                    >
                      {JSON.stringify(tx, null, 2)}
                    </pre>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span>Minted:</span>
            <span style={{ color: '#fff', fontWeight: 700 }}>
              {Object.values(statuses).filter((s) => s.status === 'minted').length} / 3
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-sm)',
                background: 'transparent',
                color: 'var(--text-muted)',
                fontSize: '0.82rem',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Close
            </button>

            <button
              type="button"
              onClick={() => {
                onMintSuccess(4);
                onClose();
              }}
              style={{
                padding: '8px 18px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(0, 230, 203, 0.15)',
                border: '1px solid rgba(0, 230, 203, 0.4)',
                color: 'var(--accent-cyan)',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>View Taxon 4 in Studio</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

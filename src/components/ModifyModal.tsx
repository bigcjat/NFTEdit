import React, { useState } from 'react';
import type { NFToken, NFTMetadata, PinataSettings, XamanSettings, XRPLNetwork } from '../types';
import { utf8ToHex, buildNFTokenModifyTx } from '../utils/xrpl';
import { uploadMetadataSmart, downloadJsonFile } from '../utils/ipfs';
import { generateClientQRCode, createXamanPayload, subscribeToXamanPayload } from '../utils/xaman';
import { 
  X, 
  Upload, 
  Check, 
  Copy, 
  Smartphone, 
  Key, 
  Sparkles, 
  AlertCircle, 
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { Client, Wallet } from 'xrpl';

interface ModifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  nft: NFToken;
  updatedMetadata: NFTMetadata;
  userAccount: string;
  pinataSettings: PinataSettings;
  xamanSettings: XamanSettings;
  network: XRPLNetwork;
  onSuccess: (newUri: string, txHash: string) => void;
}

export const ModifyModal: React.FC<ModifyModalProps> = ({
  isOpen,
  onClose,
  nft,
  updatedMetadata,
  userAccount,
  pinataSettings,
  xamanSettings,
  network,
  onSuccess,
}) => {
  if (!isOpen) return null;

  const [step, setStep] = useState<'ipfs' | 'review' | 'sign' | 'complete'>('ipfs');
  
  // IPFS State
  const [isUploading, setIsUploading] = useState(false);
  const [ipfsUri, setIpfsUri] = useState('');
  const [manualCid, setManualCid] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Transaction State
  const [hexUri, setHexUri] = useState('');
  const [hexByteLength, setHexByteLength] = useState(0);
  const [exceedsLimit, setExceedsLimit] = useState(false);
  const [txJson, setTxJson] = useState<Record<string, any>>({});

  // Signing State
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [deepLink, setDeepLink] = useState<string>('');
  const [signMethod, setSignMethod] = useState<'xaman' | 'secret'>('xaman');
  const [secretKey, setSecretKey] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [broadcastError, setBroadcastError] = useState<string | null>(null);
  const [copiedTx, setCopiedTx] = useState(false);



  // Step 1: Upload to IPFS via Relay or Pinata
  const handleSaveMetadata = async () => {
    setIsUploading(true);
    setUploadError(null);

    try {
      const res = await uploadMetadataSmart(updatedMetadata, pinataSettings.jwt, pinataSettings.relayUrl);
      setIpfsUri(res.uri);
      processNewUri(res.uri);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload JSON to IPFS');
    } finally {
      setIsUploading(false);
    }
  };

  const handleManualCidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCid.trim()) return;
    let uri = manualCid.trim();
    if (!uri.startsWith('ipfs://') && !uri.startsWith('http://') && !uri.startsWith('https://')) {
      uri = `ipfs://${uri}`;
    }
    setIpfsUri(uri);
    processNewUri(uri);
  };

  // Step 2: Convert URI to Hex & build Tx
  const processNewUri = (uri: string) => {
    const { hex, byteLength, exceedsLimit: overLimit } = utf8ToHex(uri);
    setHexUri(hex);
    setHexByteLength(byteLength);
    setExceedsLimit(overLimit);

    const tx = buildNFTokenModifyTx(userAccount || nft.issuer, nft.nft_id, hex, nft.owner);
    setTxJson(tx);
    setStep('review');
  };

  // Step 3: Prepare Signing
  const handleProceedToSign = async () => {
    setStep('sign');

    // Try Xaman API if credentials are set
    if (xamanSettings.apiKey && xamanSettings.apiSecret) {
      try {
        const payload = await createXamanPayload(txJson, xamanSettings.apiKey, xamanSettings.apiSecret);
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
                  setTxHash(res.txid);
                  setStep('complete');
                  onSuccess(ipfsUri, res.txid);
                }
              },
              (err) => console.error('Xaman WS error:', err)
            );
          }
          return;
        }
      } catch (err) {
        console.warn('Xaman API failed, using client-side QR:', err);
      }
    }

    // Fallback: Generate client-side QR of transaction payload & deep link
    try {
      const qrUrl = await generateClientQRCode(JSON.stringify(txJson));
      setQrDataUrl(qrUrl);
      setDeepLink(`https://xumm.app/sign?payload=${encodeURIComponent(JSON.stringify(txJson))}`);
    } catch (e) {
      console.error(e);
    }
  };

  // Alternative: Direct Seed Signing with xrpl.js
  const handleSignWithSecret = async () => {
    if (!secretKey.trim()) {
      setBroadcastError('Please enter the family seed / secret for the account.');
      return;
    }

    setIsBroadcasting(true);
    setBroadcastError(null);

    const rpcServer = network === 'mainnet' ? 'https://s2.ripple.com:51234' : 'https://s.altnet.rippletest.net:51234';

    try {
      const client = new Client(rpcServer);
      await client.connect();

      const wallet = Wallet.fromSeed(secretKey.trim());
      if (wallet.classicAddress !== (userAccount || nft.issuer)) {
        throw new Error(
          `Secret key corresponds to ${wallet.classicAddress}, but token issuer is ${userAccount || nft.issuer}`
        );
      }

      const prepared = await client.autofill(txJson as any);
      const signed = wallet.sign(prepared);
      const response = await client.submitAndWait(signed.tx_blob);

      await client.disconnect();

      const meta = response.result.meta;
      const txResult = typeof meta === 'object' && meta ? (meta as any).TransactionResult : '';

      if (txResult === 'tesSUCCESS') {
        const hash = response.result.hash;
        setTxHash(hash);
        setStep('complete');
        onSuccess(ipfsUri, hash);
      } else {
        throw new Error(`Transaction failed on ledger with result: ${txResult}`);
      }
    } catch (err: any) {
      setBroadcastError(err.message || 'Failed to submit transaction to XRPL');
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleCopyTxJson = () => {
    navigator.clipboard.writeText(JSON.stringify(txJson, null, 2));
    setCopiedTx(true);
    setTimeout(() => setCopiedTx(false), 1500);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(6, 9, 19, 0.88)',
        backdropFilter: 'blur(12px)',
        zIndex: 2000,
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
          maxWidth: '620px',
          background: 'rgba(15, 23, 42, 0.98)',
          border: '1px solid var(--border-card)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.9)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #00e6cb 0%, #38bdf8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#060913',
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>Execute NFTokenModify</h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                {step === 'ipfs' && 'Step 1 of 3: Upload New Metadata to IPFS'}
                {step === 'review' && 'Step 2 of 3: Review Hex URI & Transaction'}
                {step === 'sign' && 'Step 3 of 3: Sign with Xaman'}
                {step === 'complete' && 'Transaction Complete!'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '6px', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '22px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* STEP 1: IPFS Upload */}
          {step === 'ipfs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                To modify this NFT's URI on the XRPL, the updated metadata JSON must be pinned to IPFS to obtain a Content Identifier (CID).
              </div>

              {/* Primary 1-Click Upload Button */}
              <div
                style={{
                  background: 'rgba(0, 230, 203, 0.04)',
                  border: '1px solid rgba(0, 230, 203, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}>
                    <Sparkles size={18} /> Automatic Decentralized Upload
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', background: 'rgba(0, 230, 203, 0.12)', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
                    {pinataSettings.relayUrl ? 'Cloudflare Relay' : pinataSettings.jwt ? 'Pinata Cloud' : '1-Click Pin'}
                  </span>
                </div>

                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Pins your clean updated metadata JSON to IPFS and prepares the XRPL modification transaction for Xaman signing.
                </p>

                <button
                  type="button"
                  onClick={handleSaveMetadata}
                  disabled={isUploading}
                  style={{
                    padding: '12px 20px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--accent-cyan)',
                    color: '#060913',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: isUploading ? 'default' : 'pointer',
                    boxShadow: '0 4px 16px rgba(0, 230, 203, 0.25)',
                    border: 'none',
                  }}
                >
                  {isUploading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Pinning to IPFS & Preparing Transaction...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      <span>Save & Proceed to Sign</span>
                    </>
                  )}
                </button>

                {uploadError && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                    <AlertCircle size={15} /> {uploadError}
                  </div>
                )}
              </div>

              {/* Or Manual / External Pinning */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                  Alternative: Download & Provide Custom CID
                </span>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => downloadJsonFile(updatedMetadata, `${updatedMetadata.name || 'nft'}-metadata`)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255, 255, 255, 0.06)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.78rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    Download JSON File
                  </button>
                </div>

                <form onSubmit={handleManualCidSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Enter IPFS CID or URI (e.g. <code>ipfs://bafy...</code> or <code>bafy...</code>):
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="ipfs://bafybeih..."
                      value={manualCid}
                      onChange={(e) => setManualCid(e.target.value)}
                      style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}
                    />
                    <button
                      type="submit"
                      style={{
                        padding: '8px 16px',
                        background: 'var(--accent-blue)',
                        color: '#060913',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        borderRadius: 'var(--radius-md)',
                        flexShrink: 0,
                      }}
                    >
                      Use CID
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* STEP 2: Review Hex URI & Transaction */}
          {step === 'review' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* URI Comparison */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  URI Transformation
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Old URI on Ledger:</span>
                  <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', wordBreak: 'break-all' }}>
                    {nft.decodedUri || 'None'}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', display: 'block' }}>New IPFS URI:</span>
                  <span style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', wordBreak: 'break-all', fontWeight: 600 }}>
                    {ipfsUri}
                  </span>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Hex-Encoded Representation for XRPL:
                    </span>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontFamily: 'var(--font-mono)',
                        color: exceedsLimit ? 'var(--accent-rose)' : 'var(--accent-emerald)',
                        fontWeight: 600,
                      }}
                    >
                      {hexByteLength} / 256 bytes {exceedsLimit ? '(Exceeds Limit!)' : '(Valid)'}
                    </span>
                  </div>
                  <div
                    style={{
                      background: '#090e1c',
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.72rem',
                      color: 'var(--text-secondary)',
                      wordBreak: 'break-all',
                      marginTop: '4px',
                    }}
                  >
                    {hexUri}
                  </div>
                </div>
              </div>

              {/* Transaction JSON Preview */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    XRPL NFTokenModify Payload
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyTxJson}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.72rem',
                      color: 'var(--accent-blue)',
                    }}
                  >
                    {copiedTx ? <Check size={12} /> : <Copy size={12} />}
                    {copiedTx ? 'Copied' : 'Copy JSON'}
                  </button>
                </div>
                <pre
                  style={{
                    background: '#090e1c',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    color: '#38bdf8',
                    overflowX: 'auto',
                  }}
                >
                  {JSON.stringify(txJson, null, 2)}
                </pre>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setStep('ipfs')}
                  style={{ padding: '8px 14px', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)' }}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleProceedToSign}
                  disabled={exceedsLimit}
                  style={{
                    padding: '9px 20px',
                    borderRadius: 'var(--radius-md)',
                    background: 'linear-gradient(135deg, #00e6cb 0%, #38bdf8 100%)',
                    color: '#060913',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  Proceed to Sign <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Signing */}
          {step === 'sign' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center' }}>
              
              {/* Method Switcher */}
              <div
                style={{
                  display: 'flex',
                  background: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: 'var(--radius-full)',
                  padding: '3px',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setSignMethod('xaman')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    background: signMethod === 'xaman' ? 'var(--accent-cyan-dim)' : 'transparent',
                    color: signMethod === 'xaman' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  }}
                >
                  Xaman QR / App
                </button>
                <button
                  type="button"
                  onClick={() => setSignMethod('secret')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    background: signMethod === 'secret' ? 'var(--accent-purple-dim)' : 'transparent',
                    color: signMethod === 'secret' ? 'var(--accent-purple)' : 'var(--text-muted)',
                  }}
                >
                  Instant Seed Sign (Local/Test)
                </button>
              </div>

              {signMethod === 'xaman' ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', width: '100%' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Scan with your <strong>Xaman (XUMM)</strong> app to sign the <code style={{ color: 'var(--accent-cyan)' }}>NFTokenModify</code> transaction:
                  </div>

                  {qrDataUrl ? (
                    <div
                      style={{
                        padding: '12px',
                        background: '#ffffff',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
                        display: 'inline-block',
                      }}
                    >
                      <img src={qrDataUrl} alt="Xaman QR" style={{ width: '220px', height: '220px', display: 'block' }} />
                    </div>
                  ) : (
                    <div style={{ padding: '40px', color: 'var(--text-muted)' }}>
                      <RefreshCw size={24} className="animate-spin" />
                    </div>
                  )}

                  {/* Mobile Deep Link */}
                  {deepLink && (
                    <a
                      href={deepLink}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '10px 20px',
                        borderRadius: 'var(--radius-md)',
                        background: 'linear-gradient(135deg, #00e6cb 0%, #38bdf8 100%)',
                        color: '#060913',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        textDecoration: 'none',
                        width: '100%',
                        maxWidth: '280px',
                        justifyContent: 'center',
                      }}
                    >
                      <Smartphone size={16} />
                      Open in Xaman Mobile App
                    </a>
                  )}

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Waiting for signature from issuer account <code style={{ color: 'var(--text-primary)' }}>{userAccount || nft.issuer}</code>...
                  </div>
                </div>
              ) : (
                /* Instant Seed Sign */
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Sign and broadcast directly in-browser via <code style={{ color: 'var(--accent-purple)' }}>xrpl.js</code> (Client-side, your secret never leaves your device):
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Issuer Wallet Secret / Family Seed:
                    </span>
                    <input
                      type="password"
                      placeholder="s..."
                      value={secretKey}
                      onChange={(e) => setSecretKey(e.target.value)}
                      style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                    />
                  </div>

                  {broadcastError && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertCircle size={14} /> {broadcastError}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSignWithSecret}
                    disabled={isBroadcasting}
                    style={{
                      padding: '10px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--accent-purple)',
                      color: '#ffffff',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <Key size={16} />
                    {isBroadcasting ? 'Broadcasting to XRPL...' : 'Sign & Submit to XRPL'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Complete */}
          {step === 'complete' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center', padding: '10px 0' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'var(--accent-emerald-dim)',
                  border: '2px solid var(--accent-emerald)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-emerald)',
                }}
              >
                <Check size={32} />
              </div>

              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  NFToken URI Successfully Modified!
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  The XRPL ledger has validated the update to your dynamic NFT.
                </p>
              </div>

              {/* Tx Hash Box */}
              {txHash && (
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px',
                    width: '100%',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>
                    Transaction Hash:
                  </span>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.78rem',
                      color: 'var(--accent-cyan)',
                      wordBreak: 'break-all',
                      marginTop: '2px',
                    }}
                  >
                    {txHash}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(txHash)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.75rem',
                        color: 'var(--accent-cyan)',
                        padding: '4px 8px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(0, 230, 203, 0.1)',
                      }}
                    >
                      <Copy size={12} /> Copy Transaction Hash
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '10px 24px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--accent-cyan)',
                  color: '#060913',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                }}
              >
                Done
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

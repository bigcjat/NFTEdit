import { useState, useEffect, useMemo, useCallback } from 'react';
import './App.css';
import type { NFToken, NFTMetadata, PinataSettings, XRPLNetwork } from './types';
import { fetchAccountNFTs } from './utils/xrpl';
import { fetchIPFSMetadata } from './utils/ipfs';
import { Navbar } from './components/Navbar';
import { TaxonSelector } from './components/TaxonSelector';
import { NFTCard } from './components/NFTCard';
import { MetadataEditorModal } from './components/MetadataEditorModal';
import { ModifyModal } from './components/ModifyModal';
import { SettingsModal } from './components/SettingsModal';
import { createXamanSignInPayload, subscribeToXamanPayload } from './utils/xaman';
import { RefreshCw, Smartphone } from 'lucide-react';

export function App() {
  // Purge any stale demo account from previous sessions
  useEffect(() => {
    localStorage.removeItem('xrpl_user_account');
    localStorage.removeItem('xrpl_xaman_settings');
  }, []);

  // Account state: only set by active Xaman sign-in
  const [account, setAccount] = useState<string>(() => {
    return sessionStorage.getItem('xrpl_active_account') || '';
  });
  
  const [network, setNetwork] = useState<XRPLNetwork>('mainnet');

  // Optional Pinata settings for IPFS
  const [pinataSettings, setPinataSettings] = useState<PinataSettings>(() => {
    const saved = localStorage.getItem('xrpl_pinata_settings');
    return saved ? JSON.parse(saved) : { jwt: '', gateway: 'https://gateway.pinata.cloud/ipfs/' };
  });

  // Login QR State (directly on landing page)
  const [loginQrUrl, setLoginQrUrl] = useState<string>('');
  const [loginDeepLink, setLoginDeepLink] = useState<string>('');
  const [isLoginLoading, setIsLoginLoading] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // NFT State
  const [nfts, setNfts] = useState<NFToken[]>([]);
  const [isLoadingNFTs, setIsLoadingNFTs] = useState<boolean>(false);
  const [nftLoadError, setNftLoadError] = useState<string | null>(null);

  // Filters
  const [selectedTaxon, setSelectedTaxon] = useState<number | 'all'>('all');
  const [mutableOnly, setMutableOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Active Modals
  const [selectedNFT, setSelectedNFT] = useState<NFToken | null>(null);
  const [modifyTarget, setModifyTarget] = useState<{ nft: NFToken; updatedMetadata: NFTMetadata } | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Initialize Xaman Sign-In on landing page if not logged in
  useEffect(() => {
    if (account) return;

    let unsubscribe: (() => void) | null = null;
    setIsLoginLoading(true);
    setLoginError(null);

    async function initXaman() {
      try {
        const payload = await createXamanSignInPayload();
        if (payload?.refs?.qr_png) {
          setLoginQrUrl(payload.refs.qr_png);
          if (payload.next?.always) {
            setLoginDeepLink(payload.next.always);
          }
          if (payload.refs.websocket_status) {
            unsubscribe = subscribeToXamanPayload(
              payload.refs.websocket_status,
              (data) => {
                if (data.signed && data.account) {
                  setAccount(data.account);
                  sessionStorage.setItem('xrpl_active_account', data.account);
                }
              },
              (err) => console.error('Xaman WebSocket error:', err)
            );
          }
        } else {
          setLoginError('Could not generate Xaman sign-in payload. Please check network connection.');
        }
      } catch (err: any) {
        setLoginError(err.message || 'Error connecting to Xaman');
      } finally {
        setIsLoginLoading(false);
      }
    }

    initXaman();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [account]);

  // Load NFTs once account is authenticated
  const loadNFTs = useCallback(async () => {
    if (!account) {
      setNfts([]);
      return;
    }
    setIsLoadingNFTs(true);
    setNftLoadError(null);

    try {
      const fetched = await fetchAccountNFTs(account, network);
      setNfts(fetched);

      // Concurrently fetch metadata for each NFT
      fetched.forEach(async (nft) => {
        if (nft.decodedUri) {
          try {
            const meta = await fetchIPFSMetadata(nft.decodedUri, pinataSettings.gateway);
            setNfts((prev) =>
              prev.map((item) =>
                item.nft_id === nft.nft_id ? { ...item, metadata: meta, metadataLoading: false } : item
              )
            );
          } catch {
            setNfts((prev) =>
              prev.map((item) =>
                item.nft_id === nft.nft_id
                  ? { ...item, metadataError: 'Could not load metadata', metadataLoading: false }
                  : item
              )
            );
          }
        }
      });
    } catch (err: any) {
      console.error('Failed to load NFTs:', err);
      setNftLoadError(err.message || 'Could not fetch your minted NFTs.');
    } finally {
      setIsLoadingNFTs(false);
    }
  }, [account, network, pinataSettings.gateway]);

  useEffect(() => {
    loadNFTs();
  }, [loadNFTs]);

  // Sign out
  const handleSignOut = () => {
    setAccount('');
    sessionStorage.removeItem('xrpl_active_account');
    setNfts([]);
  };

  // On successful metadata update
  const handleModifySuccess = (newUri: string, _txHash: string) => {
    if (modifyTarget) {
      setNfts((prev) =>
        prev.map((item) =>
          item.nft_id === modifyTarget.nft.nft_id
            ? { ...item, decodedUri: newUri, metadata: modifyTarget.updatedMetadata }
            : item
        )
      );
      if (selectedNFT?.nft_id === modifyTarget.nft.nft_id) {
        setSelectedNFT((prev) =>
          prev ? { ...prev, decodedUri: newUri, metadata: modifyTarget.updatedMetadata } : null
        );
      }
    }
  };

  // Filter NFTs by taxon and search
  const filteredNFTs = useMemo(() => {
    return nfts.filter((nft) => {
      if (selectedTaxon !== 'all' && nft.nft_taxon !== selectedTaxon) {
        return false;
      }
      if (mutableOnly && !nft.isMutable) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const nameMatch = nft.metadata?.name?.toLowerCase().includes(query);
        const taxonMatch = nft.nft_taxon.toString().includes(query);
        const serialMatch = nft.nft_serial.toString().includes(query);
        const idMatch = nft.nft_id.toLowerCase().includes(query);
        if (!nameMatch && !taxonMatch && !serialMatch && !idMatch) {
          return false;
        }
      }
      return true;
    });
  }, [nfts, selectedTaxon, mutableOnly, searchQuery]);

  return (
    <div className="app-container">
      {/* Navigation */}
      <Navbar
        account={account}
        onSignOut={handleSignOut}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onRefreshNFTs={loadNFTs}
        isLoading={isLoadingNFTs}
        onOpenXamanLogin={() => {}}
      />

      <main className="main-content">
        {!account ? (
          /* Direct Xaman Login Card */
          <div
            style={{
              maxWidth: '420px',
              margin: '50px auto',
              padding: '32px 24px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-lg)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '18px',
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#ffffff' }}>
                Sign In with Xaman
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Scan the QR code with your phone to load your minted NFTs
              </p>
            </div>

            {/* QR Code display */}
            <div
              style={{
                padding: '12px',
                background: '#ffffff',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                display: 'inline-block',
              }}
            >
              {isLoginLoading ? (
                <div style={{ width: '210px', height: '210px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <RefreshCw size={28} color="#0f172a" className="animate-spin" />
                </div>
              ) : loginQrUrl ? (
                <img src={loginQrUrl} alt="Xaman Sign In QR" style={{ width: '210px', height: '210px', display: 'block' }} />
              ) : (
                <div style={{ width: '210px', height: '210px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: '0.8rem', padding: '12px' }}>
                  {loginError || 'Could not load QR code'}
                </div>
              )}
            </div>

            {/* Mobile Button */}
            {loginDeepLink && (
              <a
                href={loginDeepLink}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '12px 18px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--accent-cyan)',
                  color: '#060913',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  textDecoration: 'none',
                }}
              >
                <Smartphone size={18} />
                <span>Open in Xaman Mobile App</span>
              </a>
            )}
          </div>
        ) : (
          /* Authenticated Artist Dashboard */
          <>
            {/* Taxon / Collection Selector */}
            <TaxonSelector
              nfts={nfts}
              selectedTaxon={selectedTaxon}
              onSelectTaxon={setSelectedTaxon}
              mutableOnly={mutableOnly}
              onToggleMutableOnly={setMutableOnly}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />

            {/* Error banner */}
            {nftLoadError && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(244, 63, 94, 0.12)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  color: '#fca5a5',
                  fontSize: '0.82rem',
                  marginBottom: '18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>{nftLoadError}</span>
                <button
                  type="button"
                  onClick={loadNFTs}
                  style={{ color: '#fff', fontWeight: 600, background: 'rgba(244, 63, 94, 0.25)', padding: '4px 8px', borderRadius: '4px' }}
                >
                  Retry
                </button>
              </div>
            )}

            {/* Loading */}
            {isLoadingNFTs && nfts.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', gap: '12px', color: 'var(--text-secondary)' }}>
                <RefreshCw size={28} color="var(--accent-cyan)" className="animate-spin" />
                <span style={{ fontSize: '0.88rem' }}>Loading your minted NFTs...</span>
              </div>
            ) : filteredNFTs.length === 0 ? (
              <div style={{ background: 'var(--bg-card)', border: '1px dashed var(--border-card)', borderRadius: 'var(--radius-lg)', padding: '50px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <p style={{ fontSize: '0.9rem' }}>No NFTs found for this collection.</p>
              </div>
            ) : (
              /* NFT Cards */
              <div className="nft-grid">
                {filteredNFTs.map((nft) => (
                  <NFTCard
                    key={nft.nft_id}
                    nft={nft}
                    onSelect={(selected) => setSelectedNFT(selected)}
                    customGateway={pinataSettings.gateway}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Editor Modal */}
      {selectedNFT && (
        <MetadataEditorModal
          nft={selectedNFT}
          isOpen={!!selectedNFT}
          onClose={() => setSelectedNFT(null)}
          onProceedToSign={(updatedMeta) => {
            setModifyTarget({ nft: selectedNFT, updatedMetadata: updatedMeta });
            setSelectedNFT(null);
          }}
          customGateway={pinataSettings.gateway}
        />
      )}

      {/* Modify / Sign Modal */}
      {modifyTarget && (
        <ModifyModal
          isOpen={!!modifyTarget}
          onClose={() => setModifyTarget(null)}
          nft={modifyTarget.nft}
          updatedMetadata={modifyTarget.updatedMetadata}
          userAccount={account}
          pinataSettings={pinataSettings}
          xamanSettings={{
            apiKey: '16c555db-35ce-4b84-a656-53b2ec76b5bc',
            apiSecret: '78e21880-3040-4972-9bb7-3a9e06a0ac35',
            userAddress: account,
            isConnected: true,
          }}
          network={network}
          onSuccess={handleModifySuccess}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        xamanSettings={{
          apiKey: '16c555db-35ce-4b84-a656-53b2ec76b5bc',
          apiSecret: '78e21880-3040-4972-9bb7-3a9e06a0ac35',
          userAddress: account,
          isConnected: !!account,
        }}
        onSaveXaman={() => {}}
        pinataSettings={pinataSettings}
        onSavePinata={(settings) => {
          setPinataSettings(settings);
          localStorage.setItem('xrpl_pinata_settings', JSON.stringify(settings));
        }}
        network={network}
        onChangeNetwork={setNetwork}
      />
    </div>
  );
}

export default App;

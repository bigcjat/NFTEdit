import { useState, useEffect, useMemo, useCallback } from 'react';
import './App.css';
import type { NFToken, NFTMetadata, PinataSettings, XRPLNetwork } from './types';
import { fetchAccountNFTs } from './utils/xrpl';
import { Navbar } from './components/Navbar';
import { TaxonSelector } from './components/TaxonSelector';
import { NFTCard } from './components/NFTCard';
import { MetadataEditorModal } from './components/MetadataEditorModal';
import { ModifyModal } from './components/ModifyModal';
import { SettingsModal } from './components/SettingsModal';
import { MintCollectionModal } from './components/MintCollectionModal';
import { createXamanSignInPayload, subscribeToXamanPayload, getXamanPayload } from './utils/xaman';
import { RefreshCw, Smartphone, ArrowRight, Sparkles } from 'lucide-react';


export function App() {
  // Purge any stale demo account from previous sessions
  useEffect(() => {
    localStorage.removeItem('xrpl_user_account');
    localStorage.removeItem('xrpl_xaman_settings');
  }, []);

  // Account state: set by active Xaman sign-in or manual address entry
  const [account, setAccount] = useState<string>(() => {
    return sessionStorage.getItem('xrpl_active_account') || '';
  });
  
  const [isMintModalOpen, setIsMintModalOpen] = useState<boolean>(false);

  
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
  const [manualAccountInput, setManualAccountInput] = useState<string>('');

  // NFT State
  const [nfts, setNfts] = useState<NFToken[]>([]);
  const [isLoadingNFTs, setIsLoadingNFTs] = useState<boolean>(false);
  const [nftLoadError, setNftLoadError] = useState<string | null>(null);

  // Filters
  const [selectedTaxon, setSelectedTaxon] = useState<number | 'all'>('all');
  const [mutableOnly, setMutableOnly] = useState<boolean>(true);
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
          if (payload.refs.websocket_status && payload.uuid) {
            const currentUuid = payload.uuid;
            unsubscribe = subscribeToXamanPayload(
              payload.refs.websocket_status,
              async (data) => {
                if (data.signed || data.opened) {
                  if (data.signed) {
                    const resolved = await getXamanPayload(currentUuid);
                    if (resolved?.response?.account) {
                      setAccount(resolved.response.account);
                      sessionStorage.setItem('xrpl_active_account', resolved.response.account);
                    }
                  }
                }
              },
              (err) => console.error('Xaman WebSocket error:', err)
            );
          }
        } else {
          setLoginError('Could not generate Xaman sign-in payload. You can also enter your XRPL address below.');
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
    } catch (err: any) {
      console.error('Failed to load NFTs:', err);
      setNftLoadError(err.message || 'Could not fetch your minted NFTs.');
    } finally {
      setIsLoadingNFTs(false);
    }
  }, [account, network]);



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

  // Cache loaded metadata into parent nfts state
  const handleMetadataLoaded = useCallback((nftId: string, meta: NFTMetadata) => {
    setNfts((prev) =>
      prev.map((item) => (item.nft_id === nftId ? { ...item, metadata: meta } : item))
    );
  }, []);

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

  // Progressive batch rendering to keep DOM fast with 2,700+ NFTs
  const [displayLimit, setDisplayLimit] = useState(48);

  useEffect(() => {
    setDisplayLimit(48);
  }, [selectedTaxon, mutableOnly, searchQuery]);

  const visibleNFTs = useMemo(() => {
    return filteredNFTs.slice(0, displayLimit);
  }, [filteredNFTs, displayLimit]);

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
        onOpenMintModal={() => setIsMintModalOpen(true)}
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

            {/* Divider */}
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', margin: '4px 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>OR</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
            </div>

            {/* Direct XRPL Address Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const trimmed = manualAccountInput.trim();
                if (trimmed.startsWith('r') && trimmed.length >= 25) {
                  setAccount(trimmed);
                  sessionStorage.setItem('xrpl_active_account', trimmed);
                }
              }}
              style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}
            >
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="Enter XRPL Issuer Address (r...)"
                  value={manualAccountInput}
                  onChange={(e) => setManualAccountInput(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'rgba(15, 23, 42, 0.6)',
                    color: '#fff',
                    fontSize: '0.82rem',
                    fontFamily: 'var(--font-mono)',
                  }}
                />
                <button
                  type="submit"
                  disabled={!manualAccountInput.trim().startsWith('r')}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: manualAccountInput.trim().startsWith('r') ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.1)',
                    color: manualAccountInput.trim().startsWith('r') ? '#060913' : 'var(--text-muted)',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: manualAccountInput.trim().startsWith('r') ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    border: 'none',
                  }}
                >
                  <span>Load</span>
                  <ArrowRight size={14} />
                </button>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Directly inspect your minted NFTs or connect with Xaman above to sign modifications.
              </span>

              {/* Quick Test Mint Button on Landing Page */}
              <div style={{ width: '100%', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setIsMintModalOpen(true)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(0, 230, 203, 0.08)',
                    border: '1px dashed rgba(0, 230, 203, 0.35)',
                    color: 'var(--accent-cyan)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <Sparkles size={14} />
                  <span>Mint Test Collection (Taxon 4)</span>
                </button>
              </div>
            </form>
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
              onOpenMintModal={() => setIsMintModalOpen(true)}
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
              <>
                <div className="nft-grid">
                  {visibleNFTs.map((nft) => (
                    <NFTCard
                      key={nft.nft_id}
                      nft={nft}
                      onSelect={(selected) => setSelectedNFT(selected)}
                      customGateway={pinataSettings.gateway}
                      onMetadataLoaded={handleMetadataLoaded}
                    />
                  ))}
                </div>

                {displayLimit < filteredNFTs.length && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '36px', marginBottom: '20px' }}>
                    <button
                      type="button"
                      onClick={() => setDisplayLimit((prev) => prev + 48)}
                      style={{
                        padding: '11px 26px',
                        background: 'rgba(0, 230, 203, 0.08)',
                        border: '1px solid rgba(0, 230, 203, 0.35)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--accent-cyan)',
                        fontWeight: 600,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 230, 203, 0.18)';
                        e.currentTarget.style.borderColor = 'var(--accent-cyan)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 230, 203, 0.08)';
                        e.currentTarget.style.borderColor = 'rgba(0, 230, 203, 0.35)';
                      }}
                    >
                      Load More ({visibleNFTs.length} of {filteredNFTs.length} displayed)
                    </button>
                  </div>
                )}
              </>
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
          pinataSettings={pinataSettings}
          onMetadataLoaded={handleMetadataLoaded}
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

      {/* Mint Test Collection Modal (Taxon 4) */}
      <MintCollectionModal
        isOpen={isMintModalOpen}
        onClose={() => setIsMintModalOpen(false)}
        userAccount={account}
        network={network}
        xamanSettings={{
          apiKey: '16c555db-35ce-4b84-a656-53b2ec76b5bc',
          apiSecret: '78e21880-3040-4972-9bb7-3a9e06a0ac35',
          userAddress: account,
          isConnected: !!account,
        }}
        customGateway={pinataSettings.gateway}
        onMintSuccess={async (taxon) => {
          setIsMintModalOpen(false);
          await loadNFTs();
          setSelectedTaxon(taxon);
          setSearchQuery('');
        }}
      />
    </div>
  );
}

export default App;

import { useState, useEffect, useMemo, useCallback } from 'react';
import './App.css';
import type { NFToken, NFTMetadata, PinataSettings, XRPLNetwork } from './types';
import { fetchAccountNFTs } from './utils/xrpl';
import { Navbar } from './components/Navbar';
import { TaxonSelector } from './components/TaxonSelector';
import { DirectNFTLookup } from './components/DirectNFTLookup';
import { NFTCard } from './components/NFTCard';
import { MetadataEditorModal } from './components/MetadataEditorModal';
import { ModifyModal } from './components/ModifyModal';
import { BurnModal } from './components/BurnModal';
import { SettingsModal } from './components/SettingsModal';
import { getXumm } from './utils/xaman';
import { clearMetadataCache } from './utils/ipfs';
import { RefreshCw, Smartphone } from 'lucide-react';

export function App() {
  // Purge any stale demo account from previous sessions
  useEffect(() => {
    localStorage.removeItem('xrpl_user_account');
    localStorage.removeItem('xrpl_xaman_settings');
  }, []);

  // Account state: set by active Xaman sign-in
  const [account, setAccount] = useState<string>(() => {
    return sessionStorage.getItem('xrpl_active_account') || '';
  });

  const [network, setNetwork] = useState<XRPLNetwork>('mainnet');

  // Optional Pinata settings for IPFS
  const [pinataSettings, setPinataSettings] = useState<PinataSettings>(() => {
    const saved = localStorage.getItem('xrpl_pinata_settings');
    return saved ? JSON.parse(saved) : { jwt: '', gateway: 'https://gateway.pinata.cloud/ipfs/' };
  });

  // Login State
  const [isLoginLoading, setIsLoginLoading] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

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
  const [burnTarget, setBurnTarget] = useState<NFToken | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Initialize Xaman PKCE authentication
  useEffect(() => {
    const xumm = getXumm();

    xumm.on?.('success', async () => {
      const state = await xumm.state?.();
      if (state?.me?.account) {
        setAccount(state.me.account);
        sessionStorage.setItem('xrpl_active_account', state.me.account);
      }
    });

    xumm.on?.('error', (err: Error) => {
      console.error('Xaman PKCE error:', err);
      setLoginError(err.message || 'Error connecting to Xaman');
    });

    // Check if an existing authenticated session is already active
    xumm.state?.()?.then((state) => {
      if (state?.me?.account) {
        setAccount(state.me.account);
        sessionStorage.setItem('xrpl_active_account', state.me.account);
      }
    });
  }, []);

  const handleXamanLogin = async () => {
    setIsLoginLoading(true);
    setLoginError(null);
    try {
      const xumm = getXumm();
      const res = await xumm.authorize?.();
      if (res?.me?.account) {
        setAccount(res.me.account);
        sessionStorage.setItem('xrpl_active_account', res.me.account);
      }
    } catch (err: any) {
      console.error('Xaman sign-in failed:', err);
      setLoginError(err.message || 'Sign in cancelled or failed');
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleSignOut = () => {
    try {
      const xumm = getXumm();
      xumm.logout();
    } catch (e) {
      console.error(e);
    }
    setAccount('');
    sessionStorage.removeItem('xrpl_active_account');
    setNfts([]);
  };

  // Load NFTs once account is authenticated
  const loadNFTs = useCallback(async () => {
    if (!account) {
      setNfts([]);
      return;
    }
    setIsLoadingNFTs(true);
    setNftLoadError(null);

    try {
      const tokens = await fetchAccountNFTs(account, network);
      setNfts(tokens);
    } catch (err: any) {
      console.error('Error fetching NFTs:', err);
      setNftLoadError(err.message || 'Failed to query XRPL account NFTs.');
    } finally {
      setIsLoadingNFTs(false);
    }
  }, [account, network]);

  useEffect(() => {
    loadNFTs();
  }, [loadNFTs]);

  // Filtered NFTs based on Taxon, Search, and Mutability
  const filteredNFTs = useMemo(() => {
    return nfts.filter((nft) => {
      // Mutability filter
      if (mutableOnly && !nft.isMutable) {
        return false;
      }

      // Taxon filter
      if (selectedTaxon !== 'all' && nft.nft_taxon !== selectedTaxon) {
        return false;
      }

      // Search filter (TokenID or Taxon)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = nft.nft_id.toLowerCase().includes(q);
        const matchesTaxon = nft.nft_taxon.toString().includes(q);
        if (!matchesId && !matchesTaxon) {
          return false;
        }
      }

      return true;
    });
  }, [nfts, mutableOnly, selectedTaxon, searchQuery]);

  // Mutable count for metrics
  const totalMutableCount = useMemo(() => {
    return nfts.filter((n) => n.isMutable).length;
  }, [nfts]);

  return (
    <div className="app-container">
      {/* Persistent Navbar */}
      <Navbar
        account={account}
        onSignOut={handleSignOut}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onRefreshNFTs={loadNFTs}
        isLoading={isLoadingNFTs}
        onOpenXamanLogin={handleXamanLogin}
      />

      <main className="main-content">
        {!account ? (
          /* Direct Xaman Login Card */
          <div
            style={{
              maxWidth: '440px',
              margin: '60px auto',
              padding: '36px 28px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-lg)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '20px',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.4)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: 'var(--radius-full)',
                  background: 'rgba(0, 230, 203, 0.1)',
                  border: '1px solid rgba(0, 230, 203, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-cyan)',
                }}
              >
                <Smartphone size={28} />
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                XRPL Dynamic NFT Editor
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                Connect your Xaman wallet to inspect, update, and manage your mutable XLS-20 NFT collections.
              </p>
            </div>

            {loginError && (
              <div
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#ef4444',
                  fontSize: '0.82rem',
                  lineHeight: 1.4,
                }}
              >
                {loginError}
              </div>
            )}

            <button
              type="button"
              onClick={handleXamanLogin}
              disabled={isLoginLoading}
              style={{
                width: '100%',
                padding: '14px 20px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent-cyan)',
                color: '#060913',
                fontWeight: 700,
                fontSize: '0.95rem',
                border: 'none',
                cursor: isLoginLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: '0 4px 16px rgba(0, 230, 203, 0.25)',
                transition: 'all var(--transition-fast)',
              }}
            >
              {isLoginLoading ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Connecting to Xaman...</span>
                </>
              ) : (
                <>
                  <Smartphone size={18} />
                  <span>Connect with Xaman</span>
                </>
              )}
            </button>
          </div>
        ) : (
          /* Authenticated Artist Dashboard */
          <>
            {/* Direct NFTokenID Quick Jump / Edit */}
            <DirectNFTLookup
              userAccount={account}
              nfts={nfts}
              network={network}
              onSelectNFT={(nft) => setSelectedNFT(nft)}
            />

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

            {/* Error banner if NFT loading fails */}
            {nftLoadError && (
              <div
                style={{
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#ef4444',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>{nftLoadError}</span>
                <button
                  type="button"
                  onClick={loadNFTs}
                  style={{
                    background: 'transparent',
                    border: '1px solid #ef4444',
                    color: '#ef4444',
                    borderRadius: 'var(--radius-sm)',
                    padding: '4px 10px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  Retry
                </button>
              </div>
            )}

            {/* NFT Grid or Empty States */}
            {isLoadingNFTs ? (
              <div
                style={{
                  minHeight: '350px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  color: 'var(--text-secondary)',
                }}
              >
                <RefreshCw size={32} className="animate-spin" color="var(--accent-cyan)" />
                <p style={{ fontSize: '0.95rem' }}>Scanning ledger for XLS-20 NFTs...</p>
              </div>
            ) : filteredNFTs.length > 0 ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '20px',
                }}
              >
                {filteredNFTs.map((nft) => (
                  <NFTCard
                    key={nft.nft_id}
                    nft={nft}
                    onSelect={(selected: NFToken) => setSelectedNFT(selected)}
                    onBurn={(target: NFToken) => setBurnTarget(target)}
                    customGateway={pinataSettings.gateway}
                  />
                ))}
              </div>
            ) : (
              <div
                style={{
                  minHeight: '350px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '16px',
                  textAlign: 'center',
                  padding: '40px',
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px dashed var(--border-card)',
                }}
              >
                <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#ffffff' }}>
                  {mutableOnly
                    ? 'No mutable Dynamic NFTs found for this filter.'
                    : 'No NFTs found in this account.'}
                </p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '440px' }}>
                  {mutableOnly
                    ? 'Only NFTs minted with the lsfMutable flag (Bit 1) can update their URI metadata. Try toggling "Mutable Only" above to see all NFTs.'
                    : 'Ensure you are connected to the correct XRPL network or account.'}
                </p>
                {mutableOnly && totalMutableCount === 0 && (
                  <button
                    type="button"
                    onClick={() => setMutableOnly(false)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid var(--border-card)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    Show All Tokens
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Metadata Editor Modal (Step 1 of Dynamic Update) */}
      {selectedNFT && (
        <MetadataEditorModal
          nft={selectedNFT}
          isOpen={!!selectedNFT}
          onClose={() => setSelectedNFT(null)}
          onProceedToSign={(updatedMetadata: NFTMetadata) => {
            setModifyTarget({
              nft: selectedNFT,
              updatedMetadata,
            });
            setSelectedNFT(null);
          }}
          customGateway={pinataSettings.gateway}
          pinataSettings={pinataSettings}
          onOpenBurnModal={() => {
            setBurnTarget(selectedNFT);
            setSelectedNFT(null);
          }}
        />
      )}

      {/* Burn Modal (Irreversible Token Destruction) */}
      {burnTarget && (
        <BurnModal
          nft={burnTarget}
          metadata={burnTarget.metadata}
          isOpen={!!burnTarget}
          onClose={() => setBurnTarget(null)}
          userAccount={account}
          network={network}
          onSuccess={(burnedNftId: string) => {
            clearMetadataCache();
            setNfts((prev) => prev.filter((n) => n.nft_id !== burnedNftId));
            setBurnTarget(null);
            setTimeout(loadNFTs, 4000);
          }}
        />
      )}

      {/* Modify Modal (Step 2: IPFS Pin & XRPL Transaction Broadcast) */}
      {modifyTarget && (
        <ModifyModal
          nft={modifyTarget.nft}
          updatedMetadata={modifyTarget.updatedMetadata}
          isOpen={!!modifyTarget}
          onClose={() => setModifyTarget(null)}
          userAccount={account}
          onSuccess={async (newUri: string) => {
            clearMetadataCache();
            if (modifyTarget) {
              setNfts((prev) =>
                prev.map((n) =>
                  n.nft_id === modifyTarget.nft.nft_id
                    ? {
                        ...n,
                        decodedUri: newUri,
                        metadata: modifyTarget.updatedMetadata,
                      }
                    : n
                )
              );
            }
            setTimeout(loadNFTs, 3500);
          }}
          pinataSettings={pinataSettings}
          xamanSettings={{
            apiKey: '16c555db-35ce-4b84-a656-53b2ec76b5bc',
            apiSecret: '',
            userAddress: account,
            isConnected: !!account,
          }}
          network={network}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        xamanSettings={{
          apiKey: '16c555db-35ce-4b84-a656-53b2ec76b5bc',
          apiSecret: '',
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

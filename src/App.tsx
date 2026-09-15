import { useState, useEffect, useMemo, useCallback } from 'react';
import './App.css';
import type { NFToken, NFTMetadata, PinataSettings, XamanSettings, XRPLNetwork } from './types';
import { fetchAccountNFTs } from './utils/xrpl';
import { fetchIPFSMetadata } from './utils/ipfs';
import { Navbar } from './components/Navbar';
import { TaxonSelector } from './components/TaxonSelector';
import { NFTCard } from './components/NFTCard';
import { MetadataEditorModal } from './components/MetadataEditorModal';
import { ModifyModal } from './components/ModifyModal';
import { SettingsModal } from './components/SettingsModal';
import { XamanLoginModal } from './components/XamanLoginModal';
import { RefreshCw, Smartphone, Palette, ArrowRight } from 'lucide-react';

export function App() {
  // Account & Network (starts empty or loads from localStorage)
  const [account, setAccount] = useState<string>(() => {
    return localStorage.getItem('xrpl_user_account') || '';
  });
  const [network, setNetwork] = useState<XRPLNetwork>(() => {
    return (localStorage.getItem('xrpl_network') as XRPLNetwork) || 'mainnet';
  });

  // Settings
  const [xamanSettings, setXamanSettings] = useState<XamanSettings>(() => {
    const saved = localStorage.getItem('xrpl_xaman_settings');
    if (saved) {
      return JSON.parse(saved);
    }
    return { apiKey: '16c555db-35ce-4b84-a656-53b2ec76b5bc', apiSecret: '78e21880-3040-4972-9bb7-3a9e06a0ac35', userAddress: '', isConnected: false };
  });

  const [pinataSettings, setPinataSettings] = useState<PinataSettings>(() => {
    const saved = localStorage.getItem('xrpl_pinata_settings');
    return saved ? JSON.parse(saved) : { jwt: '', gateway: 'https://gateway.pinata.cloud/ipfs/' };
  });

  // NFT State
  const [nfts, setNfts] = useState<NFToken[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters
  const [selectedTaxon, setSelectedTaxon] = useState<number | 'all'>('all');
  const [mutableOnly, setMutableOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [selectedNFT, setSelectedNFT] = useState<NFToken | null>(null);
  const [modifyTarget, setModifyTarget] = useState<{ nft: NFToken; updatedMetadata: NFTMetadata } | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);

  // Direct address input for landing
  const [landingAddress, setLandingAddress] = useState('');

  // Persist account
  useEffect(() => {
    if (account) {
      localStorage.setItem('xrpl_user_account', account);
    } else {
      localStorage.removeItem('xrpl_user_account');
    }
  }, [account]);

  // Fetch NFTs for account
  const loadNFTs = useCallback(async () => {
    if (!account) {
      setNfts([]);
      return;
    }
    setIsLoading(true);
    setLoadError(null);

    try {
      const fetched = await fetchAccountNFTs(account, network);
      setNfts(fetched);

      // Concurrently fetch metadata for each NFT
      fetched.forEach(async (nft) => {
        if (nft.decodedUri) {
          try {
            const meta = await fetchIPFSMetadata(nft.decodedUri, pinataSettings.gateway);
            setNfts((prev) =>
              prev.map((item) => (item.nft_id === nft.nft_id ? { ...item, metadata: meta, metadataLoading: false } : item))
            );
          } catch {
            setNfts((prev) =>
              prev.map((item) =>
                item.nft_id === nft.nft_id ? { ...item, metadataError: 'Failed to resolve IPFS', metadataLoading: false } : item
              )
            );
          }
        }
      });
    } catch (err: any) {
      console.error('Failed to load NFTs:', err);
      setLoadError(err.message || 'Could not fetch NFTs for this account. Ensure address is valid.');
    } finally {
      setIsLoading(false);
    }
  }, [account, network, pinataSettings.gateway]);

  useEffect(() => {
    loadNFTs();
  }, [loadNFTs]);

  // Handle successful modification
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

  // Filtered NFTs
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
        onSignOut={() => {
          setAccount('');
          setNfts([]);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onRefreshNFTs={loadNFTs}
        isLoading={isLoading}
        onOpenXamanLogin={() => setIsLoginOpen(true)}
      />

      {/* Main Content */}
      <main className="main-content">
        {!account ? (
          /* Clean, Direct Artist Login Screen */
          <div
            style={{
              maxWidth: '480px',
              margin: '60px auto',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '24px',
              padding: '40px 24px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '12px',
                background: 'var(--accent-cyan)',
                color: '#060913',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Palette size={32} />
            </div>

            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#ffffff' }}>
                XRPL NFT Metadata Editor
              </h2>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.5 }}>
                Connect with Xaman to view your collections, audit character and byte counts, and update metadata on your dynamic NFTs.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsLoginOpen(true)}
              style={{
                width: '100%',
                padding: '14px 20px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent-cyan)',
                color: '#060913',
                fontWeight: 700,
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
              }}
            >
              <Smartphone size={20} />
              <span>Sign In with Xaman</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
              <span>OR ENTER CREATOR WALLET</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
            </div>

            {/* Quick manual address form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (landingAddress.trim()) {
                  setAccount(landingAddress.trim());
                }
              }}
              style={{ display: 'flex', gap: '8px', width: '100%' }}
            >
              <input
                type="text"
                placeholder="r... (Enter Classic Address)"
                value={landingAddress}
                onChange={(e) => setLandingAddress(e.target.value)}
                style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}
              />
              <button
                type="submit"
                style={{
                  padding: '10px 18px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  flexShrink: 0,
                }}
              >
                <span>View</span>
                <ArrowRight size={14} />
              </button>
            </form>
          </div>
        ) : (
          /* Logged-in View */
          <>
            {/* Taxon & Filter Controls */}
            <TaxonSelector
              nfts={nfts}
              selectedTaxon={selectedTaxon}
              onSelectTaxon={setSelectedTaxon}
              mutableOnly={mutableOnly}
              onToggleMutableOnly={setMutableOnly}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />

            {/* Error Message */}
            {loadError && (
              <div
                style={{
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(244, 63, 94, 0.1)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  color: '#fca5a5',
                  fontSize: '0.85rem',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>{loadError}</span>
                <button
                  type="button"
                  onClick={loadNFTs}
                  style={{ color: '#fff', fontWeight: 600, background: 'rgba(244, 63, 94, 0.2)', padding: '4px 10px', borderRadius: '4px' }}
                >
                  Retry
                </button>
              </div>
            )}

            {/* Loading Spinner */}
            {isLoading && nfts.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '80px 20px',
                  gap: '14px',
                  color: 'var(--text-secondary)',
                }}
              >
                <RefreshCw size={32} color="var(--accent-cyan)" className="animate-spin" />
                <span style={{ fontSize: '0.9rem' }}>Loading NFTs minted by this account...</span>
              </div>
            ) : filteredNFTs.length === 0 ? (
              /* Empty State */
              <div
                style={{
                  background: 'var(--bg-card)',
                  border: '1px dashed var(--border-card)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '60px 20px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>No NFTs Found in This Selection</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {mutableOnly ? 'No mutable tokens found. Try unchecking Mutable Only.' : 'No tokens found for this taxon.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTaxon('all');
                    setMutableOnly(false);
                    setSearchQuery('');
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--accent-cyan)',
                    color: '#060913',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                  }}
                >
                  Show All Collections
                </button>
              </div>
            ) : (
              /* NFT Grid */
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

      {/* Modals */}
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

      {modifyTarget && (
        <ModifyModal
          isOpen={!!modifyTarget}
          onClose={() => setModifyTarget(null)}
          nft={modifyTarget.nft}
          updatedMetadata={modifyTarget.updatedMetadata}
          userAccount={account}
          pinataSettings={pinataSettings}
          xamanSettings={xamanSettings}
          network={network}
          onSuccess={handleModifySuccess}
        />
      )}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        xamanSettings={xamanSettings}
        onSaveXaman={(settings) => {
          setXamanSettings(settings);
          localStorage.setItem('xrpl_xaman_settings', JSON.stringify(settings));
        }}
        pinataSettings={pinataSettings}
        onSavePinata={(settings) => {
          setPinataSettings(settings);
          localStorage.setItem('xrpl_pinata_settings', JSON.stringify(settings));
        }}
        network={network}
        onChangeNetwork={setNetwork}
      />

      <XamanLoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={(acc) => {
          setAccount(acc);
          setIsLoginOpen(false);
        }}
      />
    </div>
  );
}

export default App;

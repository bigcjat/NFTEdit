# NFTEdit — XRPL Dynamic NFT Studio & Metadata Editor

> **Live Web App:** **[https://bigcjat.github.io/NFTEdit/](https://bigcjat.github.io/NFTEdit/)**  
> **Source Repository:** **[https://github.com/bigcjat/NFTEdit/](https://github.com/bigcjat/NFTEdit/)**

A client-side studio for creators on the **XRP Ledger (XRPL)** to inspect, audit, update dynamic metadata, and execute **`NFTokenModify`** and **`NFTokenBurn`** transactions under the **DynamicNFT** amendment.

**You do not need to clone the repository, install Node.js, or run anything locally.** The entire app runs directly in your web browser at **[https://bigcjat.github.io/NFTEdit/](https://bigcjat.github.io/NFTEdit/)**.

---

## 🔒 Privacy & Security First

* **Zero Access to Keys or Seeds:** We never ask for, collect, transmit, or store your seed phrases, family seeds, mnemonic keys, or secret keys. All transaction signing is performed strictly and non-custodially via the official **Xaman (formerly XUMM)** wallet app using secure QR codes and mobile deep links.
* **Zero Trackers & Zero Telemetry:** There are no tracking scripts, analytics cookies, third-party user trackers (like Google Analytics or Meta Pixel), or surveillance code anywhere in this application.
* **Direct Ledger Connection:** The studio connects directly to Ripple Clio nodes (`wss://s1.ripple.com`, `wss://s2.ripple.com`) and verified decentralized IPFS nodes.
* **100% Client-Side & Open Source:** The entire codebase is open source and hosted statically via GitHub Pages. What you see is what runs in your browser.

---

## Key Features

1. **Dynamic NFT (`tfMutable`) Management**
   * Built for the XRPL **`DynamicNFT`** amendment.
   * Clear badges distinguishing mutable tokens (`tfMutable` / Bit 4) from permanent immutable tokens.
   * Generates and dispatches cryptographically verified **`NFTokenModify`** transactions.

2. **Direct NFTokenID Quick Jump**
   * Paste any 64-character `NFTokenID` to immediately jump into editing without scrolling through large collections.
   * Real-time issuer validation: Cryptographically verifies the embedded 20-byte Account ID against your connected wallet so you can only modify tokens you minted.

3. **Permanent Token Burning**
   * Execute on-ledger **`NFTokenBurn`** transactions directly from the card grid or editor modal.
   * Multi-stage safety prompts requiring deliberate confirmation before permanent deletion.

4. **Per-Field Character & UTF-8 Byte Counter**
   * Live character count and exact UTF-8 byte calculations (`new TextEncoder().encode()`).
   * Unicode & emoji breakdown: explains multi-byte expansion (e.g., why emojis consume 4–8 bytes each) to ensure metadata never exceeds exchange or XRPL byte limits.

5. **Breaking-Character & Syntax Auditing**
   * Detects stray curly braces, unescaped quotes, or control characters that crash naive marketplace scrapers.
   * 1-Click **"Sanitize"** tool to clean inputs instantly.

6. **Visual & Raw JSON Editor**
   * Dual-mode editing: user-friendly visual form (Name, Description, Attributes, Collection, Image) synchronized with a live Raw JSON editor.
   * High-speed image previews backed by verified fallback IPFS nodes.

7. **Xaman (XUMM) Signing Exclusively**
   * **Mobile:** 1-Tap "Open in Xaman" deep links.
   * **Desktop:** Clean QR code scanning with live WebSocket payload resolution.

---

## Optional: Running Locally (For Developers)

If you wish to audit the code or contribute locally:

```bash
# Clone the repository
git clone https://github.com/bigcjat/NFTEdit.git
cd NFTEdit

# Install dependencies
npm install

# Start local development server
npm run dev
```

---

## License

MIT

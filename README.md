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

## 📜 NFT & Digital Asset Licensing Reference Guide

On blockchains like XRPL, owning an `NFToken` on-ledger does not automatically transfer copyright ownership of the underlying artwork or file. Under international copyright law (the Berne Convention), **the creator retains 100% of all intellectual property by default unless an explicit legal license or deed is attached in the token metadata**.

NFTEdit includes a built-in **License & Rights Selector** featuring 28 authentic, empirically verified legal licenses across three main domains. You can use this guide as a reference when minting or updating token metadata:

### 1. Creative Commons & General Copyright (Visual Art & Media)

| License | Standard Code | Summary & Scope | Official Deed Link |
|---|:---:|---|:---:|
| **CC0 1.0 Universal** | `CC0-1.0` | **Public Domain:** No rights reserved. Unrestricted worldwide commercialization, remixing, and distribution without attribution. | [View Deed](https://creativecommons.org/publicdomain/zero/1.0/) |
| **Public Domain Mark 1.0** | `PDM-1.0` | **Historic Public Domain:** For cultural heritage, vintage scans, or historical works free of all known copyright restrictions. | [View Deed](https://creativecommons.org/publicdomain/mark/1.0/) |
| **CC BY 4.0** | `CC-BY-4.0` | **Attribution:** Others may share, adapt, and commercialize the work, provided credit is given to the original creator. | [View Deed](https://creativecommons.org/licenses/by/4.0/) |
| **CC BY-SA 4.0** | `CC-BY-SA-4.0` | **ShareAlike (Art Copyleft):** Remixes and commercial uses allowed with credit, but any derivatives must be released under identical terms. | [View Deed](https://creativecommons.org/licenses/by-sa/4.0/) |
| **CC BY-ND 4.0** | `CC-BY-ND-4.0` | **No Derivatives:** Commercial distribution permitted, but the work cannot be altered, cropped, recolored, or remixed. | [View Deed](https://creativecommons.org/licenses/by-nd/4.0/) |
| **CC BY-NC 4.0** | `CC-BY-NC-4.0` | **Non-Commercial:** Remixing and fan art permitted with credit, but neither the original nor derivatives may be monetized. | [View Deed](https://creativecommons.org/licenses/by-nc/4.0/) |
| **CC BY-NC-SA 4.0** | `CC-BY-NC-SA-4.0` | **Non-Commercial ShareAlike:** Non-commercial remixing with credit; all derivatives must stay non-commercial under the same license. | [View Deed](https://creativecommons.org/licenses/by-nc-sa/4.0/) |
| **CC BY-NC-ND 4.0** | `CC-BY-NC-ND-4.0` | **Strict Preservation:** Download and share with credit only. Zero commercial use and zero alterations or remixes permitted. | [View Deed](https://creativecommons.org/licenses/by-nc-nd/4.0/) |
| **All Rights Reserved** | `All Rights Reserved` | **Full Artist Copyright:** Token holder receives display rights only. Creator retains 100% exclusive copyright, reproduction, and IP. | [Copyright.gov](https://www.copyright.gov/) |

---

### 2. Official Web3 & NFT Standards (a16z & Dapper Labs)

Pre-drafted, standardized legal agreements created specifically for crypto tokens and smart contracts:

| Standard | License Code | Rights Scope | Official Signed Contract Link |
|---|:---:|---|:---:|
| **The Nifty License v1** | `Nifty-License-v1` | **$100k Capped Merch:** Created by Dapper Labs for CryptoKitties; personal display + commercial merch up to $100,000/yr gross revenue. | [nftlicense.org](https://www.nftlicense.org/) |
| **Can't Be Evil: Exclusive (ECR)** | `CBE-ECR` | **Exclusive Commercial:** Transfers full exclusive commercial exploitation rights to the current token holder. Creator cannot compete. | [Official PDF Contract](https://github.com/a16z/a16z-contracts/blob/master/licenses/pdf/01%20-%20a16z%20CBE%20Form%20License%20(CBE-Exclusive).pdf) |
| **Can't Be Evil: Non-Exclusive (NECR)** | `CBE-NECR` | **Co-Commercial Rights:** Token holder can commercialize the asset; original creator retains right to commercialize as well. | [Official PDF Contract](https://github.com/a16z/a16z-contracts/blob/master/licenses/pdf/02%20-%20a16z%20CBE%20Form%20License%20(CBE-Commercial).pdf) |
| **Can't Be Evil: Commercial + Sub (NECR-HS)** | `CBE-NECR-HS` | **Commercial & Sublicensable:** Holder has commercial rights and can sublicense rights to external brands, studios, or manufacturers. | [Official PDF Contract](https://github.com/a16z/a16z-contracts/blob/master/licenses/pdf/03%20-%20a16z%20CBE%20Form%20License%20(CBE-Commercial-No-Hate).pdf) |
| **Can't Be Evil: Personal Rights (PR)** | `CBE-PR` | **PFP & Personal Display:** Personal avatar, virtual gallery, and home display rights only. Zero commercial exploitation. | [Official PDF Contract](https://github.com/a16z/a16z-contracts/blob/master/licenses/pdf/04%20-%20a16z%20CBE%20Form%20License%20(CBE-Personal).pdf) |
| **Can't Be Evil: Personal + Sub (PR-HS)** | `CBE-PR-HS` | **Personal + Sublicensing:** Personal display rights with authorization to grant sublicenses to third parties for personal display. | [Official PDF Contract](https://github.com/a16z/a16z-contracts/blob/master/licenses/pdf/05%20-%20a16z%20CBE%20Form%20License%20(CBE-Personal-No-Hate).pdf) |
| **Can't Be Evil: Public Domain** | `CBE-Public` | **Web3 Public Domain Dedication:** Irrevocable dedication of the artwork to the public domain within the a16z standardized legal framework. | [Official PDF Contract](https://github.com/a16z/a16z-contracts/blob/master/licenses/pdf/06%20-%20a16z%20CBE%20Form%20License%20(CBE-Public).pdf) |

---

### 3. Open Source Software, Generative Art & Typography (OSI / SPDX)

For NFTs that embed on-chain generative scripts (p5.js, Three.js), GLSL shaders, software algorithms, or digital fonts:

| License | SPDX Code | Characteristics & Best Use Case | Certified Official URL |
|---|:---:|---|:---:|
| **MIT License** | `MIT` | **Simple & Permissive:** Industry standard for open-source code and generative scripts. | [opensource.org/license/MIT](https://opensource.org/license/MIT) |
| **Apache 2.0** | `Apache-2.0` | **Patent-Protected:** Permissive open source with explicit patent grants and trademark protection. | [apache.org/licenses/LICENSE-2.0](https://www.apache.org/licenses/LICENSE-2.0) |
| **BSD 3-Clause** | `BSD-3-Clause` | **Permissive + Non-Endorsement:** Prohibits using author names to endorse derived commercial products. | [opensource.org/license/BSD-3-Clause](https://opensource.org/license/BSD-3-Clause) |
| **BSD 2-Clause** | `BSD-2-Clause` | **Simplified Permissive:** Minimalist license requiring only copyright retention in source code. | [opensource.org/license/BSD-2-Clause](https://opensource.org/license/BSD-2-Clause) |
| **0BSD** | `0BSD` | **No-Attribution Permissive:** Ideal for compact on-chain generative scripts where comment bytes matter. | [opensource.org/license/0BSD](https://opensource.org/license/0BSD) |
| **Mozilla Public License 2.0** | `MPL-2.0` | **File-Level Copyleft:** Modified source files must stay open source; larger combined projects can remain proprietary. | [mozilla.org/MPL/2.0](https://www.mozilla.org/en-US/MPL/2.0/) |
| **GNU GPL v3.0** | `GPL-3.0` | **Strong Copyleft:** Anyone distributing derivatives of the generative code must make complete source code open. | [opensource.org/license/GPL-3.0](https://opensource.org/license/GPL-3.0) |
| **GNU AGPL v3.0** | `AGPL-3.0` | **Network Copyleft:** Closes the cloud loophole—anyone running modified code over a network/API must share source. | [opensource.org/license/AGPL-3.0](https://opensource.org/license/AGPL-3.0) |
| **GNU LGPL v3.0** | `LGPL-3.0` | **Library Copyleft:** Core library modifications stay open source; external apps can link to it dynamically. | [opensource.org/license/LGPL-3.0](https://opensource.org/license/LGPL-3.0) |
| **Boost Software License 1.0** | `BSL-1.0` | **Binary-Exempt:** Requires attribution for source code, but waives attribution for compiled binaries or WebAssembly. | [opensource.org/license/BSL-1.0](https://opensource.org/license/BSL-1.0) |
| **SIL Open Font License 1.1** | `OFL-1.1` | **Typography & Fonts:** The worldwide standard for digital fonts, glyph sets, and typeface NFTs. | [opensource.org/license/OFL-1.1](https://opensource.org/license/OFL-1.1) |
| **The Unlicense** | `Unlicense` | **Public Domain Software:** Template dedicating software and code completely to the public domain. | [unlicense.org](https://unlicense.org/) |

> **Automated URL Verification:** All license URLs and contract PDFs in this repository are verified live via an automated audit script (`node scripts/verify-license-urls.mjs`) ensuring 100% HTTP 200 resolution with zero broken links or hallucinations.

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

import type { LicensePreset, LicenseCategory } from '../types';

export const PRESET_LICENSES: LicensePreset[] = [
  // ==========================================
  // --- Creative Commons & Art Licenses ---
  // ==========================================
  {
    id: 'cc0-art',
    name: 'CC0 1.0 Universal (Public Domain)',
    category: 'art',
    rightsTag: 'Public Domain',
    summary: 'No copyright reserved. Anyone can freely remix, commercialize, distribute, and perform the artwork worldwide without requiring permission or attribution.',
    deedUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    licenseCode: 'CC0-1.0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
  },
  {
    id: 'pdm-art',
    name: 'Public Domain Mark 1.0 (PDM)',
    category: 'art',
    rightsTag: 'Historic Public Domain',
    summary: 'Identifies cultural heritage, vintage photography, or historical artwork known to be free of all copyright restrictions under copyright law worldwide.',
    deedUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
    licenseCode: 'PDM-1.0',
    licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
  },
  {
    id: 'cc-by-4',
    name: 'CC BY 4.0 (Attribution)',
    category: 'art',
    rightsTag: 'Commercial with Credit',
    summary: 'Others may share and adapt the artwork, even commercially, as long as appropriate credit is given to the original creator.',
    deedUrl: 'https://creativecommons.org/licenses/by/4.0/',
    licenseCode: 'CC-BY-4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  },
  {
    id: 'cc-by-sa-4',
    name: 'CC BY-SA 4.0 (ShareAlike)',
    category: 'art',
    rightsTag: 'Copyleft Open License',
    summary: 'Remixes and commercial adaptations are allowed with credit, but any derivatives must be released under identical license terms.',
    deedUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    licenseCode: 'CC-BY-SA-4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  {
    id: 'cc-by-nd-4',
    name: 'CC BY-ND 4.0 (No Derivatives)',
    category: 'art',
    rightsTag: 'Commercial / No Adaptations',
    summary: 'Others may reuse and distribute the artwork, including for commercial purposes, but it cannot be modified, remixed, or altered in any way.',
    deedUrl: 'https://creativecommons.org/licenses/by-nd/4.0/',
    licenseCode: 'CC-BY-ND-4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-nd/4.0/',
  },
  {
    id: 'cc-by-nc-4',
    name: 'CC BY-NC 4.0 (Non-Commercial)',
    category: 'art',
    rightsTag: 'Non-Commercial Only',
    summary: 'Others may remix and share the artwork with credit, but neither the original nor adaptations may be used for commercial profit.',
    deedUrl: 'https://creativecommons.org/licenses/by-nc/4.0/',
    licenseCode: 'CC-BY-NC-4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-nc/4.0/',
  },
  {
    id: 'cc-by-nc-sa-4',
    name: 'CC BY-NC-SA 4.0 (Non-Commercial ShareAlike)',
    category: 'art',
    rightsTag: 'Non-Commercial Copyleft',
    summary: 'Allows remixing and distributing the art for non-commercial purposes with credit, under identical non-commercial license terms.',
    deedUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    licenseCode: 'CC-BY-NC-SA-4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
  },
  {
    id: 'cc-by-nc-nd-4',
    name: 'CC BY-NC-ND 4.0 (Strict Preservation)',
    category: 'art',
    rightsTag: 'Share Only / No Changes / Non-Commercial',
    summary: 'Most restrictive Creative Commons terms: others can download and share with credit, but cannot modify the art or use it commercially.',
    deedUrl: 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
    licenseCode: 'CC-BY-NC-ND-4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
  },
  {
    id: 'all-rights-reserved',
    name: 'All Rights Reserved (ARR)',
    category: 'art',
    rightsTag: 'Full Artist Copyright',
    summary: 'The collector purchases the on-ledger token and personal display rights. The creator retains 100% exclusive copyright, reproduction, and commercial IP rights.',
    deedUrl: 'https://www.copyright.gov/',
    licenseCode: 'All Rights Reserved',
    licenseUrl: 'https://www.copyright.gov/',
  },

  // ==========================================
  // --- Web3 & NFT Standards ---
  // ==========================================
  {
    id: 'nifty-license',
    name: 'The Nifty License v1 (Dapper Labs Standard)',
    category: 'web3',
    rightsTag: 'Commercial Up to $100k/yr',
    summary: 'The pioneering NFT license created for CryptoKitties: grants personal display rights and commercial merchandise rights up to $100,000 gross revenue per year.',
    deedUrl: 'https://www.nftlicense.org/',
    licenseCode: 'Nifty-License-v1',
    licenseUrl: 'https://www.nftlicense.org/',
  },
  {
    id: 'cbe-ecr',
    name: "Can't Be Evil: Exclusive Commercial (ECR)",
    category: 'web3',
    rightsTag: 'Exclusive Commercial to Holder',
    summary: 'Transfers exclusive commercial exploitation rights to the token holder. The creator agrees not to compete commercially while you own the token.',
    deedUrl: 'https://github.com/a16z/a16z-contracts/blob/master/licenses/pdf/01%20-%20a16z%20CBE%20Form%20License%20(CBE-Exclusive).pdf',
    licenseCode: 'CBE-ECR',
    licenseUrl: 'https://github.com/a16z/a16z-contracts/blob/master/licenses/pdf/01%20-%20a16z%20CBE%20Form%20License%20(CBE-Exclusive).pdf',
  },
  {
    id: 'cbe-necr',
    name: "Can't Be Evil: Non-Exclusive Commercial (NECR)",
    category: 'web3',
    rightsTag: 'Co-Commercial Rights',
    summary: 'The token holder may commercialize the artwork (merchandise, media), and the original creator may also continue commercializing it.',
    deedUrl: 'https://github.com/a16z/a16z-contracts/blob/master/licenses/pdf/02%20-%20a16z%20CBE%20Form%20License%20(CBE-Commercial).pdf',
    licenseCode: 'CBE-NECR',
    licenseUrl: 'https://github.com/a16z/a16z-contracts/blob/master/licenses/pdf/02%20-%20a16z%20CBE%20Form%20License%20(CBE-Commercial).pdf',
  },
  {
    id: 'cbe-necr-hs',
    name: "Can't Be Evil: Commercial + Sublicensing (NECR-HS)",
    category: 'web3',
    rightsTag: 'Commercial & Sub-licensable',
    summary: 'Token holder has commercial rights and can grant sublicenses to external brands, film studios, or third-party manufacturers.',
    deedUrl: 'https://github.com/a16z/a16z-contracts/blob/master/licenses/pdf/03%20-%20a16z%20CBE%20Form%20License%20(CBE-Commercial-No-Hate).pdf',
    licenseCode: 'CBE-NECR-HS',
    licenseUrl: 'https://github.com/a16z/a16z-contracts/blob/master/licenses/pdf/03%20-%20a16z%20CBE%20Form%20License%20(CBE-Commercial-No-Hate).pdf',
  },
  {
    id: 'cbe-pr',
    name: "Can't Be Evil: Personal Rights Only (PR)",
    category: 'web3',
    rightsTag: 'PFP & Personal Display',
    summary: 'Grants personal display rights (social avatars, personal virtual galleries, prints for home), but strictly zero commercial use or licensing.',
    deedUrl: 'https://github.com/a16z/a16z-contracts/blob/master/licenses/pdf/04%20-%20a16z%20CBE%20Form%20License%20(CBE-Personal).pdf',
    licenseCode: 'CBE-PR',
    licenseUrl: 'https://github.com/a16z/a16z-contracts/blob/master/licenses/pdf/04%20-%20a16z%20CBE%20Form%20License%20(CBE-Personal).pdf',
  },
  {
    id: 'cbe-pr-hs',
    name: "Can't Be Evil: Personal + Sublicensing (PR-HS)",
    category: 'web3',
    rightsTag: 'Personal with Sublicensing',
    summary: 'Permits personal use and grants limited sublicensing rights to third parties for personal display, without commercial monetization.',
    deedUrl: 'https://github.com/a16z/a16z-contracts/blob/master/licenses/pdf/05%20-%20a16z%20CBE%20Form%20License%20(CBE-Personal-No-Hate).pdf',
    licenseCode: 'CBE-PR-HS',
    licenseUrl: 'https://github.com/a16z/a16z-contracts/blob/master/licenses/pdf/05%20-%20a16z%20CBE%20Form%20License%20(CBE-Personal-No-Hate).pdf',
  },
  {
    id: 'cbe-public',
    name: "Can't Be Evil: Public Domain (CBE-Public / CC0)",
    category: 'web3',
    rightsTag: 'Web3 Public Domain Dedication',
    summary: 'Creator irrevocably dedicates the artwork to the public domain under Creative Commons Zero (CC0) terms within the a16z standardized Web3 framework.',
    deedUrl: 'https://github.com/a16z/a16z-contracts/blob/master/licenses/pdf/06%20-%20a16z%20CBE%20Form%20License%20(CBE-Public).pdf',
    licenseCode: 'CBE-Public',
    licenseUrl: 'https://github.com/a16z/a16z-contracts/blob/master/licenses/pdf/06%20-%20a16z%20CBE%20Form%20License%20(CBE-Public).pdf',
  },

  // ==========================================
  // --- Code, Generative Art & Typography ---
  // ==========================================
  {
    id: 'code-mit',
    name: 'MIT License (Generative Script / Code)',
    category: 'code',
    rightsTag: 'Permissive Open Source',
    summary: 'Highly permissive open-source license. Anyone is free to run, copy, modify, merge, publish, and sell the generative algorithm code.',
    deedUrl: 'https://opensource.org/licenses/MIT',
    licenseCode: 'MIT',
    licenseUrl: 'https://opensource.org/licenses/MIT',
  },
  {
    id: 'code-apache-2',
    name: 'Apache 2.0 (Generative / Interactive)',
    category: 'code',
    rightsTag: 'Patent-Protected Open Source',
    summary: 'Permissive open-source license with an explicit grant of patent rights and trademark preservation for software and interactive web experiences.',
    deedUrl: 'https://www.apache.org/licenses/LICENSE-2.0',
    licenseCode: 'Apache-2.0',
    licenseUrl: 'https://www.apache.org/licenses/LICENSE-2.0',
  },
  {
    id: 'code-bsd-3',
    name: 'BSD 3-Clause License',
    category: 'code',
    rightsTag: 'Permissive with Non-Endorsement',
    summary: 'Permissive open-source license with minimal restrictions and a clause prohibiting use of author names to endorse derived products.',
    deedUrl: 'https://opensource.org/licenses/BSD-3-Clause',
    licenseCode: 'BSD-3-Clause',
    licenseUrl: 'https://opensource.org/licenses/BSD-3-Clause',
  },
  {
    id: 'code-bsd-2',
    name: 'BSD 2-Clause License',
    category: 'code',
    rightsTag: 'Simplified Permissive',
    summary: 'Simplified open-source license granting free use, modification, and redistribution as long as original copyright notices are retained.',
    deedUrl: 'https://opensource.org/licenses/BSD-2-Clause',
    licenseCode: 'BSD-2-Clause',
    licenseUrl: 'https://opensource.org/licenses/BSD-2-Clause',
  },
  {
    id: 'code-0bsd',
    name: '0BSD (BSD Zero Clause License)',
    category: 'code',
    rightsTag: 'No-Attribution Permissive',
    summary: 'Extreme freedom: allows using, modifying, and commercializing software without even requiring copyright notices or license text. Ideal for compact on-chain generative scripts and shaders.',
    deedUrl: 'https://opensource.org/licenses/0BSD',
    licenseCode: '0BSD',
    licenseUrl: 'https://opensource.org/licenses/0BSD',
  },
  {
    id: 'code-mpl-2',
    name: 'Mozilla Public License 2.0 (MPL-2.0)',
    category: 'code',
    rightsTag: 'Weak Copyleft',
    summary: 'File-level copyleft license: modifications to existing code files must remain open source, but larger projects combining it can remain proprietary.',
    deedUrl: 'https://www.mozilla.org/MPL/2.0/',
    licenseCode: 'MPL-2.0',
    licenseUrl: 'https://www.mozilla.org/MPL/2.0/',
  },
  {
    id: 'code-gpl-3',
    name: 'GNU GPL v3.0 (Copyleft Generative)',
    category: 'code',
    rightsTag: 'Strong Copyleft',
    summary: 'Strong copyleft: anyone modifying or creating derivative software from this generative code must make the complete source code public under GPL v3.',
    deedUrl: 'https://opensource.org/licenses/GPL-3.0',
    licenseCode: 'GPL-3.0',
    licenseUrl: 'https://opensource.org/licenses/GPL-3.0',
  },
  {
    id: 'code-agpl-3',
    name: 'GNU AGPL v3.0 (Affero Network Copyleft)',
    category: 'code',
    rightsTag: 'Network Copyleft',
    summary: 'The strongest copyleft license: if modified code is run over a network or used as a cloud/API backend service, complete source code must be made available to network users.',
    deedUrl: 'https://opensource.org/licenses/AGPL-3.0',
    licenseCode: 'AGPL-3.0',
    licenseUrl: 'https://opensource.org/licenses/AGPL-3.0',
  },
  {
    id: 'code-lgpl-3',
    name: 'GNU LGPL v3.0 (Lesser General Public License)',
    category: 'code',
    rightsTag: 'Library Copyleft',
    summary: 'Weak copyleft for software libraries and modules: improvements to the library itself must remain open source, but larger programs linking to it can remain closed or proprietary.',
    deedUrl: 'https://opensource.org/licenses/LGPL-3.0',
    licenseCode: 'LGPL-3.0',
    licenseUrl: 'https://opensource.org/licenses/LGPL-3.0',
  },
  {
    id: 'code-bsl-1',
    name: 'Boost Software License 1.0 (BSL-1.0)',
    category: 'code',
    rightsTag: 'Binary-Exempt Permissive',
    summary: 'Simple permissive license: requires copyright preservation for source code distributions, but waives all attribution requirements when distributing compiled binaries or WebAssembly.',
    deedUrl: 'https://opensource.org/licenses/BSL-1.0',
    licenseCode: 'BSL-1.0',
    licenseUrl: 'https://opensource.org/licenses/BSL-1.0',
  },
  {
    id: 'code-ofl-1-1',
    name: 'SIL Open Font License 1.1 (OFL-1.1)',
    category: 'code',
    rightsTag: 'Open Font & Typography',
    summary: 'The global standard license for digital typefaces, fonts, and glyph sets. Fonts can be freely used, bundled, embedded, and modified, as long as derivatives are not sold by themselves.',
    deedUrl: 'https://opensource.org/licenses/OFL-1.1',
    licenseCode: 'OFL-1.1',
    licenseUrl: 'https://opensource.org/licenses/OFL-1.1',
  },
  {
    id: 'code-unlicense',
    name: 'The Unlicense (Public Domain Code)',
    category: 'code',
    rightsTag: 'Public Domain Software',
    summary: 'A template for disclaiming copyright interest in software, dedicating code to the public domain with zero restrictions.',
    deedUrl: 'https://unlicense.org/',
    licenseCode: 'Unlicense',
    licenseUrl: 'https://unlicense.org/',
  },
];

/**
 * Filter preset licenses by category and search keyword.
 */
export function filterLicenses(
  presets: LicensePreset[],
  category: LicenseCategory,
  searchQuery: string
): LicensePreset[] {
  const query = searchQuery.trim().toLowerCase();

  return presets.filter((license) => {
    // Category match
    if (category !== 'all' && category !== 'custom' && license.category !== category) {
      return false;
    }

    // Search query match
    if (query) {
      const matchName = license.name.toLowerCase().includes(query);
      const matchCode = license.licenseCode.toLowerCase().includes(query);
      const matchTag = license.rightsTag.toLowerCase().includes(query);
      const matchSummary = license.summary.toLowerCase().includes(query);
      if (!matchName && !matchCode && !matchTag && !matchSummary) {
        return false;
      }
    }

    return true;
  });
}

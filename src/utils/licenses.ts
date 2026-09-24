import type { LicensePreset, LicenseCategory } from '../types';

export const PRESET_LICENSES: LicensePreset[] = [
  // --- Visual Art & Photography ---
  {
    id: 'cc0-art',
    name: 'CC0 1.0 Universal',
    category: 'art',
    rightsTag: 'Public Domain',
    summary: 'No copyright reserved. Anyone can freely remix, commercialize, or distribute the artwork worldwide without requiring attribution.',
    deedUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    licenseCode: 'CC0-1.0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
  },
  {
    id: 'cc-by-4',
    name: 'CC BY 4.0 (Attribution)',
    category: 'art',
    rightsTag: 'Commercial with Credit',
    summary: 'Others may share and adapt the artwork, even commercially, as long as appropriate credit is given to the creator.',
    deedUrl: 'https://creativecommons.org/licenses/by/4.0/',
    licenseCode: 'CC-BY-4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  },
  {
    id: 'cc-by-sa-4',
    name: 'CC BY-SA 4.0 (ShareAlike)',
    category: 'art',
    rightsTag: 'Viral Open License',
    summary: 'Remixes and commercial adaptations are allowed with credit, but any derivatives must be released under identical license terms.',
    deedUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    licenseCode: 'CC-BY-SA-4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
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
    id: 'cc-by-nc-nd-4',
    name: 'CC BY-NC-ND 4.0 (Strict Preservation)',
    category: 'art',
    rightsTag: 'Share Only / No Changes',
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
  {
    id: 'exhibition-rights',
    name: 'Exhibition & Display Rights Only',
    category: 'art',
    rightsTag: 'Gallery & VR Display',
    summary: 'Explicitly grants the token holder the right to exhibit the artwork publicly in physical galleries, museums, virtual reality spaces, and personal collections.',
    deedUrl: 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
    licenseCode: 'Exhibition Rights Only',
    licenseUrl: 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
  },

  // --- Music & Audio ---
  {
    id: 'music-personal-listening',
    name: 'Master Recording Personal Use',
    category: 'music',
    rightsTag: 'Private Listening Only',
    summary: 'Collector receives private listening, virtual world avatar streaming, and personal playlist rights. Artist retains master copyright, sync rights, and mechanical royalties.',
    deedUrl: 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
    licenseCode: 'Music-Personal-Listening-Only',
    licenseUrl: 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
  },
  {
    id: 'music-commercial-sync',
    name: 'Commercial Synchronization & Streaming',
    category: 'music',
    rightsTag: 'Commercial Sync Allowed',
    summary: 'Token holder may synchronize the audio track into videos, podcasts, video games, or live streams without paying additional sync fees.',
    deedUrl: 'https://creativecommons.org/licenses/by/4.0/',
    licenseCode: 'Music-Commercial-Sync-License',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  },
  {
    id: 'music-cc-by-nc',
    name: 'CC BY-NC Audio (Remix with Credit)',
    category: 'music',
    rightsTag: 'Non-Commercial Sampling',
    summary: 'Producers and fans can sample, remix, and share the track for non-commercial projects with artist credit.',
    deedUrl: 'https://creativecommons.org/licenses/by-nc/4.0/',
    licenseCode: 'CC-BY-NC-4.0-Audio',
    licenseUrl: 'https://creativecommons.org/licenses/by-nc/4.0/',
  },
  {
    id: 'music-cc0-audio',
    name: 'Open Music Stems & Samples (CC0)',
    category: 'music',
    rightsTag: 'Royalty-Free Public Domain',
    summary: 'Complete stems and master audio dedicated to public domain. Royalty-free for any artist to sample in billboard releases or indie tracks.',
    deedUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    licenseCode: 'CC0-1.0-Audio',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
  },

  // --- Web3 / NFT Standards (a16z Can't Be Evil Suite) ---
  {
    id: 'cbe-ecr',
    name: "Can't Be Evil: Exclusive Commercial (ECR)",
    category: 'web3',
    rightsTag: 'Exclusive Commercial to Holder',
    summary: 'Transfers exclusive commercial exploitation rights to the token holder. The creator agrees not to compete commercially while you own the token.',
    deedUrl: 'https://github.com/a16z/cant-be-evil-licenses/blob/master/licenses/LICENSE-CBE-ECR.md',
    licenseCode: 'CBE-ECR',
    licenseUrl: 'https://github.com/a16z/cant-be-evil-licenses/blob/master/licenses/LICENSE-CBE-ECR.md',
  },
  {
    id: 'cbe-necr',
    name: "Can't Be Evil: Non-Exclusive Commercial (NECR)",
    category: 'web3',
    rightsTag: 'Co-Commercial Rights',
    summary: 'The token holder may commercialize the artwork (merchandise, media), and the original creator may also continue commercializing it.',
    deedUrl: 'https://github.com/a16z/cant-be-evil-licenses/blob/master/licenses/LICENSE-CBE-NECR.md',
    licenseCode: 'CBE-NECR',
    licenseUrl: 'https://github.com/a16z/cant-be-evil-licenses/blob/master/licenses/LICENSE-CBE-NECR.md',
  },
  {
    id: 'cbe-necr-hs',
    name: "Can't Be Evil: Commercial + Sublicensing (NECR-HS)",
    category: 'web3',
    rightsTag: 'Commercial & Sub-licensable',
    summary: 'Token holder has commercial rights and can grant sublicenses to external brands, film studios, or third-party manufacturers.',
    deedUrl: 'https://github.com/a16z/cant-be-evil-licenses/blob/master/licenses/LICENSE-CBE-NECR-HS.md',
    licenseCode: 'CBE-NECR-HS',
    licenseUrl: 'https://github.com/a16z/cant-be-evil-licenses/blob/master/licenses/LICENSE-CBE-NECR-HS.md',
  },
  {
    id: 'cbe-pr',
    name: "Can't Be Evil: Personal Rights Only (PR)",
    category: 'web3',
    rightsTag: 'PFP & Personal Display',
    summary: 'Grants personal display rights (social avatars, personal virtual galleries, prints for home), but strictly zero commercial use or licensing.',
    deedUrl: 'https://github.com/a16z/cant-be-evil-licenses/blob/master/licenses/LICENSE-CBE-PR.md',
    licenseCode: 'CBE-PR',
    licenseUrl: 'https://github.com/a16z/cant-be-evil-licenses/blob/master/licenses/LICENSE-CBE-PR.md',
  },

  // --- 3D Assets & Metaverse / Game Models ---
  {
    id: '3d-royalty-free-commercial',
    name: 'Royalty-Free Commercial 3D Asset',
    category: '3d',
    rightsTag: 'Game & Metaverse Ready',
    summary: 'Grants license to embed and distribute the 3D model in commercial video games, virtual worlds, VR/AR experiences, and interactive apps.',
    deedUrl: 'https://creativecommons.org/licenses/by/4.0/',
    licenseCode: '3D-Royalty-Free-Commercial',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  },
  {
    id: '3d-editorial-personal',
    name: 'Editorial / Non-Commercial 3D Asset',
    category: '3d',
    rightsTag: 'Renders & Personal Only',
    summary: 'Model may be rendered in 2D images, video art, or portfolio showcases, but cannot be distributed inside commercial game engines or virtual shops.',
    deedUrl: 'https://creativecommons.org/licenses/by-nc/4.0/',
    licenseCode: '3D-Editorial-Personal-Use',
    licenseUrl: 'https://creativecommons.org/licenses/by-nc/4.0/',
  },
  {
    id: '3d-cc0-asset',
    name: 'CC0 Open 3D Asset (Public Domain)',
    category: '3d',
    rightsTag: 'Open Metaverse Asset',
    summary: '3D geometry, textures, and animations dedicated to the public domain. Free for indie developers to use in any game engine or metaverse.',
    deedUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    licenseCode: 'CC0-1.0-3D',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
  },

  // --- Code, Generative Art & Interactive Media ---
  {
    id: 'code-mit',
    name: 'MIT License (Generative Script)',
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
    id: 'code-gpl-3',
    name: 'GNU GPL v3.0 (Copyleft Generative)',
    category: 'code',
    rightsTag: 'Copyleft Open Source',
    summary: 'Strong copyleft: anyone modifying or creating derivative software from this generative code must make the complete source code public under GPL v3.',
    deedUrl: 'https://www.gnu.org/licenses/gpl-3.0.html',
    licenseCode: 'GPL-3.0',
    licenseUrl: 'https://www.gnu.org/licenses/gpl-3.0.html',
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

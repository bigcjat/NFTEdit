import type { FieldAudit, MultiByteDetail } from '../types';

/**
 * Calculates UTF-8 byte length for any string.
 */
export function getUtf8Bytes(text: string): number {
  if (!text) return 0;
  return new TextEncoder().encode(text).length;
}

/**
 * Analyzes a string for character length, UTF-8 byte footprint,
 * multi-byte glyphs (emojis, accented characters), and illegal / breaking syntax characters.
 */
export function auditField(text: string, _fieldName = 'Field'): FieldAudit {
  if (text === undefined || text === null) {
    text = '';
  }

  const rawString = String(text);
  const byteCount = getUtf8Bytes(rawString);
  
  // Unicode-aware character iteration (graphemes/code points)
  // Using Intl.Segmenter if available, fallback to Array.from
  let graphemes: string[] = [];
  if (typeof Intl !== 'undefined' && (Intl as any).Segmenter) {
    const segmenter = new (Intl as any).Segmenter('en', { granularity: 'grapheme' });
    graphemes = Array.from(segmenter.segment(rawString)).map((s: any) => s.segment);
  } else {
    graphemes = Array.from(rawString);
  }

  const charCount = rawString.length;
  const graphemeCount = graphemes.length;

  const multiByteChars: MultiByteDetail[] = [];
  const illegalChars: string[] = [];
  const warnings: string[] = [];

  // Track unique multi-byte characters
  const seenMultiByte = new Set<string>();

  for (const grapheme of graphemes) {
    const gBytes = getUtf8Bytes(grapheme);
    if (gBytes > 1) {
      if (!seenMultiByte.has(grapheme)) {
        seenMultiByte.add(grapheme);
        const codePoints = Array.from(grapheme)
          .map((c) => 'U+' + c.codePointAt(0)?.toString(16).toUpperCase().padStart(4, '0'))
          .join(' ');
        
        multiByteChars.push({
          char: grapheme,
          bytes: gBytes,
          codePoint: codePoints,
        });
      }
    }
  }

  // Check for breaking or illegal characters:
  // 1. Stray curly braces: '}' or '{' which user explicitly highlighted as breaking certain parsers
  if (rawString.includes('}')) {
    illegalChars.push('}');
    warnings.push(
      `Contains closing brace "}" which can corrupt naive JSON parsers, template engines, and exchange indexers.`
    );
  }
  if (rawString.includes('{')) {
    illegalChars.push('{');
    warnings.push(
      `Contains opening brace "{" which can disrupt templating systems or metadata scrapers.`
    );
  }

  // 2. Unescaped control characters (ASCII 0-31, except standard \n, \r, \t)
  for (let i = 0; i < rawString.length; i++) {
    const code = rawString.charCodeAt(i);
    if (code < 32 && code !== 10 && code !== 13 && code !== 9) {
      const hex = '0x' + code.toString(16).padStart(2, '0');
      if (!illegalChars.includes(hex)) {
        illegalChars.push(hex);
        warnings.push(`Contains non-printable control character (${hex}).`);
      }
    }
  }

  // 3. Inform user about high byte-to-char ratio caused by emojis
  if (multiByteChars.length > 0) {
    const totalEmojiCount = graphemes.filter((g) => getUtf8Bytes(g) > 1).length;
    const diff = byteCount - graphemeCount;
    if (diff > 5) {
      warnings.push(
        `High byte footprint: ${totalEmojiCount} multi-byte character(s) add +${diff} bytes over standard text length.`
      );
    }
  }

  return {
    charCount,
    graphemeCount,
    byteCount,
    multiByteChars,
    illegalChars,
    warnings,
    isValid: illegalChars.length === 0,
  };
}

/**
 * Sanitizes a field by removing stray braces and problematic control characters.
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  return text
    // Replace stray curly braces with clean alternatives or remove
    .replace(/[{}]/g, '')
    // Remove non-printable control characters (except newline, tab)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Full audit for the entire NFTMetadata object.
 */
export interface MetadataAuditSummary {
  totalJsonBytes: number;
  totalJsonChars: number;
  fieldsWithWarnings: { fieldName: string; audit: FieldAudit }[];
  allMultiByteChars: MultiByteDetail[];
  hasErrors: boolean;
  maxFieldBytes: { field: string; bytes: number };
}

export function auditMetadata(metadata: Record<string, any>): MetadataAuditSummary {
  const jsonString = JSON.stringify(metadata, null, 2);
  const totalJsonBytes = getUtf8Bytes(jsonString);
  const totalJsonChars = jsonString.length;

  const fieldsWithWarnings: { fieldName: string; audit: FieldAudit }[] = [];
  const multiByteMap = new Map<string, MultiByteDetail>();
  let maxField = { field: 'None', bytes: 0 };

  function traverse(obj: any, path = '') {
    if (typeof obj === 'string') {
      const audit = auditField(obj, path);
      if (audit.byteCount > maxField.bytes) {
        maxField = { field: path, bytes: audit.byteCount };
      }
      if (audit.warnings.length > 0) {
        fieldsWithWarnings.push({ fieldName: path, audit });
      }
      for (const mb of audit.multiByteChars) {
        multiByteMap.set(mb.char, mb);
      }
    } else if (Array.isArray(obj)) {
      obj.forEach((item, idx) => traverse(item, `${path}[${idx}]`));
    } else if (obj !== null && typeof obj === 'object') {
      for (const key of Object.keys(obj)) {
        traverse(obj[key], path ? `${path}.${key}` : key);
      }
    }
  }

  traverse(metadata);

  return {
    totalJsonBytes,
    totalJsonChars,
    fieldsWithWarnings,
    allMultiByteChars: Array.from(multiByteMap.values()),
    hasErrors: fieldsWithWarnings.some((f) => !f.audit.isValid),
    maxFieldBytes: maxField,
  };
}

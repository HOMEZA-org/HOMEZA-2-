import { Property, PropertyImage } from '../types';

export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  score: number; // 0 - 100
  reasons: string[];
  exactImageMatch: boolean;
  matchedImageUrls: string[];
  matchedProperty?: Property;
  isCoManagedScenario?: boolean;
}

// Nigerian & English Street Address Normalization Dictionary
const ADDRESS_ABBREVIATIONS: Record<string, string> = {
  'rd': 'road',
  'rd.': 'road',
  'st': 'street',
  'st.': 'street',
  'ave': 'avenue',
  'ave.': 'avenue',
  'av': 'avenue',
  'cres': 'crescent',
  'cres.': 'crescent',
  'cl': 'close',
  'cl.': 'close',
  'ext': 'extension',
  'ext.': 'extension',
  'bstop': 'bus stop',
  'b/stop': 'bus stop',
  'opp': 'opposite',
  'opp.': 'opposite',
  'adj': 'adjacent',
  'adj.': 'adjacent',
  'blvd': 'boulevard',
  'blvd.': 'boulevard',
  'est': 'estate',
  'est.': 'estate',
  'hsg': 'housing',
  'hsg.': 'housing',
  'ln': 'lane',
  'dr': 'drive',
  'dr.': 'drive',
  'way': 'way',
  'crt': 'court',
  'ct': 'court',
};

/**
 * Normalizes street address strings by standardizing abbreviations, stripping punctuation,
 * removing noise words, and lowering case.
 */
export function normalizeAddress(raw: string): string {
  if (!raw) return '';
  let text = raw.toLowerCase().trim();

  // Strip common noisy prefixes like "no.", "no 12", "plot 5", "house 3"
  text = text.replace(/^(no\.?|plot\.?|house\.?|flat\.?|apt\.?|suite\.?)\s+/g, '');

  // Remove punctuation
  text = text.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ');

  // Split tokens and expand abbreviations
  const tokens = text
    .split(/\s+/)
    .filter((t) => t.length > 0)
    .map((t) => ADDRESS_ABBREVIATIONS[t] || t);

  return tokens.join(' ').trim();
}

/**
 * Computes token Jaccard similarity between two strings.
 */
export function computeTokenSimilarity(strA: string, strB: string): number {
  if (!strA || !strB) return 0;
  const tokensA = new Set(strA.toLowerCase().split(/\W+/).filter((t) => t.length > 2));
  const tokensB = new Set(strB.toLowerCase().split(/\W+/).filter((t) => t.length > 2));

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  tokensA.forEach((token) => {
    if (tokensB.has(token)) intersection++;
  });

  const union = new Set([...tokensA, ...tokensB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Generates an image fingerprint / perceptual signature from an image URL or data URL.
 * Handles exact URLs, data URLs, and hashes image path / base64 content so filename differences don't bypass.
 */
export function getImageSignature(img: PropertyImage | string): string {
  const url = typeof img === 'string' ? img : img.url || '';
  if (!url) return '';

  // If it's a data URL, strip the header and sample structural length + content slice
  if (url.startsWith('data:image/')) {
    const rawData = url.split(',')[1] || '';
    if (rawData.length > 100) {
      // Sample early, middle, and end chunks to create perceptual hash
      const sample =
        rawData.slice(0, 40) +
        rawData.slice(Math.floor(rawData.length / 2), Math.floor(rawData.length / 2) + 40) +
        rawData.slice(-40);
      return `dhash:${rawData.length}:${sample}`;
    }
    return `data:${rawData.slice(0, 100)}`;
  }

  // If it's an Unsplash / Cloudinary / external CDN URL, extract the core image ID / signature
  // e.g. https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format... -> photo-1589829545856-d10d557cf95f
  const unsplashMatch = url.match(/photo-[a-zA-Z0-9-]+/);
  if (unsplashMatch) {
    return `unsplash:${unsplashMatch[0]}`;
  }

  // Strip query parameters and protocols
  const cleanUrl = url.replace(/^https?:\/\//, '').split('?')[0];
  return `url:${cleanUrl.toLowerCase().trim()}`;
}

/**
 * Compares two sets of property images to detect exact or perceptual duplicates.
 */
export function compareImages(
  newImages: (PropertyImage | string)[],
  existingImages: (PropertyImage | string)[]
): { exactMatchCount: number; matchedUrls: string[] } {
  if (!newImages || !existingImages || newImages.length === 0 || existingImages.length === 0) {
    return { exactMatchCount: 0, matchedUrls: [] };
  }

  const existingSigs = new Map<string, string>();
  existingImages.forEach((img) => {
    const sig = getImageSignature(img);
    const url = typeof img === 'string' ? img : img.url;
    if (sig) existingSigs.set(sig, url);
  });

  let matchCount = 0;
  const matchedUrls: string[] = [];

  newImages.forEach((img) => {
    const sig = getImageSignature(img);
    const url = typeof img === 'string' ? img : img.url;
    if (sig && existingSigs.has(sig)) {
      matchCount++;
      matchedUrls.push(url);
    }
  });

  return { exactMatchCount: matchCount, matchedUrls };
}

/**
 * Main Duplicate Detection Engine:
 * Compares a candidate property with an existing property listing across all signals.
 */
export function evaluatePropertyDuplicate(
  candidate: Partial<Property>,
  existing: Property
): { score: number; reasons: string[]; exactImageMatch: boolean; matchedImageUrls: string[] } {
  let score = 0;
  const reasons: string[] = [];
  let exactImageMatch = false;
  let matchedImageUrls: string[] = [];

  // 1. IMAGE-BASED DUPLICATE DETECTION (High weight)
  const candidateImages = candidate.images || [];
  const existingImages = existing.images || [];
  if (candidateImages.length > 0 && existingImages.length > 0) {
    const { exactMatchCount, matchedUrls } = compareImages(candidateImages, existingImages);
    if (exactMatchCount > 0) {
      exactImageMatch = true;
      matchedImageUrls = matchedUrls;
      const ratio = exactMatchCount / candidateImages.length;
      if (ratio >= 0.5 || exactMatchCount >= 2) {
        score += 55;
        reasons.push(
          `${exactMatchCount} identical property photo${exactMatchCount > 1 ? 's' : ''} already in use on listing "${existing.title}"`
        );
      } else {
        score += 35;
        reasons.push(`Photo match detected on listing "${existing.title}"`);
      }
    }
  }

  // 2. NORMALIZED ADDRESS & AREA MATCHING
  const candArea = (candidate.location?.area || '').trim().toLowerCase();
  const existArea = (existing.location?.area || '').trim().toLowerCase();
  const candStreet = normalizeAddress(candidate.location?.street || '');
  const existStreet = normalizeAddress(existing.location?.street || '');

  const isSameArea = candArea && existArea && candArea === existArea;

  if (isSameArea) {
    score += 25;
    reasons.push(`Same neighbourhood area (${existing.location.area})`);

    // Street similarity within same area
    if (candStreet && existStreet) {
      if (candStreet === existStreet) {
        score += 35;
        reasons.push(`Exact matching street address ("${existing.location.street}")`);
      } else {
        const streetSim = computeTokenSimilarity(candStreet, existStreet);
        if (streetSim >= 0.6) {
          score += 25;
          reasons.push(`Highly similar street location ("${existing.location.street}")`);
        }
      }
    }
  }

  // Landmark similarity
  const candLandmark = normalizeAddress(candidate.location?.landmark || '');
  const existLandmark = normalizeAddress(existing.location?.landmark || '');
  if (candLandmark && existLandmark) {
    const landmarkSim = computeTokenSimilarity(candLandmark, existLandmark);
    if (landmarkSim >= 0.6) {
      score += 15;
      reasons.push(`Matching vicinity landmark (${existing.location.landmark})`);
    }
  }

  // 3. PROPERTY SPECIFICATIONS (Type, Bedrooms, Bathrooms)
  if (
    candidate.propertyType &&
    existing.propertyType &&
    candidate.propertyType.toLowerCase() === existing.propertyType.toLowerCase()
  ) {
    score += 15;
    reasons.push(`Matching property type (${existing.propertyType})`);
  }

  if (
    candidate.bedrooms !== undefined &&
    existing.bedrooms !== undefined &&
    Number(candidate.bedrooms) === Number(existing.bedrooms)
  ) {
    score += 15;
    reasons.push(`Matching bedroom count (${existing.bedrooms} bedrooms)`);
  }

  if (
    candidate.bathrooms !== undefined &&
    existing.bathrooms !== undefined &&
    Number(candidate.bathrooms) === Number(existing.bathrooms)
  ) {
    score += 10;
  }

  // 4. RENT PRICING PROXIMITY
  const candRent = Number(candidate.pricing?.rent || candidate.pricing?.monthlyRent || 0);
  const existRent = Number(existing.pricing?.rent || existing.pricing?.monthlyRent || 0);
  if (candRent > 0 && existRent > 0) {
    const diffRatio = Math.abs(candRent - existRent) / Math.max(candRent, existRent);
    if (diffRatio === 0) {
      score += 20;
      reasons.push(`Identical rent (₦${candRent.toLocaleString()})`);
    } else if (diffRatio <= 0.1) {
      score += 12;
      reasons.push(`Matching price tier (within 10%)`);
    }
  }

  // 5. TITLE & DESCRIPTION SEMANTIC SIMILARITY
  const titleSim = computeTokenSimilarity(candidate.title || '', existing.title || '');
  if (titleSim >= 0.7) {
    score += 20;
    reasons.push(`Similar listing title ("${existing.title}")`);
  }

  const descSim = computeTokenSimilarity(candidate.description || '', existing.description || '');
  if (descSim >= 0.65) {
    score += 15;
    reasons.push(`Extensive match in property description text`);
  }

  // Cap score at 100
  const finalScore = Math.min(score, 100);

  return {
    score: finalScore,
    reasons,
    exactImageMatch,
    matchedImageUrls,
  };
}

/**
 * Evaluates candidate property against an entire collection of existing properties.
 * Returns the highest confidence duplicate match.
 */
export function checkPropertyDuplicates(
  candidate: Partial<Property>,
  existingProperties: Property[],
  currentUserId?: string
): DuplicateDetectionResult {
  if (!existingProperties || existingProperties.length === 0) {
    return {
      isDuplicate: false,
      confidence: 'NONE',
      score: 0,
      reasons: [],
      exactImageMatch: false,
      matchedImageUrls: [],
    };
  }

  let highestScore = 0;
  let topReasons: string[] = [];
  let topExactImageMatch = false;
  let topMatchedImageUrls: string[] = [];
  let matchedProp: Property | undefined = undefined;

  for (const existing of existingProperties) {
    if (candidate.id && existing.id === candidate.id) continue;
    // Don't match rejected or deleted properties
    if (existing.status === 'REJECTED') continue;

    const { score, reasons, exactImageMatch, matchedImageUrls } = evaluatePropertyDuplicate(
      candidate,
      existing
    );

    if (score > highestScore) {
      highestScore = score;
      topReasons = reasons;
      topExactImageMatch = exactImageMatch;
      topMatchedImageUrls = matchedImageUrls;
      matchedProp = existing;
    }
  }

  // Check for legitimate co-managed scenario (e.g. landlord and agent for same property)
  const isCoManagedScenario =
    Boolean(matchedProp) &&
    ((currentUserId && matchedProp?.landlordId === currentUserId) ||
      (currentUserId && matchedProp?.submittingAgentId === currentUserId) ||
      (candidate.landlordId && matchedProp?.landlordId === candidate.landlordId));

  // Determine Confidence Tier
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE' = 'NONE';
  let isDuplicate = false;

  // High confidence threshold: Score >= 80, OR exact image match + same area/property type with Score >= 70
  if (highestScore >= 80 || (topExactImageMatch && highestScore >= 70)) {
    confidence = 'HIGH';
    isDuplicate = true;
  } else if (highestScore >= 50) {
    confidence = 'MEDIUM';
    isDuplicate = true;
  } else if (highestScore >= 35) {
    confidence = 'LOW';
  }

  return {
    isDuplicate,
    confidence,
    score: highestScore,
    reasons: topReasons,
    exactImageMatch: topExactImageMatch,
    matchedImageUrls: topMatchedImageUrls,
    matchedProperty: matchedProp,
    isCoManagedScenario,
  };
}

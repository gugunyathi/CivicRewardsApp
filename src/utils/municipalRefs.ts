import type { MunicipalityCode, ServiceCategoryId } from '../types/civic';

function digits(n: number): string {
  let out = '';
  for (let i = 0; i < n; i++) out += String(Math.floor(Math.random() * 10));
  return out;
}

type Dept = 'water' | 'power' | 'roads' | 'waste' | 'general';

function deptForCategory(categoryId: ServiceCategoryId): Dept {
  switch (categoryId) {
    case 'water':
      return 'water';
    case 'electricity':
    case 'streetlights':
      return 'power';
    case 'roads':
      return 'roads';
    case 'waste':
      return 'waste';
    default:
      return 'general';
  }
}

/**
 * Generate a provisional municipal reference number in the entity's own
 * format (mirrors the depot's ticketing pattern until the official ref
 * is issued). Purely client-side; no network needed.
 */
export function generateMunicipalRef(
  municipalityCode: MunicipalityCode,
  categoryId: ServiceCategoryId
): string {
  const dept = deptForCategory(categoryId);
  const year = new Date().getFullYear();
  switch (municipalityCode) {
    case 'CoJ':
      switch (dept) {
        case 'water':
          return `JWAPP-${digits(8)}`;
        case 'power':
          return `CPWEB${digits(7)}`;
        case 'roads':
          return `JRA-${year}-${digits(4)}`;
        case 'waste':
          return `PKT-${digits(6)}`;
        default:
          return `JMPD-${digits(5)}`;
      }
    case 'CoCT':
      switch (dept) {
        case 'power':
          return `CT-EL-${digits(6)}`;
        case 'water':
          return `CT-WT-${digits(6)}`;
        case 'roads':
          return `CT-RD-${digits(6)}`;
        default:
          return `CT-GN-${digits(6)}`;
      }
    case 'CoT':
      switch (dept) {
        case 'water':
          return `TSH-WT-${digits(5)}`;
        case 'roads':
          return `TSH-RD-${digits(5)}`;
        default:
          return `TSH-${digits(6)}`;
      }
    case 'eThekwini':
      switch (dept) {
        case 'power':
          return `ETH-EL-${digits(5)}`;
        case 'water':
          return `ETH-WS-${digits(5)}`;
        case 'roads':
          return `ETH-RD-${digits(5)}`;
        default:
          return `ETH-GN-${digits(5)}`;
      }
  }
}

export interface RefGuidance {
  depot: string;
  entityHandle: string;
  slaHours: number;
  steps: string[];
}

/** Guided "get your official ref" steps for a depot/entity. */
export function getRefGuidance(depot: string, entityHandle: string, slaHours: number): RefGuidance {
  return {
    depot,
    entityHandle,
    slaHours,
    steps: [
      `Note your CivicRewards ticket ID from the summary screen.`,
      `Log the same fault with ${depot} (portal, call centre, or ${entityHandle}) and quote your ticket ID.`,
      `Paste the official reference number they issue into the Ref # field — it replaces the provisional ref.`,
    ],
  };
}

import type { AssetScoreDistribution, ScoredFinding } from "../../api/types";

export type BusinessUnitRiskBand = "Critical" | "High" | "Medium" | "Low";

export interface RiskTrendPoint {
  month: string;
  score: number;
}

export interface BusinessUnitDetailMockData {
  riskScore: number;
  riskBand: BusinessUnitRiskBand;
  trend: RiskTrendPoint[];
  severityCounts: Record<Lowercase<BusinessUnitRiskBand>, number>;
  assetCriticalityDistribution: AssetScoreDistribution;
  findingRiskDistribution: AssetScoreDistribution;
  services: Record<
    string,
    {
      description: string;
      riskScore: number;
      riskBand: BusinessUnitRiskBand;
      criticalFindings: number;
      trend: RiskTrendPoint[];
    }
  >;
  topFindings: ScoredFinding[];
}

const DEFAULT_TREND: RiskTrendPoint[] = [
  { month: "M-5", score: 58 },
  { month: "M-4", score: 62 },
  { month: "M-3", score: 61 },
  { month: "M-2", score: 67 },
  { month: "M-1", score: 72 },
  { month: "Now", score: 74 },
];

const MOCKS: Record<string, BusinessUnitDetailMockData> = {
  "online-store": {
    riskScore: 82,
    riskBand: "High",
    trend: [
      { month: "M-5", score: 65 },
      { month: "M-4", score: 68 },
      { month: "M-3", score: 71 },
      { month: "M-2", score: 76 },
      { month: "M-1", score: 79 },
      { month: "Now", score: 82 },
    ],
    severityCounts: {
      critical: 94,
      high: 312,
      medium: 1808,
      low: 6174,
    },
    assetCriticalityDistribution: {
      critical: 7,
      high: 24,
      medium: 202,
      low: 17,
      unscored: 0,
    },
    findingRiskDistribution: {
      critical: 94,
      high: 312,
      medium: 1808,
      low: 6174,
      unscored: 0,
    },
    services: {
      "digital-storefront": {
        description: "Customer-facing commerce, checkout, and account journeys.",
        riskScore: 88,
        riskBand: "High",
        criticalFindings: 52,
        trend: [
          { month: "M-5", score: 70 },
          { month: "M-4", score: 74 },
          { month: "M-3", score: 73 },
          { month: "M-2", score: 79 },
          { month: "M-1", score: 83 },
          { month: "Now", score: 88 },
        ],
      },
      "shipping-and-tracking": {
        description: "Order fulfillment visibility across shipment and carrier systems.",
        riskScore: 71,
        riskBand: "Medium",
        criticalFindings: 19,
        trend: [
          { month: "M-5", score: 67 },
          { month: "M-4", score: 66 },
          { month: "M-3", score: 69 },
          { month: "M-2", score: 70 },
          { month: "M-1", score: 72 },
          { month: "Now", score: 71 },
        ],
      },
    },
    topFindings: [
      makeFinding("os-1", "CVE-2024-3094", "XZ Utils backdoor exposure", "Critical", 98, 99.8, true, 7),
      makeFinding("os-2", "CVE-2023-34362", "MOVEit transfer exploit path", "High", 91, 97.1, true, 18),
      makeFinding("os-3", "CVE-2024-6387", "OpenSSH regreSSHion vulnerability", "High", 89, 95.4, false, 12),
      makeFinding("os-4", "CVE-2023-4966", "Citrix NetScaler session token leak", "High", 87, 94.2, true, 27),
      makeFinding("os-5", "CVE-2024-21762", "Fortinet SSL VPN out-of-bounds write", "Medium", 74, 88.6, false, 31),
    ],
  },
  manufacturing: {
    riskScore: 43,
    riskBand: "Low",
    trend: [
      { month: "M-5", score: 47 },
      { month: "M-4", score: 45 },
      { month: "M-3", score: 44 },
      { month: "M-2", score: 42 },
      { month: "M-1", score: 41 },
      { month: "Now", score: 43 },
    ],
    severityCounts: {
      critical: 12,
      high: 63,
      medium: 911,
      low: 2872,
    },
    assetCriticalityDistribution: {
      critical: 2,
      high: 11,
      medium: 76,
      low: 11,
      unscored: 0,
    },
    findingRiskDistribution: {
      critical: 12,
      high: 63,
      medium: 911,
      low: 2872,
      unscored: 0,
    },
    services: {
      logistics: {
        description: "Warehouse movement, inventory routing, and production scheduling.",
        riskScore: 49,
        riskBand: "Low",
        criticalFindings: 8,
        trend: [
          { month: "M-5", score: 51 },
          { month: "M-4", score: 48 },
          { month: "M-3", score: 47 },
          { month: "M-2", score: 46 },
          { month: "M-1", score: 45 },
          { month: "Now", score: 49 },
        ],
      },
    },
    topFindings: [
      makeFinding("mfg-1", "CVE-2023-20198", "IOS XE web UI privilege escalation", "High", 84, 92.5, true, 22),
      makeFinding("mfg-2", "CVE-2024-3400", "PAN-OS command injection", "High", 82, 91.4, true, 14),
      makeFinding("mfg-3", "CVE-2024-21412", "Internet shortcut security bypass", "Medium", 69, 82.7, false, 35),
      makeFinding("mfg-4", "CVE-2023-22518", "Confluence improper authorization", "Medium", 66, 79.2, false, 43),
      makeFinding("mfg-5", "CVE-2024-1709", "ConnectWise authentication bypass", "Medium", 63, 75.8, true, 16),
    ],
  },
};

export function getBusinessUnitDetailMockData(slug: string | null): BusinessUnitDetailMockData {
  if (slug && MOCKS[slug]) {
    return MOCKS[slug];
  }

  return {
    riskScore: 68,
    riskBand: "Medium",
    trend: DEFAULT_TREND,
    severityCounts: {
      critical: 24,
      high: 141,
      medium: 826,
      low: 1920,
    },
    assetCriticalityDistribution: {
      critical: 3,
      high: 16,
      medium: 118,
      low: 24,
      unscored: 0,
    },
    findingRiskDistribution: {
      critical: 24,
      high: 141,
      medium: 826,
      low: 1920,
      unscored: 0,
    },
    services: {},
    topFindings: [
      makeFinding("default-1", "CVE-2024-1234", "Externally exposed service vulnerability", "High", 86, 93.2, false, 19),
      makeFinding("default-2", "CVE-2023-9876", "Unpatched runtime package", "High", 81, 90.1, false, 24),
      makeFinding("default-3", "CVE-2024-4567", "Weak transport configuration", "Medium", 71, 84.3, false, 37),
      makeFinding("default-4", "CVE-2023-6543", "Legacy dependency exposure", "Medium", 64, 76.4, false, 41),
      makeFinding("default-5", "CVE-2024-2468", "Missing endpoint hardening", "Low", 42, 51.8, false, 58),
    ],
  };
}

function makeFinding(
  id: string,
  cveId: string,
  title: string,
  riskBand: string,
  riskScore: number,
  epssPercentile: number,
  isKev: boolean,
  ageInDays: number
): ScoredFinding {
  return {
    id,
    source: "mock",
    cve_id: cveId,
    display_name: title,
    status: "Open",
    lifecycle_status: "Active",
    risk_band: riskBand,
    risk_score: riskScore,
    source_risk_score: riskScore,
    cvss_score: Math.min(10, riskScore / 10),
    epss_score: epssPercentile / 100,
    epss_percentile: epssPercentile,
    isKev,
    age_in_days: ageInDays,
  };
}

import { findings as realFindings } from "./mockData";

// ── CVE Pool ─────────────────────────────────────────────────────────────────
// Used to fill in generated findings for assets that have no real entries.
const CVE_POOL = [
  // Critical
  { cveId: "CVE-2024-3094",  cvss: 10.0, severity: "Critical", title: "XZ Utils Backdoor",                      vector: "Network", remediation: "Upgrade xz-utils to 5.4.6" },
  { cveId: "CVE-2021-44228", cvss: 10.0, severity: "Critical", title: "Log4Shell (Log4j2 RCE)",                  vector: "Network", remediation: "Upgrade log4j-core to 2.17.1+" },
  { cveId: "CVE-2024-21762", cvss: 9.8,  severity: "Critical", title: "Fortinet SSL-VPN Out-of-Bounds Write",    vector: "Network", remediation: "Upgrade FortiOS to 7.4.3+" },
  { cveId: "CVE-2023-38545", cvss: 9.8,  severity: "Critical", title: "curl SOCKS5 Heap Buffer Overflow",        vector: "Network", remediation: "Upgrade curl to 8.4.0+" },
  { cveId: "CVE-2024-27198", cvss: 9.8,  severity: "Critical", title: "TeamCity Authentication Bypass",          vector: "Network", remediation: "Upgrade TeamCity to 2023.11.4" },
  { cveId: "CVE-2024-23897", cvss: 9.8,  severity: "Critical", title: "Jenkins Arbitrary File Read via CLI",     vector: "Network", remediation: "Upgrade Jenkins to 2.442+" },
  { cveId: "CVE-2024-4577",  cvss: 9.8,  severity: "Critical", title: "PHP CGI Argument Injection RCE",          vector: "Network", remediation: "Upgrade PHP 8.1 to 8.1.29+" },
  { cveId: "CVE-2019-11043", cvss: 9.8,  severity: "Critical", title: "PHP-FPM Remote Code Execution",           vector: "Network", remediation: "Upgrade PHP; reconfigure fpm" },
  { cveId: "CVE-2022-42889", cvss: 9.8,  severity: "Critical", title: "Apache Commons Text RCE",                 vector: "Network", remediation: "Upgrade commons-text to 1.10.0" },
  { cveId: "CVE-2024-1086",  cvss: 7.8,  severity: "Critical", title: "Linux Kernel nftables Use-After-Free",    vector: "Local",   remediation: "Upgrade kernel to 6.7.3+" },
  // High
  { cveId: "CVE-2024-6387",  cvss: 8.1,  severity: "High",     title: "OpenSSH RegreSSHion RCE",                 vector: "Network", remediation: "Upgrade OpenSSH to 9.8p1" },
  { cveId: "CVE-2023-46805", cvss: 8.2,  severity: "High",     title: "Ivanti Connect Secure Auth Bypass",       vector: "Network", remediation: "Apply Ivanti KB-1 patch bundle" },
  { cveId: "CVE-2024-21893", cvss: 8.2,  severity: "High",     title: "Ivanti Connect Secure SSRF",              vector: "Network", remediation: "Apply Ivanti hotfix per advisory" },
  { cveId: "CVE-2024-21626", cvss: 8.6,  severity: "High",     title: "runc Container Escape (Leaky Vessels)",   vector: "Local",   remediation: "Upgrade runc to 1.1.12; rebuild images" },
  { cveId: "CVE-2023-44487", cvss: 7.5,  severity: "High",     title: "HTTP/2 Rapid Reset DoS",                  vector: "Network", remediation: "Patch nginx/envoy; enable HTTP/2 limits" },
  { cveId: "CVE-2024-1441",  cvss: 7.8,  severity: "High",     title: "libvirt Memory Mishandling",              vector: "Local",   remediation: "Upgrade libvirt to 10.1.0+" },
  { cveId: "CVE-2024-26642", cvss: 7.8,  severity: "High",     title: "Linux Kernel netfilter OOB Write",        vector: "Local",   remediation: "Upgrade kernel to 6.8.2+" },
  { cveId: "CVE-2024-0684",  cvss: 7.5,  severity: "High",     title: "glibc Privilege Escalation",              vector: "Local",   remediation: "Upgrade glibc to 2.39+" },
  { cveId: "CVE-2024-26308", cvss: 7.5,  severity: "High",     title: "Apache Commons Compress OOM DoS",         vector: "Network", remediation: "Upgrade commons-compress to 1.26.0" },
  { cveId: "CVE-2023-51385", cvss: 6.5,  severity: "High",     title: "OpenSSH ProxyCommand Injection",          vector: "Network", remediation: "Upgrade OpenSSH to 9.6p1+" },
  { cveId: "CVE-2024-38094", cvss: 7.2,  severity: "High",     title: "Microsoft SharePoint RCE",                vector: "Network", remediation: "Apply MS July 2024 security update" },
  { cveId: "CVE-2024-30078", cvss: 8.8,  severity: "High",     title: "Windows Wi-Fi Driver RCE",                vector: "Adjacent",remediation: "Apply Windows KB5039213 update" },
  // Medium
  { cveId: "CVE-2024-2961",  cvss: 6.7,  severity: "Medium",   title: "glibc iconv Buffer Overflow",             vector: "Network", remediation: "Upgrade glibc to 2.40+" },
  { cveId: "CVE-2024-28757", cvss: 6.5,  severity: "Medium",   title: "libexpat Heap Buffer Overflow",           vector: "Network", remediation: "Upgrade libexpat to 2.6.2+" },
  { cveId: "CVE-2023-2650",  cvss: 6.5,  severity: "Medium",   title: "OpenSSL DoS via OCSP Parsing",            vector: "Network", remediation: "Upgrade OpenSSL to 3.1.1+" },
  { cveId: "CVE-2024-0553",  cvss: 5.9,  severity: "Medium",   title: "GnuTLS Timing Side-Channel",              vector: "Network", remediation: "Upgrade GnuTLS to 3.8.3+" },
  { cveId: "CVE-2023-36025", cvss: 6.5,  severity: "Medium",   title: "Windows SmartScreen Bypass",              vector: "Network", remediation: "Apply MS November 2023 update" },
  { cveId: "CVE-2024-25062", cvss: 5.5,  severity: "Medium",   title: "libxml2 Use-After-Free DoS",              vector: "Network", remediation: "Upgrade libxml2 to 2.12.5+" },
  // Low
  { cveId: "CVE-2023-52425", cvss: 3.7,  severity: "Low",      title: "libexpat Algorithmic Complexity DoS",     vector: "Network", remediation: "Upgrade libexpat to 2.6.0+" },
  { cveId: "CVE-2024-0985",  cvss: 3.1,  severity: "Low",      title: "PostgreSQL Unexpected Privilege Grant",   vector: "Network", remediation: "Upgrade PostgreSQL to 16.2+" },
  { cveId: "CVE-2023-6246",  cvss: 3.3,  severity: "Low",      title: "glibc syslog Heap Overflow",              vector: "Local",   remediation: "Upgrade glibc to 2.39-4+" },
];

const SEVERITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3, Info: 4 };
const STATUS_OPTIONS = ["Open", "Open", "Open", "In Progress", "Remediated"];

// Simple seeded PRNG (mulberry32) — deterministic per asset so UI is stable
function seededRand(seed) {
  let s = seed;
  return () => {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Hash asset id string to a number
function hashId(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Dates: random within the past 12 months
function randomDate(rand, maxDaysAgo = 365) {
  const d = new Date("2024-04-09");
  d.setDate(d.getDate() - Math.floor(rand() * maxDaysAgo));
  return d.toISOString().slice(0, 10);
}

const CVE_BY_SEV = {
  Critical: CVE_POOL.filter(c => c.severity === "Critical"),
  High:     CVE_POOL.filter(c => c.severity === "High"),
  Medium:   CVE_POOL.filter(c => c.severity === "Medium"),
  Low:      CVE_POOL.filter(c => c.severity === "Low"),
};

// ── Asset Generator ───────────────────────────────────────────────────────────

const OS_OPTIONS = [
  "Amazon Linux 2023",
  "Alpine 3.19",
  "Ubuntu 22.04",
  "Debian 12 Slim",
  "RHEL 9.1",
  "Amazon Linux 2023",
];

const REGIONS = ["us-east-1", "us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1"];

// Infer likely asset type mix from app tags
function assetTypePlan(tags = []) {
  if (tags.some(t => ["k8s","containers","fargate","ecs"].includes(t)))
    return ["Host", "Container", "Container", "ContainerImage"];
  if (tags.some(t => ["serverless","lambda"].includes(t)))
    return ["ContainerImage", "Container", "ContainerImage", "ContainerImage"];
  if (tags.some(t => ["container-images","images","supply-chain","build-pipeline"].includes(t)))
    return ["ContainerImage", "ContainerImage", "Host", "ContainerImage"];
  if (tags.some(t => ["baremetal","hypervisor"].includes(t)))
    return ["Host", "Host", "Host", "Host"];
  // default: mostly hosts with some containers
  return ["Host", "Host", "Container", "ContainerImage"];
}

function makeHostname(appName, type, index) {
  const slug = appName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "").slice(0, 20);
  const suffixes = ["prod-01", "prod-02", "prod-03", "prod-04"];
  if (type === "ContainerImage") return `${slug}-img:v${1 + index}.${index * 3}.0`;
  if (type === "Container")      return `${slug}-${Math.random().toString(36).slice(2, 7)}`; // determinism handled by seeded rand below
  return `${slug}-${suffixes[index] || `prod-0${index + 1}`}`;
}

/**
 * Generates a deterministic set of synthetic assets for an app.
 * Used when an app has no real assets in mockData.
 */
export function generateAssetsForApp(app, realAssets) {
  if (realAssets.length > 0) return realAssets;

  const rand = seededRand(hashId(app.id + "-assets"));
  const types = assetTypePlan(app.tags);
  // Show 3–5 assets depending on assetCount
  const count = app.assetCount >= 20 ? 5 : app.assetCount >= 10 ? 4 : 3;

  const totalFindings = app.findingCount;
  const totalCritical = Math.round(totalFindings * 0.08);

  return Array.from({ length: count }, (_, i) => {
    const type = types[i % types.length];
    const slug = app.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "").slice(0, 20);
    const suffixes = ["prod-01", "prod-02", "prod-03", "prod-04", "prod-05"];
    let hostname;
    if (type === "ContainerImage") hostname = `${slug}-img:v${i + 1}.${Math.floor(rand() * 9)}.0`;
    else if (type === "Container") hostname = `${slug}-${Math.floor(rand() * 0xfffff).toString(16).padStart(5,"0")}`;
    else hostname = `${slug}-${suffixes[i] || `prod-0${i+1}`}`;

    const share = 1 / count;
    const fCount = Math.round(totalFindings * share * (0.8 + rand() * 0.4));
    const cCount = Math.round(totalCritical * share * (0.8 + rand() * 0.4));

    return {
      id: `syn-${app.id}-ast-${i}`,
      appId: app.id,
      type,
      hostname,
      ip: (type === "Host" || type === "Container")
        ? `10.${Math.floor(rand() * 9) + 1}.${i + 1}.${Math.floor(rand() * 200) + 10}`
        : null,
      os: OS_OPTIONS[Math.floor(rand() * OS_OPTIONS.length)],
      cloud: "AWS",
      region: REGIONS[Math.floor(rand() * REGIONS.length)],
      findingCount: Math.max(1, fCount),
      criticalFindings: Math.max(0, Math.min(cCount, fCount)),
      _synthetic: true,
    };
  });
}

/**
 * Returns findings for an asset — real ones first, then generated to fill up to findingCount.
 */
export function getFindingsForAsset(asset) {
  const real = realFindings.filter(f => f.assetId === asset.id);
  const needed = Math.max(0, asset.findingCount - real.length);
  if (needed === 0) return real;

  const rand = seededRand(hashId(asset.id));

  // Build severity distribution from asset metadata
  const critCount  = Math.max(0, asset.criticalFindings - real.filter(f => f.severity === "Critical").length);
  const remainder  = needed - critCount;
  const highCount  = Math.round(remainder * 0.30);
  const medCount   = Math.round(remainder * 0.42);
  const lowCount   = Math.max(0, remainder - highCount - medCount);

  const plan = [
    ...Array(critCount).fill("Critical"),
    ...Array(highCount).fill("High"),
    ...Array(medCount).fill("Medium"),
    ...Array(lowCount).fill("Low"),
  ];

  const used = new Set(real.map(f => f.cveId));
  const generated = plan.map((sev, i) => {
    const pool = CVE_BY_SEV[sev] || CVE_BY_SEV.Low;
    // Pick a CVE from the pool, skipping already-used ones
    let pick;
    for (let attempt = 0; attempt < pool.length; attempt++) {
      const candidate = pool[Math.floor(rand() * pool.length)];
      if (!used.has(candidate.cveId)) { pick = candidate; break; }
    }
    if (!pick) pick = pool[Math.floor(rand() * pool.length)];
    used.add(pick.cveId);

    const firstSeen = randomDate(rand, 365);
    const lastSeenOffset = Math.floor(rand() * 30);
    const last = new Date(firstSeen);
    last.setDate(last.getDate() + lastSeenOffset);

    return {
      id: `gen-${asset.id}-${i}`,
      assetId: asset.id,
      ...pick,
      status: STATUS_OPTIONS[Math.floor(rand() * STATUS_OPTIONS.length)],
      firstSeen,
      lastSeen: last.toISOString().slice(0, 10),
    };
  });

  return [...real, ...generated].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)
  );
}

/**
 * Returns all findings across a list of assets, tagged with which asset they belong to.
 */
export function getFindingsForAssets(assetList) {
  return assetList
    .flatMap(ast => getFindingsForAsset(ast).map(f => ({ ...f, _asset: ast })))
    .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));
}

/**
 * Returns all findings for an app. If real assets exist, uses those.
 * If not, synthesizes findings directly from the app's findingCount so
 * the "All Findings" tab always has data.
 */
export function getFindingsForApp(app, realAssets) {
  if (realAssets.length > 0) {
    return getFindingsForAssets(realAssets);
  }

  // No linked assets in mock data — generate directly at the app level.
  // Split findingCount across a small number of synthetic asset buckets so
  // the hostname tags in the list are varied and realistic.
  const ASSET_TYPES = ["Host", "Container", "ContainerImage", "Host"];
  const bucketCount = Math.min(4, Math.max(1, Math.round(app.assetCount / 8)));
  const rand = seededRand(hashId(app.id));

  const buckets = Array.from({ length: bucketCount }, (_, i) => {
    const type = ASSET_TYPES[i % ASSET_TYPES.length];
    const suffix = ["east-01", "east-02", "west-01", "img-latest"][i % 4];
    const slug = app.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 18);
    return {
      id: `syn-${app.id}-${i}`,
      appId: app.id,
      type,
      hostname: type.includes("Image") ? `${slug}-img:latest` : `${slug}-${suffix}`,
      ip: type === "Host" ? `10.${Math.floor(rand() * 9) + 1}.${i + 1}.${Math.floor(rand() * 50) + 10}` : null,
      os: ["Amazon Linux 2023", "Alpine 3.19", "Ubuntu 22.04", "Debian 12 Slim"][i % 4],
      cloud: "AWS",
      region: ["us-east-1", "us-west-2", "eu-west-1"][i % 3],
      // Distribute findings and criticals across buckets
      findingCount: Math.round(app.findingCount / bucketCount),
      criticalFindings: Math.round((app.findingCount * 0.08) / bucketCount),
    };
  });

  return getFindingsForAssets(buckets);
}

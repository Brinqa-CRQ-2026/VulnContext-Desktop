// ─── Hierarchy ─────────────────────────────────────────────────────────────
// Company → Business Unit → Business Service → Application → Asset → Finding

// ── Companies ──────────────────────────────────────────────────────────────
export const companies = [
  {
    id: "co-001",
    name: "Amazon, Inc.",
    industry: "Retail & Marketplace",
    riskScore: 81,
    buCount: 3,
    serviceCount: 8,
    assetCount: 1840,
    findingCount: 4312,
    criticalCount: 94,
  },
  {
    id: "co-002",
    name: "Amazon Web Services",
    industry: "Cloud Infrastructure",
    riskScore: 73,
    buCount: 3,
    serviceCount: 7,
    assetCount: 3620,
    findingCount: 6841,
    criticalCount: 128,
  },
  {
    id: "co-003",
    name: "Amazon Prime & Media",
    industry: "Streaming & Devices",
    riskScore: 66,
    buCount: 3,
    serviceCount: 6,
    assetCount: 980,
    findingCount: 2103,
    criticalCount: 41,
  },
];

// Monthly risk score history per company (oldest → newest, Oct–Apr)
export const companyRiskHistory = {
  "co-001": [
    { month: "Oct", score: 64 },
    { month: "Nov", score: 68 },
    { month: "Dec", score: 72 },
    { month: "Jan", score: 76 },
    { month: "Feb", score: 74 },
    { month: "Mar", score: 79 },
    { month: "Apr", score: 81 },
  ],
  "co-002": [
    { month: "Oct", score: 82 },
    { month: "Nov", score: 79 },
    { month: "Dec", score: 76 },
    { month: "Jan", score: 74 },
    { month: "Feb", score: 72 },
    { month: "Mar", score: 71 },
    { month: "Apr", score: 73 },
  ],
  "co-003": [
    { month: "Oct", score: 58 },
    { month: "Nov", score: 61 },
    { month: "Dec", score: 63 },
    { month: "Jan", score: 65 },
    { month: "Feb", score: 64 },
    { month: "Mar", score: 67 },
    { month: "Apr", score: 66 },
  ],
};

// ── Business Units ──────────────────────────────────────────────────────────
export const businessUnits = [
  // Amazon, Inc.
  { id: "bu-001", coId: "co-001", name: "Retail & Marketplace",  riskScore: 88, serviceCount: 3, assetCount: 820,  findingCount: 2104 },
  { id: "bu-002", coId: "co-001", name: "Amazon Fresh & Grocery", riskScore: 71, serviceCount: 2, assetCount: 430,  findingCount: 941  },
  { id: "bu-003", coId: "co-001", name: "Amazon Advertising",     riskScore: 76, serviceCount: 2, assetCount: 590,  findingCount: 1267 },
  // AWS
  { id: "bu-004", coId: "co-002", name: "Compute & Serverless",   riskScore: 79, serviceCount: 2, assetCount: 1400, findingCount: 2812 },
  { id: "bu-005", coId: "co-002", name: "Data & Storage",         riskScore: 68, serviceCount: 2, assetCount: 1100, findingCount: 2204 },
  { id: "bu-006", coId: "co-002", name: "Security & Networking",  riskScore: 91, serviceCount: 2, assetCount: 1120, findingCount: 1825 },
  // Prime & Media
  { id: "bu-007", coId: "co-003", name: "Prime Video",            riskScore: 72, serviceCount: 2, assetCount: 480,  findingCount: 1012 },
  { id: "bu-008", coId: "co-003", name: "Alexa & Echo Devices",   riskScore: 63, serviceCount: 2, assetCount: 310,  findingCount: 701  },
  { id: "bu-009", coId: "co-003", name: "Ring & Smart Home",      riskScore: 84, serviceCount: 2, assetCount: 190,  findingCount: 390  },
];

// ── Business Services ────────────────────────────────────────────────────────
export const businessServices = [
  // Retail & Marketplace (bu-001)
  { id: "bs-001", buId: "bu-001", name: "Amazon.com Storefront",    riskScore: 84, appCount: 4, assetCount: 280, findingCount: 712, env: "Production" },
  { id: "bs-002", buId: "bu-001", name: "Order & Checkout",         riskScore: 93, appCount: 3, assetCount: 210, findingCount: 831, env: "Production" },
  { id: "bs-003", buId: "bu-001", name: "Amazon Marketplace",       riskScore: 87, appCount: 3, assetCount: 330, findingCount: 561, env: "Production" },
  // Fresh & Grocery (bu-002)
  { id: "bs-004", buId: "bu-002", name: "Fresh Grocery Delivery",   riskScore: 74, appCount: 3, assetCount: 240, findingCount: 512, env: "Production" },
  { id: "bs-005", buId: "bu-002", name: "Whole Foods Online",       riskScore: 66, appCount: 2, assetCount: 190, findingCount: 429, env: "Production" },
  // Advertising (bu-003)
  { id: "bs-006", buId: "bu-003", name: "Sponsored Products",       riskScore: 79, appCount: 3, assetCount: 310, findingCount: 688, env: "Production" },
  { id: "bs-007", buId: "bu-003", name: "DSP & Programmatic Ads",   riskScore: 72, appCount: 2, assetCount: 280, findingCount: 579, env: "Production" },
  // Compute (bu-004)
  { id: "bs-008", buId: "bu-004", name: "EC2 & Auto Scaling",       riskScore: 82, appCount: 4, assetCount: 760, findingCount: 1604, env: "Production" },
  { id: "bs-009", buId: "bu-004", name: "Lambda & Fargate",         riskScore: 75, appCount: 3, assetCount: 640, findingCount: 1208, env: "Production" },
  // Data & Storage (bu-005)
  { id: "bs-010", buId: "bu-005", name: "S3 & Glacier",             riskScore: 61, appCount: 2, assetCount: 520, findingCount: 902, env: "Production" },
  { id: "bs-011", buId: "bu-005", name: "RDS, Aurora & DynamoDB",   riskScore: 74, appCount: 3, assetCount: 580, findingCount: 1302, env: "Production" },
  // Security & Networking (bu-006)
  { id: "bs-012", buId: "bu-006", name: "IAM & Identity Center",    riskScore: 96, appCount: 3, assetCount: 540, findingCount: 1102, env: "Production" },
  { id: "bs-013", buId: "bu-006", name: "VPC, CloudFront & Shield", riskScore: 85, appCount: 2, assetCount: 580, findingCount: 723, env: "Production" },
  // Prime Video (bu-007)
  { id: "bs-014", buId: "bu-007", name: "Video Streaming Platform", riskScore: 75, appCount: 3, assetCount: 280, findingCount: 602, env: "Production" },
  { id: "bs-015", buId: "bu-007", name: "Content Ingestion Pipeline",riskScore: 68, appCount: 2, assetCount: 200, findingCount: 410, env: "Production" },
  // Alexa (bu-008)
  { id: "bs-016", buId: "bu-008", name: "Alexa Voice Service",      riskScore: 66, appCount: 3, assetCount: 180, findingCount: 421, env: "Production" },
  { id: "bs-017", buId: "bu-008", name: "Fire TV Platform",         riskScore: 59, appCount: 2, assetCount: 130, findingCount: 280, env: "Production" },
  // Ring (bu-009)
  { id: "bs-018", buId: "bu-009", name: "Ring Doorbell & Cameras",  riskScore: 87, appCount: 3, assetCount: 110, findingCount: 241, env: "Production" },
  { id: "bs-019", buId: "bu-009", name: "Ring Alarm & Monitoring",  riskScore: 80, appCount: 2, assetCount: 80,  findingCount: 149, env: "Production" },
];

// ── Applications ─────────────────────────────────────────────────────────────
export const applications = [
  // bs-001 — Amazon.com Storefront
  { id: "app-001", bsId: "bs-001", name: "Product Search & Indexer",    env: "production", riskScore: 78, assetCount: 42, findingCount: 168, tags: ["search","elasticsearch"] },
  { id: "app-002", bsId: "bs-001", name: "Product Detail Page (PDP)",   env: "production", riskScore: 72, assetCount: 31, findingCount: 114, tags: ["frontend","react"] },
  { id: "app-003", bsId: "bs-001", name: "Recommendation Engine",       env: "production", riskScore: 80, assetCount: 38, findingCount: 201, tags: ["ml","personalization"] },
  { id: "app-004", bsId: "bs-001", name: "Customer Reviews Platform",   env: "production", riskScore: 65, assetCount: 24, findingCount: 91, tags: ["pii","moderation"] },
  // bs-002 — Order & Checkout
  { id: "app-005", bsId: "bs-002", name: "Shopping Cart Service",       env: "production", riskScore: 88, assetCount: 36, findingCount: 274, tags: ["session","redis"] },
  { id: "app-006", bsId: "bs-002", name: "Payment Processing",          env: "production", riskScore: 97, assetCount: 28, findingCount: 341, tags: ["pci","critical","tokenization"] },
  { id: "app-007", bsId: "bs-002", name: "Fraud Detection Engine",      env: "production", riskScore: 83, assetCount: 22, findingCount: 216, tags: ["ml","finance","realtime"] },
  // bs-003 — Marketplace
  { id: "app-008", bsId: "bs-003", name: "Seller Central Portal",       env: "production", riskScore: 85, assetCount: 44, findingCount: 203, tags: ["pii","seller-data"] },
  { id: "app-009", bsId: "bs-003", name: "Product Listing API",         env: "production", riskScore: 77, assetCount: 38, findingCount: 188, tags: ["api","catalog"] },
  { id: "app-010", bsId: "bs-003", name: "Fulfillment by Amazon (FBA)", env: "production", riskScore: 69, assetCount: 31, findingCount: 170, tags: ["logistics","warehouse"] },
  // bs-004 — Fresh Grocery
  { id: "app-011", bsId: "bs-004", name: "Fresh Order Routing",         env: "production", riskScore: 76, assetCount: 28, findingCount: 189, tags: ["logistics","realtime"] },
  { id: "app-012", bsId: "bs-004", name: "Delivery Route Optimizer",    env: "production", riskScore: 70, assetCount: 22, findingCount: 141, tags: ["geolocation","maps"] },
  { id: "app-013", bsId: "bs-004", name: "Inventory Management",        env: "production", riskScore: 63, assetCount: 18, findingCount: 103, tags: ["warehouse","erp"] },
  // bs-006 — Sponsored Products
  { id: "app-014", bsId: "bs-006", name: "Ads Bidding Engine",          env: "production", riskScore: 82, assetCount: 48, findingCount: 312, tags: ["realtime","high-throughput"] },
  { id: "app-015", bsId: "bs-006", name: "Campaign Manager",            env: "production", riskScore: 74, assetCount: 34, findingCount: 218, tags: ["advertiser-pii"] },
  { id: "app-016", bsId: "bs-006", name: "Attribution & Reporting",     env: "production", riskScore: 67, assetCount: 26, findingCount: 158, tags: ["analytics","reporting"] },
  // bs-008 — EC2 & Auto Scaling
  { id: "app-017", bsId: "bs-008", name: "EC2 Hypervisor Management",   env: "production", riskScore: 91, assetCount: 180, findingCount: 642, tags: ["hypervisor","critical","baremetal"] },
  { id: "app-018", bsId: "bs-008", name: "Auto Scaling Controller",     env: "production", riskScore: 78, assetCount: 140, findingCount: 489, tags: ["orchestration","k8s"] },
  { id: "app-019", bsId: "bs-008", name: "EC2 Instance Metadata Svc",   env: "production", riskScore: 96, assetCount: 120, findingCount: 312, tags: ["imds","ssrf-surface","critical"] },
  { id: "app-020", bsId: "bs-008", name: "Amazon Machine Image (AMI) Builder", env: "production", riskScore: 74, assetCount: 80, findingCount: 161, tags: ["images","build-pipeline"] },
  // bs-009 — Lambda & Fargate
  { id: "app-021", bsId: "bs-009", name: "Lambda Execution Runtime",    env: "production", riskScore: 77, assetCount: 200, findingCount: 441, tags: ["serverless","containers"] },
  { id: "app-022", bsId: "bs-009", name: "Fargate Task Orchestrator",   env: "production", riskScore: 80, assetCount: 190, findingCount: 512, tags: ["ecs","fargate","containers"] },
  { id: "app-023", bsId: "bs-009", name: "Container Registry (ECR)",    env: "production", riskScore: 85, assetCount: 120, findingCount: 255, tags: ["container-images","supply-chain"] },
  // bs-011 — RDS, Aurora & DynamoDB
  { id: "app-024", bsId: "bs-011", name: "RDS Multi-AZ Fleet",          env: "production", riskScore: 72, assetCount: 210, findingCount: 502, tags: ["postgres","mysql","pii"] },
  { id: "app-025", bsId: "bs-011", name: "Aurora Serverless v2",        env: "production", riskScore: 68, assetCount: 190, findingCount: 448, tags: ["aurora","serverless"] },
  { id: "app-026", bsId: "bs-011", name: "DynamoDB Control Plane",      env: "production", riskScore: 79, assetCount: 180, findingCount: 352, tags: ["nosql","high-throughput"] },
  // bs-012 — IAM & Identity Center
  { id: "app-027", bsId: "bs-012", name: "IAM Policy Engine",           env: "production", riskScore: 98, assetCount: 160, findingCount: 421, tags: ["iam","critical","privilege-escalation"] },
  { id: "app-028", bsId: "bs-012", name: "AWS SSO / Identity Center",   env: "production", riskScore: 91, assetCount: 140, findingCount: 381, tags: ["sso","saml","okta"] },
  { id: "app-029", bsId: "bs-012", name: "AWS Cognito",                  env: "production", riskScore: 76, assetCount: 120, findingCount: 300, tags: ["oauth","user-pools","mfa"] },
  // bs-013 — VPC, CloudFront & Shield
  { id: "app-030", bsId: "bs-013", name: "CloudFront CDN",              env: "production", riskScore: 77, assetCount: 220, findingCount: 312, tags: ["cdn","tls","edge"] },
  { id: "app-031", bsId: "bs-013", name: "AWS Shield Advanced",         env: "production", riskScore: 83, assetCount: 180, findingCount: 274, tags: ["ddos","waf","critical"] },
  // bs-014 — Video Streaming
  { id: "app-032", bsId: "bs-014", name: "Video Transcode Pipeline",    env: "production", riskScore: 71, assetCount: 88, findingCount: 204, tags: ["ffmpeg","media","gpu"] },
  { id: "app-033", bsId: "bs-014", name: "Adaptive Bitrate Streaming",  env: "production", riskScore: 66, assetCount: 72, findingCount: 178, tags: ["hls","dash","cdn"] },
  { id: "app-034", bsId: "bs-014", name: "Viewer Auth & Entitlement",   env: "production", riskScore: 81, assetCount: 61, findingCount: 220, tags: ["drm","pii","subscriptions"] },
  // bs-016 — Alexa Voice
  { id: "app-035", bsId: "bs-016", name: "Alexa NLU & ASR Engine",      env: "production", riskScore: 68, assetCount: 62, findingCount: 198, tags: ["ml","audio-data","pii"] },
  { id: "app-036", bsId: "bs-016", name: "Alexa Skills Kit (ASK)",      env: "production", riskScore: 72, assetCount: 48, findingCount: 141, tags: ["third-party","oauth"] },
  { id: "app-037", bsId: "bs-016", name: "Alexa Guard & Home Monitor",  env: "production", riskScore: 80, assetCount: 40, findingCount: 82, tags: ["audio","home-security","pii"] },
  // bs-018 — Ring Cameras
  { id: "app-038", bsId: "bs-018", name: "Ring Video Cloud Storage",    env: "production", riskScore: 89, assetCount: 44, findingCount: 132, tags: ["video","pii","s3","home-security"] },
  { id: "app-039", bsId: "bs-018", name: "Ring Mobile API Gateway",     env: "production", riskScore: 85, assetCount: 36, findingCount: 109, tags: ["api","oauth","mobile"] },
  { id: "app-040", bsId: "bs-019", name: "Ring Alarm Control Panel Svc",env: "production", riskScore: 83, assetCount: 30, findingCount: 96, tags: ["alarm","iot","critical"] },
];

// ── Assets ────────────────────────────────────────────────────────────────────
export const assets = [
  // app-006 — Payment Processing
  { id: "ast-001", appId: "app-006", type: "Host",           hostname: "pay-proc-prod-east-01",    ip: "10.10.1.11", os: "Amazon Linux 2023", cloud: "AWS", region: "us-east-1",   criticalFindings: 9,  findingCount: 48 },
  { id: "ast-002", appId: "app-006", type: "Host",           hostname: "pay-proc-prod-east-02",    ip: "10.10.1.12", os: "Amazon Linux 2023", cloud: "AWS", region: "us-east-1",   criticalFindings: 7,  findingCount: 41 },
  { id: "ast-003", appId: "app-006", type: "ContainerImage", hostname: "payment-svc-img:v4.2.1",   ip: null,          os: "Alpine 3.19",       cloud: "AWS", region: "us-east-1",   criticalFindings: 5,  findingCount: 34 },
  { id: "ast-004", appId: "app-006", type: "Container",      hostname: "tokenizer-7f4d9",           ip: "172.31.8.4",  os: "Alpine 3.19",       cloud: "AWS", region: "us-east-1",   criticalFindings: 4,  findingCount: 28 },
  // app-019 — EC2 Instance Metadata Service
  { id: "ast-005", appId: "app-019", type: "Host",           hostname: "imds-proxy-prod-1a",        ip: "10.0.0.254",  os: "Amazon Linux 2023", cloud: "AWS", region: "us-east-1",   criticalFindings: 11, findingCount: 62 },
  { id: "ast-006", appId: "app-019", type: "Host",           hostname: "imds-proxy-prod-1b",        ip: "10.0.1.254",  os: "Amazon Linux 2023", cloud: "AWS", region: "us-east-1",   criticalFindings: 8,  findingCount: 55 },
  // app-027 — IAM Policy Engine
  { id: "ast-007", appId: "app-027", type: "Host",           hostname: "iam-policy-svc-east-01",   ip: "10.1.0.10",   os: "Amazon Linux 2023", cloud: "AWS", region: "us-east-1",   criticalFindings: 12, findingCount: 71 },
  { id: "ast-008", appId: "app-027", type: "ContainerImage", hostname: "iam-evaluator-img:v2.9.0", ip: null,          os: "Distroless/java17",  cloud: "AWS", region: "us-east-1",   criticalFindings: 6,  findingCount: 39 },
  // app-005 — Shopping Cart
  { id: "ast-009", appId: "app-005", type: "Host",           hostname: "cart-redis-prod-01",        ip: "10.10.2.20",  os: "Amazon Linux 2023", cloud: "AWS", region: "us-east-1",   criticalFindings: 3,  findingCount: 22 },
  { id: "ast-010", appId: "app-005", type: "Container",      hostname: "cart-api-5f8bc",            ip: "172.31.9.5",  os: "Alpine 3.18",       cloud: "AWS", region: "us-east-1",   criticalFindings: 2,  findingCount: 17 },
  // app-023 — ECR
  { id: "ast-011", appId: "app-023", type: "ContainerImage", hostname: "ecr-scanner-base:latest",  ip: null,          os: "Ubuntu 22.04",      cloud: "AWS", region: "us-east-1",   criticalFindings: 7,  findingCount: 44 },
  { id: "ast-012", appId: "app-023", type: "ContainerImage", hostname: "node-runtime-img:18-slim",  ip: null,          os: "Debian 12 Slim",    cloud: "AWS", region: "us-west-2",   criticalFindings: 4,  findingCount: 29 },
  // app-038 — Ring Video Storage
  { id: "ast-013", appId: "app-038", type: "Host",           hostname: "ring-storage-prod-01",      ip: "10.5.0.10",   os: "Ubuntu 22.04",      cloud: "AWS", region: "us-west-2",   criticalFindings: 5,  findingCount: 38 },
  { id: "ast-014", appId: "app-038", type: "ContainerImage", hostname: "ring-video-proc-img:v3.1", ip: null,          os: "Alpine 3.18",       cloud: "AWS", region: "us-west-2",   criticalFindings: 3,  findingCount: 21 },
  // app-032 — Video Transcode
  { id: "ast-015", appId: "app-032", type: "Host",           hostname: "transcode-gpu-prod-01",     ip: "10.3.0.20",   os: "Ubuntu 22.04",      cloud: "AWS", region: "us-east-1",   criticalFindings: 2,  findingCount: 19 },
  { id: "ast-016", appId: "app-032", type: "ContainerImage", hostname: "ffmpeg-worker-img:v5.1",   ip: null,          os: "Alpine 3.19",       cloud: "AWS", region: "us-east-1",   criticalFindings: 1,  findingCount: 12 },
  // app-017 — EC2 Hypervisor
  { id: "ast-017", appId: "app-017", type: "Host",           hostname: "hypervisor-nitro-east-01", ip: "10.0.2.10",   os: "Amazon Linux 2023", cloud: "AWS", region: "us-east-1",   criticalFindings: 8,  findingCount: 52 },
  { id: "ast-018", appId: "app-017", type: "Host",           hostname: "hypervisor-nitro-west-01", ip: "10.0.3.10",   os: "Amazon Linux 2023", cloud: "AWS", region: "us-west-2",   criticalFindings: 6,  findingCount: 44 },
  // app-035 — Alexa NLU
  { id: "ast-019", appId: "app-035", type: "Host",           hostname: "alexa-nlu-prod-east-01",   ip: "10.4.0.30",   os: "Amazon Linux 2023", cloud: "AWS", region: "us-east-1",   criticalFindings: 1,  findingCount: 14 },
  { id: "ast-020", appId: "app-035", type: "ContainerImage", hostname: "alexa-asr-model-img:v7",  ip: null,          os: "Ubuntu 22.04",      cloud: "AWS", region: "us-east-1",   criticalFindings: 0,  findingCount: 8  },
];

// ── Findings ──────────────────────────────────────────────────────────────────
export const findings = [
  // ast-007 — IAM Policy Engine host (most critical)
  { id: "fnd-001", assetId: "ast-007", cveId: "CVE-2024-3094",  cvss: 10.0, severity: "Critical", title: "XZ Utils Backdoor",                    status: "Open",        firstSeen: "2024-03-29", lastSeen: "2024-04-09", vector: "Network", remediation: "Upgrade xz-utils to 5.4.6 immediately" },
  { id: "fnd-002", assetId: "ast-007", cveId: "CVE-2024-27198", cvss: 9.8,  severity: "Critical", title: "TeamCity Authentication Bypass",        status: "Open",        firstSeen: "2024-03-04", lastSeen: "2024-04-09", vector: "Network", remediation: "Upgrade JetBrains TeamCity to 2023.11.4" },
  { id: "fnd-003", assetId: "ast-007", cveId: "CVE-2023-44487", cvss: 7.5,  severity: "High",     title: "HTTP/2 Rapid Reset DoS",               status: "In Progress", firstSeen: "2024-01-10", lastSeen: "2024-04-09", vector: "Network", remediation: "Patch nginx / envoy to latest; enable HTTP/2 limits" },
  { id: "fnd-004", assetId: "ast-007", cveId: "CVE-2024-1086",  cvss: 7.8,  severity: "High",     title: "Linux Kernel nftables Use-After-Free",  status: "Open",        firstSeen: "2024-01-31", lastSeen: "2024-04-09", vector: "Local",   remediation: "Upgrade kernel to 6.7.3+" },
  // ast-001 — Payment Processing host
  { id: "fnd-005", assetId: "ast-001", cveId: "CVE-2024-21762", cvss: 9.8,  severity: "Critical", title: "Fortinet SSL-VPN Out-of-Bounds Write",  status: "Open",        firstSeen: "2024-02-08", lastSeen: "2024-04-09", vector: "Network", remediation: "Upgrade FortiOS to 7.4.3 or 7.2.7+" },
  { id: "fnd-006", assetId: "ast-001", cveId: "CVE-2024-6387",  cvss: 8.1,  severity: "High",     title: "OpenSSH RegreSSHion RCE",               status: "Open",        firstSeen: "2024-07-01", lastSeen: "2024-04-09", vector: "Network", remediation: "Upgrade OpenSSH to 9.8p1" },
  { id: "fnd-007", assetId: "ast-001", cveId: "CVE-2023-46805", cvss: 8.2,  severity: "High",     title: "Ivanti Connect Secure Auth Bypass",     status: "In Progress", firstSeen: "2024-01-15", lastSeen: "2024-04-09", vector: "Network", remediation: "Apply Ivanti KB-1 patch bundle" },
  // ast-003 — Payment ContainerImage
  { id: "fnd-008", assetId: "ast-003", cveId: "CVE-2023-38545", cvss: 9.8,  severity: "Critical", title: "curl SOCKS5 Heap Buffer Overflow",      status: "Remediated",  firstSeen: "2023-10-11", lastSeen: "2024-03-01", vector: "Network", remediation: "Upgrade curl to 8.4.0+" },
  { id: "fnd-009", assetId: "ast-003", cveId: "CVE-2024-23897", cvss: 9.8,  severity: "Critical", title: "Jenkins Arbitrary File Read via CLI",   status: "Open",        firstSeen: "2024-01-24", lastSeen: "2024-04-09", vector: "Network", remediation: "Upgrade Jenkins to 2.442+" },
  // ast-005 — IMDS Proxy host
  { id: "fnd-010", assetId: "ast-005", cveId: "CVE-2019-11043", cvss: 9.8,  severity: "Critical", title: "PHP-FPM Remote Code Execution",         status: "Open",        firstSeen: "2024-02-12", lastSeen: "2024-04-09", vector: "Network", remediation: "Upgrade PHP to 7.4.26+; configure fpm properly" },
  { id: "fnd-011", assetId: "ast-005", cveId: "CVE-2024-21893", cvss: 8.2,  severity: "High",     title: "Ivanti Connect Secure SSRF",            status: "Open",        firstSeen: "2024-01-31", lastSeen: "2024-04-09", vector: "Network", remediation: "Apply Ivanti hotfix as per advisory" },
  { id: "fnd-012", assetId: "ast-005", cveId: "CVE-2024-4577",  cvss: 9.8,  severity: "Critical", title: "PHP CGI Argument Injection RCE",        status: "Open",        firstSeen: "2024-06-07", lastSeen: "2024-04-09", vector: "Network", remediation: "Upgrade PHP 8.1 to 8.1.29; PHP 8.2 to 8.2.20" },
  // ast-008 — IAM ContainerImage
  { id: "fnd-013", assetId: "ast-008", cveId: "CVE-2022-42889", cvss: 9.8,  severity: "Critical", title: "Apache Commons Text StringSubstitutor RCE", status: "Remediated", firstSeen: "2023-11-01", lastSeen: "2024-02-15", vector: "Network", remediation: "Upgrade commons-text to 1.10.0" },
  { id: "fnd-014", assetId: "ast-008", cveId: "CVE-2021-44228", cvss: 10.0, severity: "Critical", title: "Log4Shell Log4j RCE (Log4j2)",           status: "Remediated",  firstSeen: "2021-12-10", lastSeen: "2024-01-10", vector: "Network", remediation: "Upgrade log4j-core to 2.17.1+" },
  { id: "fnd-015", assetId: "ast-008", cveId: "CVE-2024-26308", cvss: 7.5,  severity: "High",     title: "Apache Commons Compress OOM DoS",        status: "Open",        firstSeen: "2024-02-19", lastSeen: "2024-04-09", vector: "Network", remediation: "Upgrade commons-compress to 1.26.0" },
  // ast-011 — ECR Base Image
  { id: "fnd-016", assetId: "ast-011", cveId: "CVE-2024-21626", cvss: 8.6,  severity: "High",     title: "runc Container Escape (Leaky Vessels)", status: "Open",        firstSeen: "2024-01-31", lastSeen: "2024-04-09", vector: "Local",   remediation: "Upgrade runc to 1.1.12; rebuild all images" },
  { id: "fnd-017", assetId: "ast-011", cveId: "CVE-2023-2650",  cvss: 6.5,  severity: "Medium",   title: "OpenSSL DoS via OCSP Response Parsing", status: "Open",        firstSeen: "2024-01-20", lastSeen: "2024-04-08", vector: "Network", remediation: "Upgrade OpenSSL to 3.1.1+" },
  // ast-013 — Ring Video Storage
  { id: "fnd-018", assetId: "ast-013", cveId: "CVE-2024-0684",  cvss: 7.5,  severity: "High",     title: "glibc Privilege Escalation",            status: "Open",        firstSeen: "2024-03-15", lastSeen: "2024-04-09", vector: "Local",   remediation: "Upgrade glibc to 2.39+" },
  { id: "fnd-019", assetId: "ast-013", cveId: "CVE-2023-51385", cvss: 6.5,  severity: "Medium",   title: "OpenSSH ProxyCommand Injection",         status: "In Progress", firstSeen: "2024-01-25", lastSeen: "2024-04-09", vector: "Network", remediation: "Upgrade OpenSSH to 9.6p1+" },
  // ast-017 — Hypervisor
  { id: "fnd-020", assetId: "ast-017", cveId: "CVE-2024-1441",  cvss: 7.8,  severity: "High",     title: "libvirt Memory Mishandling",            status: "Open",        firstSeen: "2024-02-28", lastSeen: "2024-04-09", vector: "Local",   remediation: "Upgrade libvirt to 10.1.0+" },
  { id: "fnd-021", assetId: "ast-017", cveId: "CVE-2024-26642", cvss: 7.8,  severity: "High",     title: "Linux Kernel netfilter OOB Write",      status: "Open",        firstSeen: "2024-03-26", lastSeen: "2024-04-09", vector: "Local",   remediation: "Upgrade kernel to 6.8.2+" },
];

// ── Severity metadata ────────────────────────────────────────────────────────
export const severityColors = {
  Critical: "#ef4444",
  High:     "#f97316",
  Medium:   "#eab308",
  Low:      "#3b82f6",
  Info:     "#6b7280",
};

export const assetTypeColors = {
  Host:           "#6366f1",
  Container:      "#22d3ee",
  HostImage:      "#a78bfa",
  ContainerImage: "#34d399",
};

export interface BusinessServiceRecord {
  id: string;
  slug: string;
  businessService: string;
  businessUnit: string;
  company: string;
  affectedAssets: number;
  openFindings: number;
}

export interface CompanyBusinessUnitRecord {
  slug: string;
  company: string;
  businessUnits: string[];
  services: BusinessServiceRecord[];
  totalAffectedAssets: number;
  totalOpenFindings: number;
}

export const businessServicesMockData: BusinessServiceRecord[] = [
  {
    id: "digital-media",
    slug: "digital-media",
    businessService: "Digital Media",
    businessUnit: "Online Store",
    company: "Virtuon",
    affectedAssets: 248,
    openFindings: 5310,
  },
  {
    id: "digital-storefront",
    slug: "digital-storefront",
    businessService: "Digital Storefront",
    businessUnit: "Online Store",
    company: "Virtuon",
    affectedAssets: 196,
    openFindings: 4312,
  },
  {
    id: "logistics",
    slug: "logistics",
    businessService: "Logistics",
    businessUnit: "Manufacturing",
    company: "Cyberdyne Systems",
    affectedAssets: 118,
    openFindings: 2172,
  },
  {
    id: "manufacturing-shop",
    slug: "manufacturing-shop",
    businessService: "Manufacturing Shop",
    businessUnit: "Manufacturing",
    company: "Cyberdyne Systems",
    affectedAssets: 104,
    openFindings: 1929,
  },
  {
    id: "shipping-and-tracking",
    slug: "shipping-and-tracking",
    businessService: "Shipping and Tracking",
    businessUnit: "Online Store",
    company: "Virtuon",
    affectedAssets: 93,
    openFindings: 1582,
  },
];

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function getCompanyBusinessUnitRecords(
  services: BusinessServiceRecord[] = businessServicesMockData
): CompanyBusinessUnitRecord[] {
  const grouped = new Map<string, CompanyBusinessUnitRecord>();

  for (const service of services) {
    const slug = slugify(service.company);
    const existing = grouped.get(slug);

    if (existing) {
      existing.services.push(service);
      if (!existing.businessUnits.includes(service.businessUnit)) {
        existing.businessUnits.push(service.businessUnit);
      }
      existing.totalAffectedAssets += service.affectedAssets;
      existing.totalOpenFindings += service.openFindings;
      continue;
    }

    grouped.set(slug, {
      slug,
      company: service.company,
      businessUnits: [service.businessUnit],
      services: [service],
      totalAffectedAssets: service.affectedAssets,
      totalOpenFindings: service.openFindings,
    });
  }

  return [...grouped.values()].sort(
    (left, right) => right.totalOpenFindings - left.totalOpenFindings
  );
}

export function getCompanyBusinessUnitBySlug(slug: string | null) {
  if (!slug) {
    return null;
  }

  return getCompanyBusinessUnitRecords().find((record) => record.slug === slug) ?? null;
}

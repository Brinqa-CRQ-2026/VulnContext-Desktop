export interface BusinessServicePageMockData {
  serviceRiskScore: string;
  businessCriticality: string;
}

const PAGE_MOCKS: Record<string, BusinessServicePageMockData> = {
  "digital-storefront": {
    serviceRiskScore: "9.2",
    businessCriticality: "4/5",
  },
  logistics: {
    serviceRiskScore: "7.8",
    businessCriticality: "5/5",
  },
};

export function getBusinessServicePageMockData(
  businessServiceSlug: string | null
): BusinessServicePageMockData {
  if (businessServiceSlug && PAGE_MOCKS[businessServiceSlug]) {
    return PAGE_MOCKS[businessServiceSlug];
  }

  return {
    serviceRiskScore: "8.4",
    businessCriticality: "4/5",
  };
}

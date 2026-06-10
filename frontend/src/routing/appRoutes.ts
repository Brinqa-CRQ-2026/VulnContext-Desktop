import type { FindingRouteOrigin } from "../types";

export type BasePage = "findings" | "integrations" | "business-services" | "controls";

export type AppRoute = {
  page: BasePage;
  findingId: string | null;
  findingOrigin: FindingRouteOrigin | null;
  businessUnitSlug: string | null;
  businessServiceSlug: string | null;
  applicationSlug: string | null;
  assetId: string | null;
};

export function getEmptyRoute(page: BasePage): AppRoute {
  return {
    page,
    findingId: null,
    findingOrigin: null,
    businessUnitSlug: null,
    businessServiceSlug: null,
    applicationSlug: null,
    assetId: null,
  };
}

export function readHistoryFindingOrigin(): FindingRouteOrigin | null {
  const state = window.history.state;
  if (!state || typeof state !== "object" || !("findingOrigin" in state)) {
    return null;
  }

  const origin = (state as { findingOrigin?: unknown }).findingOrigin;
  if (!origin || typeof origin !== "object") {
    return null;
  }

  const mode = (origin as { mode?: unknown }).mode;
  if (mode !== "global" && mode !== "asset") {
    return null;
  }

  return origin as FindingRouteOrigin;
}

export function parsePathRoute(pathname: string): AppRoute | null {
  const parts = pathname.split("/").filter(Boolean);

  if (parts.length === 0) {
    return getEmptyRoute("business-services");
  }

  if (parts[0] === "business-services") {
    const baseRoute = getEmptyRoute("business-services");

    if (parts.length === 1) {
      return baseRoute;
    }
    if (parts.length === 2) {
      return { ...baseRoute, businessUnitSlug: parts[1] };
    }
    if (parts.length === 3) {
      return {
        ...baseRoute,
        businessUnitSlug: parts[1],
        businessServiceSlug: parts[2],
      };
    }
    if (parts.length === 6 && parts[3] === "assets" && parts[5] === "findings") {
      return {
        ...baseRoute,
        businessUnitSlug: parts[1],
        businessServiceSlug: parts[2],
        assetId: parts[4],
      };
    }
    if (parts.length === 4) {
      return {
        ...baseRoute,
        businessUnitSlug: parts[1],
        businessServiceSlug: parts[2],
        applicationSlug: parts[3],
      };
    }
    if (parts.length === 7 && parts[4] === "assets" && parts[6] === "findings") {
      return {
        ...baseRoute,
        businessUnitSlug: parts[1],
        businessServiceSlug: parts[2],
        applicationSlug: parts[3],
        assetId: parts[5],
      };
    }
  }

  return null;
}

export function parseHashRoute(): AppRoute {
  const hash = (window.location.hash || "").replace(/^#/, "");
  if (!hash) {
    return parsePathRoute(window.location.pathname) ?? getEmptyRoute("business-services");
  }
  const parts = hash.split("/").filter(Boolean);

  if (parts[0] === "findings") {
    const id = parts[1]?.trim() || null;
    return {
      ...getEmptyRoute("findings"),
      findingId: id,
      findingOrigin: readHistoryFindingOrigin(),
    };
  }
  if (parts[0] === "integrations") {
    return getEmptyRoute("integrations");
  }
  if (parts[0] === "controls") {
    return getEmptyRoute("controls");
  }
  return parsePathRoute(`/${hash}`) ?? getEmptyRoute("findings");
}

export function writeHashRoute(route: AppRoute) {
  const useHttpPathRouting =
    window.location.protocol.startsWith("http") && route.page === "business-services";
  const nextUrl = (() => {
    if (useHttpPathRouting) {
      return `/${getBusinessServicesRouteSegments(route).join("/")}`;
    }

    if (route.page === "findings" && route.findingId) {
      return `#/findings/${route.findingId}`;
    }
    if (route.page === "findings") {
      return "#/findings";
    }
    if (route.page === "integrations") {
      return "#/integrations";
    }
    if (route.page === "controls") {
      return "#/controls";
    }
    if (route.page === "business-services") {
      return `#/${getBusinessServicesRouteSegments(route).join("/")}`;
    }
    return "#/findings";
  })();

  const currentUrl = useHttpPathRouting
    ? window.location.pathname
    : window.location.hash || "";
  if (currentUrl !== nextUrl) {
    window.history.pushState(route, "", nextUrl);
  }
}

function getBusinessServicesRouteSegments(route: AppRoute) {
  const segments = ["business-services"];
  if (route.businessUnitSlug) {
    segments.push(route.businessUnitSlug);
  }
  if (route.businessServiceSlug) {
    segments.push(route.businessServiceSlug);
  }
  if (route.applicationSlug) {
    segments.push(route.applicationSlug);
  }
  if (route.assetId) {
    segments.push("assets", route.assetId, "findings");
  }
  return segments;
}

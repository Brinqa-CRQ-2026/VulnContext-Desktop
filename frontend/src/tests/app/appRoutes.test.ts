import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getEmptyRoute,
  parseHashRoute,
  parsePathRoute,
  readHistoryFindingOrigin,
  writeHashRoute,
  type AppRoute,
} from "../../routing/appRoutes";
import { resetRoute } from "../utils/routeHelpers";

describe("app route helpers", () => {
  afterEach(() => {
    resetRoute();
    vi.restoreAllMocks();
  });

  it("builds empty routes for each base page", () => {
    expect(getEmptyRoute("findings")).toEqual({
      page: "findings",
      findingId: null,
      findingOrigin: null,
      businessUnitSlug: null,
      businessServiceSlug: null,
      applicationSlug: null,
      assetId: null,
    });
  });

  it("parses topology path routes across drill-down levels", () => {
    expect(parsePathRoute("/")).toMatchObject({ page: "business-services" });
    expect(parsePathRoute("/business-services/online-store")).toMatchObject({
      businessUnitSlug: "online-store",
      businessServiceSlug: null,
    });
    expect(
      parsePathRoute(
        "/business-services/online-store/digital-storefront/identity/assets/asset-1/findings"
      )
    ).toMatchObject({
      businessUnitSlug: "online-store",
      businessServiceSlug: "digital-storefront",
      applicationSlug: "identity",
      assetId: "asset-1",
    });
    expect(parsePathRoute("/unknown")).toBeNull();
  });

  it("parses hash routes and falls back invalid hashes to findings", () => {
    resetRoute("/#/findings/finding-1");
    expect(parseHashRoute()).toMatchObject({
      page: "findings",
      findingId: "finding-1",
    });

    resetRoute("/#/unknown");
    expect(parseHashRoute()).toMatchObject({
      page: "findings",
      findingId: null,
    });
  });

  it("reads only supported finding origins from history state", () => {
    const assetOrigin = {
      mode: "asset" as const,
      assetId: "asset-1",
      businessUnitSlug: "online-store",
    };
    window.history.replaceState({ findingOrigin: assetOrigin }, "", "/#/findings/finding-1");
    expect(readHistoryFindingOrigin()).toEqual(assetOrigin);

    window.history.replaceState({ findingOrigin: { mode: "bad" } }, "", "/#/findings/finding-1");
    expect(readHistoryFindingOrigin()).toBeNull();
  });

  it("writes hash routes for non-topology pages", () => {
    resetRoute("/");

    writeHashRoute({
      ...getEmptyRoute("findings"),
      findingId: "finding-1",
    });

    expect(window.location.hash).toBe("#/findings/finding-1");
  });

  it("writes path routes for http topology pages", () => {
    resetRoute("/#/findings");
    writeHashRoute({
      ...getEmptyRoute("business-services"),
      businessUnitSlug: "online-store",
      businessServiceSlug: "digital-storefront",
    });

    expect(window.location.pathname).toBe(
      "/business-services/online-store/digital-storefront"
    );
  });
});

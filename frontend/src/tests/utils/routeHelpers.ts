export function setHashRoute(hash: string) {
  window.location.hash = hash;
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

export function pushPathRoute(pathname: string, state: unknown = {}) {
  window.history.pushState(state, "", pathname);
  window.dispatchEvent(new PopStateEvent("popstate", { state }));
}

export function resetRoute(url = "/") {
  window.history.replaceState(null, "", url);
}

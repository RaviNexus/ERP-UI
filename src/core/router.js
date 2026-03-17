// ============================================================
// SmartHub ERP — Hash-Based SPA Router
// ============================================================

class Router {
  constructor() {
    this.routes = [];
    this.currentRoute = null;
    this.beforeHooks = [];
    window.addEventListener('hashchange', () => this.resolve());
    window.addEventListener('load', () => this.resolve());
  }

  addRoute(path, handler, meta = {}) {
    this.routes.push({ path, handler, meta });
    return this;
  }

  before(hook) {
    this.beforeHooks.push(hook);
    return this;
  }

  navigate(path) {
    window.location.hash = path;
  }

  getHash() {
    return window.location.hash.slice(1) || '/login';
  }

  matchRoute(hash) {
    for (const route of this.routes) {
      const paramNames = [];
      const regexStr = route.path.replace(/:([^/]+)/g, (_, name) => {
        paramNames.push(name);
        return '([^/]+)';
      });
      const regex = new RegExp(`^${regexStr}$`);
      const match = hash.match(regex);
      if (match) {
        const params = {};
        paramNames.forEach((name, i) => {
          params[name] = match[i + 1];
        });
        return { ...route, params };
      }
    }
    return null;
  }

  async resolve() {
    const hash = this.getHash();
    const matched = this.matchRoute(hash);

    if (!matched) {
      this.navigate('/login');
      return;
    }

    // Run before hooks (auth guards)
    for (const hook of this.beforeHooks) {
      const result = await hook(matched);
      if (result === false) return;
    }

    this.currentRoute = matched;
    matched.handler(matched.params);
  }
}

export const router = new Router();
export default router;

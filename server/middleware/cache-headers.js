export function setCache(maxAgeSec, options = {}) {
  return (req, res, next) => {
    const directives = [`public`, `max-age=${maxAgeSec}`];
    if (options.staleWhileRevalidate) {
      directives.push(`stale-while-revalidate=${options.staleWhileRevalidate}`);
    }
    res.set('Cache-Control', directives.join(', '));
    next();
  };
}

export function setNoStore() {
  return (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  };
}

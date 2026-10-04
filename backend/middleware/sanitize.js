// Strips MongoDB operator keys ("$gt", "$ne", ...) and dotted keys from
// client input before any handler sees it, so a body like
// {"clerkId": {"$ne": null}} can never turn into a query operator
// (NoSQL injection). Server-built queries are unaffected - this only
// touches req.body / req.query / req.params.
const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

export const stripOperators = (value, depth = 0) => {
  if (depth > 20) return undefined;
  if (Array.isArray(value)) return value.map((v) => stripOperators(v, depth + 1));
  if (!isPlainObject(value)) return value;
  const clean = {};
  for (const [key, inner] of Object.entries(value)) {
    if (key.startsWith('$') || key.includes('.')) continue;
    clean[key] = stripOperators(inner, depth + 1);
  }
  return clean;
};

export const sanitizeInput = (req, res, next) => {
  if (req.body) req.body = stripOperators(req.body);
  if (req.params) req.params = stripOperators(req.params);
  if (req.query && isPlainObject(req.query)) {
    const cleanQuery = stripOperators(req.query);
    // Express 4 lets us replace req.query directly.
    for (const key of Object.keys(req.query)) delete req.query[key];
    Object.assign(req.query, cleanQuery);
  }
  next();
};

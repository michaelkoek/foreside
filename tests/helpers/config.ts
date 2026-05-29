export const BASE_URL = (() => {
  const url = process.env.BASE_URL;
  if (url && url.startsWith('http')) return url;
  return 'http://gateway.foreside-beer-case.orb.local';
})();

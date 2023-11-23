module.exports = {
  isTrue: (value) => value === 'true' || value === '1' || value === true,
  trimIfString: (value) => (typeof value === 'string' ? value.trim() : value),
  now: () => new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')
};
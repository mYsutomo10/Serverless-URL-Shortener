exports.generateShortCode = () => {
  return Math.random().toString(36).substring(2, 8); // 6 chars
};
const { generateShortCode } = require('../utils/generateShortCode');

describe('generateShortCode', () => {
  it('should return a 6-character code', () => {
    const code = generateShortCode();
    expect(code).toHaveLength(6);
  });

  it('should return alphanumeric string', () => {
    const code = generateShortCode();
    expect(/^[a-z0-9]+$/i.test(code)).toBe(true);
  });
});
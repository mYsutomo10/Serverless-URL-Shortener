const ShortCodeGenerator = require('../utils/shortCodeGenerator');
const Validator = require('../utils/validator');

describe('ShortCodeGenerator', () => {
  test('generateShortCode should return string of specified length', () => {
    const shortCode = ShortCodeGenerator.generateShortCode(8);
    expect(typeof shortCode).toBe('string');
    expect(shortCode.length).toBe(8);
  });

  test('generateShortCode should return different codes on multiple calls', () => {
    const code1 = ShortCodeGenerator.generateShortCode();
    const code2 = ShortCodeGenerator.generateShortCode();
    expect(code1).not.toBe(code2);
  });

  test('isValidShortCode should validate correct formats', () => {
    expect(ShortCodeGenerator.isValidShortCode('Abc123')).toBe(true);
    expect(ShortCodeGenerator.isValidShortCode('ABC123DEF')).toBe(true);
    expect(ShortCodeGenerator.isValidShortCode('abc')).toBe(false); // too short
    expect(ShortCodeGenerator.isValidShortCode('abc123def456')).toBe(false); // too long
    expect(ShortCodeGenerator.isValidShortCode('abc-123')).toBe(false); // invalid characters
  });

  test('generateUniqueId should return valid UUID', () => {
    const id = ShortCodeGenerator.generateUniqueId();
    expect(typeof id).toBe('string');
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});

describe('Validator', () => {
  test('validateUrl should accept valid URLs', () => {
    expect(() => Validator.validateUrl('https://www.example.com')).not.toThrow();
    expect(() => Validator.validateUrl('http://example.com')).not.toThrow();
    expect(() => Validator.validateUrl('https://example.com/path?query=value')).not.toThrow();
  });

  test('validateUrl should reject invalid URLs', () => {
    expect(() => Validator.validateUrl('not-a-url')).toThrow();
    expect(() => Validator.validateUrl('ftp://example.com')).toThrow();
    expect(() => Validator.validateUrl('')).toThrow();
    expect(() => Validator.validateUrl(null)).toThrow();
  });

  test('validateShortCode should accept valid short codes', () => {
    expect(() => Validator.validateShortCode('Abc123')).not.toThrow();
    expect(() => Validator.validateShortCode('ABC123DEF')).not.toThrow();
  });

  test('validateShortCode should reject invalid short codes', () => {
    expect(() => Validator.validateShortCode('abc')).toThrow(); // too short
    expect(() => Validator.validateShortCode('abc123def456')).toThrow(); // too long
    expect(() => Validator.validateShortCode('abc-123')).toThrow(); // invalid characters
  });

  test('validateCreateUrlRequest should validate complete request', () => {
    const validRequest = { url: 'https://example.com' };
    expect(() => Validator.validateCreateUrlRequest(validRequest)).not.toThrow();

    const validWithCustomCode = { 
      url: 'https://example.com', 
      customCode: 'custom123' 
    };
    expect(() => Validator.validateCreateUrlRequest(validWithCustomCode)).not.toThrow();

    const invalidRequest = { url: 'not-a-url' };
    expect(() => Validator.validateCreateUrlRequest(invalidRequest)).toThrow();
  });
});
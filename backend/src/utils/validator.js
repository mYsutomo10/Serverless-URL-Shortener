const Joi = require('joi');

class Validator {
  static validateUrl(url) {
    const schema = Joi.string().uri({
      scheme: ['http', 'https']
    }).required();
    
    const { error, value } = schema.validate(url);
    
    if (error) {
      throw new Error(`Invalid URL: ${error.details[0].message}`);
    }
    
    return value;
  }

  static validateShortCode(shortCode) {
    const schema = Joi.string().alphanum().min(6).max(10).required();
    
    const { error, value } = schema.validate(shortCode);
    
    if (error) {
      throw new Error(`Invalid short code: ${error.details[0].message}`);
    }
    
    return value;
  }

  static validateCreateUrlRequest(body) {
    const schema = Joi.object({
      url: Joi.string().uri({
        scheme: ['http', 'https']
      }).required(),
      customCode: Joi.string().alphanum().min(6).max(10).optional(),
      expiresAt: Joi.date().iso().min('now').optional()
    });
    
    const { error, value } = schema.validate(body);
    
    if (error) {
      throw new Error(`Validation error: ${error.details[0].message}`);
    }
    
    return value;
  }
}

module.exports = Validator;
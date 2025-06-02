const DynamoDBService = require('../utils/dynamodb');
const ShortCodeGenerator = require('../utils/shortCodeGenerator');
const Validator = require('../utils/validator');

const createResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  },
  body: JSON.stringify(body)
});

exports.handler = async (event) => {
  console.log('Create Short URL request:', JSON.stringify(event, null, 2));
  
  try {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, { message: 'CORS preflight handled' });
    }

    const requestBody = JSON.parse(event.body || '{}');
    
    // Validate request
    const validatedData = Validator.validateCreateUrlRequest(requestBody);
    const { url, customCode, expiresAt } = validatedData;
    
    // Generate or use custom short code
    let shortCode = customCode;
    let attempts = 0;
    const maxAttempts = 5;
    
    while (!shortCode && attempts < maxAttempts) {
      const generatedCode = ShortCodeGenerator.generateShortCode();
      
      try {
        // Check if code already exists
        const existing = await DynamoDBService.getItem(generatedCode);
        if (!existing) {
          shortCode = generatedCode;
          break;
        }
      } catch (error) {
        console.log('Error checking existing code:', error);
      }
      
      attempts++;
    }
    
    if (!shortCode) {
      return createResponse(500, {
        error: 'Unable to generate unique short code',
        message: 'Please try again'
      });
    }
    
    // Create URL mapping
    const now = new Date().toISOString();
    const urlMapping = {
      shortCode,
      originalUrl: url,
      createdAt: now,
      clickCount: 0,
      expiresAt: expiresAt ? Math.floor(new Date(expiresAt).getTime() / 1000) : null
    };
    
    await DynamoDBService.putItem(urlMapping);
    
    const baseUrl = process.env.BASE_URL || `https://${event.requestContext.domainName}`;
    const shortUrl = `${baseUrl}/${shortCode}`;
    
    return createResponse(201, {
      shortUrl,
      shortCode,
      originalUrl: url,
      createdAt: now,
      expiresAt: expiresAt || null
    });
    
  } catch (error) {
    console.error('Error creating short URL:', error);
    
    if (error.message.includes('Short code already exists')) {
      return createResponse(409, {
        error: 'Custom short code already exists',
        message: 'Please choose a different custom code'
      });
    }
    
    if (error.message.includes('Validation error') || error.message.includes('Invalid')) {
      return createResponse(400, {
        error: 'Validation Error',
        message: error.message
      });
    }
    
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Unable to create short URL'
    });
  }
};
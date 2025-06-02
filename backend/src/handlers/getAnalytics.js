const DynamoDBService = require('../utils/dynamodb');
const Validator = require('../utils/validator');

const createResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  },
  body: JSON.stringify(body)
});

exports.handler = async (event) => {
  console.log('Analytics request:', JSON.stringify(event, null, 2));
  
  try {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, { message: 'CORS preflight handled' });
    }

    const shortCode = event.pathParameters?.shortCode;
    
    if (!shortCode) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'Short code is required'
      });
    }
    
    // Validate short code format
    try {
      Validator.validateShortCode(shortCode);
    } catch (error) {
      return createResponse(400, {
        error: 'Invalid Short Code',
        message: error.message
      });
    }
    
    // Get URL mapping from database
    const urlMapping = await DynamoDBService.getItem(shortCode);
    
    if (!urlMapping) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Short URL not found'
      });
    }
    
    // Return analytics data
    const analytics = {
      shortCode: urlMapping.shortCode,
      originalUrl: urlMapping.originalUrl,
      createdAt: urlMapping.createdAt,
      clickCount: urlMapping.clickCount || 0,
      expiresAt: urlMapping.expiresAt ? new Date(urlMapping.expiresAt * 1000).toISOString() : null,
      isExpired: urlMapping.expiresAt ? urlMapping.expiresAt < Math.floor(Date.now() / 1000) : false
    };
    
    return createResponse(200, analytics);
    
  } catch (error) {
    console.error('Error getting analytics:', error);
    
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Unable to retrieve analytics'
    });
  }
};
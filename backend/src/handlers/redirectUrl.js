const DynamoDBService = require('../utils/dynamodb');
const Validator = require('../utils/validator');

const createResponse = (statusCode, body, headers = {}) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    ...headers
  },
  body: typeof body === 'string' ? body : JSON.stringify(body)
});

exports.handler = async (event) => {
  console.log('Redirect request:', JSON.stringify(event, null, 2));
  
  try {
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
    
    // Check if URL has expired
    if (urlMapping.expiresAt && urlMapping.expiresAt < Math.floor(Date.now() / 1000)) {
      return createResponse(410, {
        error: 'URL Expired',
        message: 'This short URL has expired'
      });
    }
    
    // Update click count asynchronously
    DynamoDBService.updateClickCount(shortCode).catch(error => {
      console.error('Error updating click count:', error);
    });
    
    // Redirect to original URL
    return createResponse(302, '', {
      Location: urlMapping.originalUrl,
      'Cache-Control': 'no-cache'
    });
    
  } catch (error) {
    console.error('Error in redirect handler:', error);
    
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Unable to process redirect'
    });
  }
};
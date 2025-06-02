const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const validator = require('validator');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const tableName = process.env.DYNAMODB_TABLE;
const domainName = process.env.DOMAIN_NAME;

// Generate a short code (6 characters, alphanumeric)
const generateShortCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Check if short code already exists
const checkShortCodeExists = async (shortCode) => {
  try {
    const params = {
      TableName: tableName,
      Key: { shortCode }
    };
    
    const result = await dynamodb.get(params).promise();
    return !!result.Item;
  } catch (error) {
    console.error('Error checking short code existence:', error);
    throw error;
  }
};

// Generate unique short code
const generateUniqueShortCode = async (maxAttempts = 5) => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const shortCode = generateShortCode();
    const exists = await checkShortCodeExists(shortCode);
    
    if (!exists) {
      return shortCode;
    }
  }
  
  // Fallback to UUID-based short code if random generation fails
  return uuidv4().substring(0, 8);
};

// Validate and normalize URL
const validateAndNormalizeUrl = (url) => {
  if (!url || typeof url !== 'string') {
    throw new Error('URL is required and must be a string');
  }

  // Add protocol if missing
  let normalizedUrl = url.trim();
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  // Validate URL format
  if (!validator.isURL(normalizedUrl, {
    protocols: ['http', 'https'],
    require_protocol: true,
    require_valid_protocol: true,
    allow_underscores: true
  })) {
    throw new Error('Invalid URL format');
  }

  return normalizedUrl;
};

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    // Parse request body
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (error) {
      console.error('Invalid JSON in request body:', error);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Invalid JSON in request body',
          message: 'Request body must be valid JSON'
        })
      };
    }

    const { url, customCode, expirationDays = 365 } = body;

    // Validate required fields
    if (!url) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Missing required field',
          message: 'URL is required'
        })
      };
    }

    // Validate and normalize URL
    let normalizedUrl;
    try {
      normalizedUrl = validateAndNormalizeUrl(url);
    } catch (error) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Invalid URL',
          message: error.message
        })
      };
    }

    // Generate or validate custom short code
    let shortCode;
    if (customCode) {
      // Validate custom code format (alphanumeric, 3-20 characters)
      if (!/^[A-Za-z0-9]{3,20}$/.test(customCode)) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            error: 'Invalid custom code',
            message: 'Custom code must be 3-20 alphanumeric characters'
          })
        };
      }

      // Check if custom code already exists
      const exists = await checkShortCodeExists(customCode);
      if (exists) {
        return {
          statusCode: 409,
          headers: corsHeaders,
          body: JSON.stringify({
            error: 'Custom code already exists',
            message: 'Please choose a different custom code'
          })
        };
      }

      shortCode = customCode;
    } else {
      // Generate unique short code
      shortCode = await generateUniqueShortCode();
    }

    // Calculate expiration date
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (expirationDays * 24 * 60 * 60 * 1000));

    // Store in DynamoDB
    const item = {
      shortCode,
      originalUrl: normalizedUrl,
      createdAt: now.toISOString(),
      expiresAt: Math.floor(expiresAt.getTime() / 1000), // TTL requires Unix timestamp
      clickCount: 0,
      createdBy: event.requestContext?.identity?.sourceIp || 'unknown',
      userAgent: event.headers?.['User-Agent'] || 'unknown'
    };

    const params = {
      TableName: tableName,
      Item: item,
      ConditionExpression: 'attribute_not_exists(shortCode)' // Ensure no overwrites
    };

    await dynamodb.put(params).promise();

    // Build short URL
    const protocol = event.headers?.['X-Forwarded-Proto'] || 'https';
    const host = event.headers?.Host || domainName;
    const shortUrl = `${protocol}://${host}/${shortCode}`;

    console.log(`Created short URL: ${shortUrl} -> ${normalizedUrl}`);

    // Return success response
    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        data: {
          shortCode,
          shortUrl,
          originalUrl: normalizedUrl,
          expiresAt: expiresAt.toISOString(),
          createdAt: now.toISOString()
        }
      })
    };

  } catch (error) {
    console.error('Error creating short URL:', error);

    // Handle DynamoDB conditional check failed error
    if (error.code === 'ConditionalCheckFailedException') {
      return {
        statusCode: 409,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Short code already exists',
          message: 'Generated short code collision, please try again'
        })
      };
    }

    // Generic error response
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Unable to create short URL. Please try again later.',
        requestId: event.requestContext?.requestId
      })
    };
  }
};
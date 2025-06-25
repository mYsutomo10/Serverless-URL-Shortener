const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const cloudWatch = new AWS.CloudWatch();

const TABLE_NAME = process.env.TABLE_NAME;
const BASE_URL = process.env.BASE_URL || 'https://short.ly';

// Custom error class for URL validation
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Validate URL format
const validateUrl = (url) => {
  try {
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new ValidationError('URL must use HTTP or HTTPS protocol');
    }
    return true;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError('Invalid URL format');
  }
};

// Generate short ID (6-8 characters, URL-safe)
const generateShortId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Check if short ID already exists in DynamoDB
const isShortIdUnique = async (shortId) => {
  try {
    const params = {
      TableName: TABLE_NAME,
      Key: { shortId }
    };
    
    const result = await dynamodb.get(params).promise();
    return !result.Item;
  } catch (error) {
    console.error('Error checking short ID uniqueness:', error);
    throw error;
  }
};

// Log metrics to CloudWatch
const logMetric = async (metricName, value = 1, unit = 'Count') => {
  try {
    const params = {
      Namespace: 'URLShortener',
      MetricData: [{
        MetricName: metricName,
        Value: value,
        Unit: unit,
        Timestamp: new Date()
      }]
    };
    
    await cloudWatch.putMetricData(params).promise();
  } catch (error) {
    console.error('Error logging metric:', error);
    // Don't throw error for metrics - shouldn't fail the main operation
  }
};

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'POST,OPTIONS'
};

exports.handler = async (event) => {
  console.log('Event received:', JSON.stringify(event, null, 2));
  
  // Handle CORS preflight
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
      body = JSON.parse(event.body);
    } catch (error) {
      throw new ValidationError('Invalid JSON in request body');
    }

    const { longUrl } = body;

    // Validate input
    if (!longUrl) {
      throw new ValidationError('longUrl is required');
    }

    if (typeof longUrl !== 'string') {
      throw new ValidationError('longUrl must be a string');
    }

    // Validate URL format
    validateUrl(longUrl);

    // Generate unique short ID
    let shortId;
    let attempts = 0;
    const maxAttempts = 5;

    do {
      shortId = generateShortId();
      attempts++;
      
      if (attempts > maxAttempts) {
        throw new Error('Unable to generate unique short ID after multiple attempts');
      }
    } while (!(await isShortIdUnique(shortId)));

    // Save to DynamoDB
    const item = {
      shortId,
      longUrl,
      createdAt: new Date().toISOString(),
      expiresAt: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 year TTL
      clickCount: 0
    };

    const params = {
      TableName: TABLE_NAME,
      Item: item,
      ConditionExpression: 'attribute_not_exists(shortId)' // Extra safety check
    };

    await dynamodb.put(params).promise();

    // Log success metric
    await logMetric('URLsShortened');

    const shortUrl = `${BASE_URL}/${shortId}`;

    console.log('Successfully created short URL:', { shortId, longUrl, shortUrl });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      },
      body: JSON.stringify({
        shortUrl,
        shortId,
        longUrl,
        createdAt: item.createdAt
      })
    };

  } catch (error) {
    console.error('Error in shorten function:', error);

    // Log error metric
    await logMetric('ShortenErrors');

    if (error instanceof ValidationError) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        },
        body: JSON.stringify({
          error: 'Validation Error',
          message: error.message
        })
      };
    }

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: 'Failed to shorten URL'
      })
    };
  }
};
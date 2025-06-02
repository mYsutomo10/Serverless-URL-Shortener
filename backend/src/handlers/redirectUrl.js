const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const tableName = process.env.DYNAMODB_TABLE;

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,OPTIONS'
};

// Get URL mapping from DynamoDB
const getUrlMapping = async (shortCode) => {
  try {
    const params = {
      TableName: tableName,
      Key: { shortCode }
    };

    const result = await dynamodb.get(params).promise();
    return result.Item;
  } catch (error) {
    console.error('Error fetching URL mapping:', error);
    throw error;
  }
};

// Update click count
const incrementClickCount = async (shortCode) => {
  try {
    const params = {
      TableName: tableName,
      Key: { shortCode },
      UpdateExpression: 'ADD clickCount :increment, lastAccessedAt :timestamp',
      ExpressionAttributeValues: {
        ':increment': 1,
        ':timestamp': new Date().toISOString()
      },
      ReturnValues: 'UPDATED_NEW'
    };

    await dynamodb.update(params).promise();
  } catch (error) {
    console.error('Error updating click count:', error);
    // Don't throw error here to avoid breaking redirect functionality
  }
};

// Validate short code format
const isValidShortCode = (shortCode) => {
  return shortCode && /^[A-Za-z0-9]{3,20}$/.test(shortCode);
};

// Check if URL has expired
const isExpired = (expiresAt) => {
  if (!expiresAt) return false;
  
  const now = new Date();
  const expireDate = typeof expiresAt === 'number' 
    ? new Date(expiresAt * 1000) // Unix timestamp
    : new Date(expiresAt); // ISO string
    
  return now > expireDate;
};

// Log analytics data
const logAnalytics = (event, shortCode, originalUrl) => {
  const analyticsData = {
    shortCode,
    originalUrl,
    timestamp: new Date().toISOString(),
    userAgent: event.headers?.['User-Agent'] || 'unknown',
    referer: event.headers?.Referer || event.headers?.referer || 'direct',
    sourceIp: event.requestContext?.identity?.sourceIp || 'unknown',
    country: event.headers?.['CloudFront-Viewer-Country'] || 'unknown',
    requestId: event.requestContext?.requestId
  };

  console.log('Analytics:', JSON.stringify(analyticsData));
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
    // Extract short code from path parameters
    const shortCode = event.pathParameters?.shortCode;

    // Validate short code
    if (!shortCode) {
      return {
        statusCode: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html'
        },
        body: `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Error - URL Shortener</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .error { color: #d32f2f; }
            </style>
          </head>
          <body>
            <h1 class="error">Invalid Short Code</h1>
            <p>The requested short code is missing or invalid.</p>
            <a href="/">← Back to Home</a>
          </body>
          </html>
        `
      };
    }

    if (!isValidShortCode(shortCode)) {
      return {
        statusCode: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html'
        },
        body: `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Error - URL Shortener</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .error { color: #d32f2f; }
            </style>
          </head>
          <body>
            <h1 class="error">Invalid Short Code Format</h1>
            <p>The short code "${shortCode}" has an invalid format.</p>
            <a href="/">← Back to Home</a>
          </body>
          </html>
        `
      };
    }

    // Get URL mapping from database
    const urlMapping = await getUrlMapping(shortCode);

    if (!urlMapping) {
      console.log(`Short code not found: ${shortCode}`);
      
      return {
        statusCode: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html'
        },
        body: `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Not Found - URL Shortener</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .error { color: #d32f2f; }
              .code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; }
            </style>
          </head>
          <body>
            <h1 class="error">Short URL Not Found</h1>
            <p>The short code <span class="code">${shortCode}</span> does not exist or has been removed.</p>
            <a href="/">← Back to Home</a>
          </body>
          </html>
        `
      };
    }

    // Check if URL has expired
    if (isExpired(urlMapping.expiresAt)) {
      console.log(`URL expired: ${shortCode}`);
      
      return {
        statusCode: 410,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html'
        },
        body: `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Expired - URL Shortener</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .error { color: #d32f2f; }
            </style>
          </head>
          <body>
            <h1 class="error">Short URL Expired</h1>
            <p>This short URL has expired and is no longer valid.</p>
            <a href="/">← Back to Home</a>
          </body>
          </html>
        `
      };
    }

    const { originalUrl } = urlMapping;

    // Validate original URL exists
    if (!originalUrl) {
      console.error(`No original URL found for short code: ${shortCode}`);
      
      return {
        statusCode: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html'
        },
        body: `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Error - URL Shortener</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .error { color: #d32f2f; }
            </style>
          </head>
          <body>
            <h1 class="error">Data Error</h1>
            <p>The original URL data is corrupted or missing.</p>
            <a href="/">← Back to Home</a>
          </body>
          </html>
        `
      };
    }

    // Log analytics and increment click count (async, don't wait)
    logAnalytics(event, shortCode, originalUrl);
    incrementClickCount(shortCode).catch(err => 
      console.error('Failed to increment click count:', err)
    );

    console.log(`Redirecting ${shortCode} to ${originalUrl}`);

    // Return redirect response
    return {
      statusCode: 301,
      headers: {
        ...corsHeaders,
        'Location': originalUrl,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      body: ''
    };

  } catch (error) {
    console.error('Error processing redirect:', error);

    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html'
      },
      body: `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Error - URL Shortener</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .error { color: #d32f2f; }
          </style>
        </head>
        <body>
          <h1 class="error">Server Error</h1>
          <p>An unexpected error occurred. Please try again later.</p>
          <p><small>Request ID: ${event.requestContext?.requestId || 'unknown'}</small></p>
          <a href="/">← Back to Home</a>
        </body>
        </html>
      `
    };
  }
};
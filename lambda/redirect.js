const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const cloudWatch = new AWS.CloudWatch();

const TABLE_NAME = process.env.TABLE_NAME;

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

// Update click count
const incrementClickCount = async (shortId) => {
  try {
    const params = {
      TableName: TABLE_NAME,
      Key: { shortId },
      UpdateExpression: 'SET clickCount = if_not_exists(clickCount, :zero) + :inc, lastAccessed = :timestamp',
      ExpressionAttributeValues: {
        ':inc': 1,
        ':zero': 0,
        ':timestamp': new Date().toISOString()
      },
      ReturnValues: 'UPDATED_NEW'
    };
    
    await dynamodb.update(params).promise();
  } catch (error) {
    console.error('Error updating click count:', error);
    // Don't throw error - redirect should still work even if click counting fails
  }
};

// CORS headers for error responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,OPTIONS'
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
    // Extract shortId from path parameters
    const shortId = event.pathParameters?.shortId;

    if (!shortId) {
      console.error('No shortId provided in path parameters');
      await logMetric('RedirectErrors');
      
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        },
        body: JSON.stringify({
          error: 'Bad Request',
          message: 'Short ID is required'
        })
      };
    }

    console.log('Looking up shortId:', shortId);

    // Get the long URL from DynamoDB
    const params = {
      TableName: TABLE_NAME,
      Key: { shortId }
    };

    const result = await dynamodb.get(params).promise();

    if (!result.Item) {
      console.log('Short ID not found:', shortId);
      await logMetric('RedirectNotFound');
      
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'text/html',
          ...corsHeaders
        },
        body: `
          <!DOCTYPE html>
          <html>
          <head>
            <title>URL Not Found</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
              }
              .container {
                text-align: center;
                background: rgba(255,255,255,0.1);
                padding: 2rem;
                border-radius: 1rem;
                backdrop-filter: blur(10px);
              }
              h1 { margin: 0 0 1rem 0; }
              p { margin: 0.5rem 0; opacity: 0.9; }
              a { color: #fff; text-decoration: underline; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>🔗 URL Not Found</h1>
              <p>The short URL you're looking for doesn't exist or may have expired.</p>
              <p><a href="/">← Go back to homepage</a></p>
            </div>
          </body>
          </html>
        `
      };
    }

    const { longUrl } = result.Item;
    console.log('Found longUrl for shortId:', { shortId, longUrl });

    // Increment click count asynchronously (don't await)
    incrementClickCount(shortId);

    // Log successful redirect
    await logMetric('RedirectsSuccessful');

    // Return 301 redirect
    return {
      statusCode: 301,
      headers: {
        'Location': longUrl,
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        ...corsHeaders
      },
      body: ''
    };

  } catch (error) {
    console.error('Error in redirect function:', error);
    
    // Log error metric
    await logMetric('RedirectErrors');

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'text/html',
        ...corsHeaders
      },
      body: `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Server Error</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }
            .container {
              text-align: center;
              background: rgba(255,255,255,0.1);
              padding: 2rem;
              border-radius: 1rem;
              backdrop-filter: blur(10px);
            }
            h1 { margin: 0 0 1rem 0; }
            p { margin: 0.5rem 0; opacity: 0.9; }
            a { color: #fff; text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>⚠️ Server Error</h1>
            <p>Sorry, something went wrong while processing your request.</p>
            <p>Please try again later.</p>
            <p><a href="/">← Go back to homepage</a></p>
          </div>
        </body>
        </html>
      `
    };
  }
};
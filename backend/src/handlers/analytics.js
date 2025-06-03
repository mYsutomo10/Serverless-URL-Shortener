const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
  const shortCode = event.pathParameters.shortCode;

  try {
    const result = await dynamodb.get({
      TableName: TABLE_NAME,
      Key: { shortCode },
    }).promise();

    if (!result.Item) {
      return { statusCode: 404, body: 'Not Found' };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        originalUrl: result.Item.originalUrl,
        createdAt: result.Item.createdAt,
        clickCount: result.Item.clickCount,
      }),
    };
  } catch (err) {
    console.error('Analytics error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
};
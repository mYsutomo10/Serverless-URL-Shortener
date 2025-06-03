const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
  try {
    const shortCode = event.pathParameters.shortCode;

    const result = await dynamodb.get({
      TableName: TABLE_NAME,
      Key: { shortCode },
    }).promise();

    if (!result.Item) {
      return { statusCode: 404, body: 'Not Found' };
    }

    await dynamodb.update({
      TableName: TABLE_NAME,
      Key: { shortCode },
      UpdateExpression: 'ADD clickCount :inc',
      ExpressionAttributeValues: { ':inc': 1 },
    }).promise();

    return {
      statusCode: 301,
      headers: { Location: result.Item.originalUrl },
      body: null,
    };
  } catch (err) {
    console.error('Redirect error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
};
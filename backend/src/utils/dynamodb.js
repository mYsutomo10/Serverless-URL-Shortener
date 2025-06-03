const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME;

exports.putUrlMapping = async ({ shortCode, originalUrl, createdAt }) => {
  const item = {
    shortCode,
    originalUrl,
    createdAt,
    clickCount: 0,
  };

  await dynamodb.put({
    TableName: TABLE_NAME,
    Item: item,
  }).promise();
};

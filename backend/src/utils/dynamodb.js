const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

const TABLE_NAME = process.env.DYNAMODB_TABLE || 'dev-url-mappings';

class DynamoDBService {
  static async putItem(item) {
    const params = {
      TableName: TABLE_NAME,
      Item: item,
      ConditionExpression: 'attribute_not_exists(shortCode)'
    };
    
    try {
      await dynamodb.put(params).promise();
      return item;
    } catch (error) {
      if (error.code === 'ConditionalCheckFailedException') {
        throw new Error('Short code already exists');
      }
      throw error;
    }
  }

  static async getItem(shortCode) {
    const params = {
      TableName: TABLE_NAME,
      Key: { shortCode }
    };
    
    const result = await dynamodb.get(params).promise();
    return result.Item;
  }

  static async updateClickCount(shortCode) {
    const params = {
      TableName: TABLE_NAME,
      Key: { shortCode },
      UpdateExpression: 'ADD clickCount :inc',
      ExpressionAttributeValues: {
        ':inc': 1
      },
      ReturnValues: 'ALL_NEW'
    };
    
    const result = await dynamodb.update(params).promise();
    return result.Attributes;
  }

  static async queryByCreatedAt(startTime, endTime) {
    const params = {
      TableName: TABLE_NAME,
      IndexName: 'createdAt-index',
      KeyConditionExpression: 'createdAt BETWEEN :start AND :end',
      ExpressionAttributeValues: {
        ':start': startTime,
        ':end': endTime
      }
    };
    
    const result = await dynamodb.query(params).promise();
    return result.Items;
  }
}

module.exports = DynamoDBService;
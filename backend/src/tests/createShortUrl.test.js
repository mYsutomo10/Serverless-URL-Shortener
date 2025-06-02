const { handler } = require('../handlers/createShortUrl');

// Mock the DynamoDB service
jest.mock('../utils/dynamodb');
const DynamoDBService = require('../utils/dynamodb');

describe('createShortUrl handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BASE_URL = 'https://short.ly';
  });

  test('should create short URL successfully', async () => {
    const mockEvent = {
      httpMethod: 'POST',
      body: JSON.stringify({ url: 'https://www.example.com' }),
      requestContext: { domainName: 'api.short.ly' }
    };

    DynamoDBService.getItem = jest.fn().mockResolvedValue(null);
    DynamoDBService.putItem = jest.fn().mockResolvedValue({});

    const response = await handler(mockEvent);
    
    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.originalUrl).toBe('https://www.example.com');
    expect(body.shortUrl).toMatch(/^https:\/\/short\.ly\/[A-Za-z0-9]{6}$/);
    expect(DynamoDBService.putItem).toHaveBeenCalled();
  });

  test('should handle CORS preflight', async () => {
    const mockEvent = {
      httpMethod: 'OPTIONS'
    };

    const response = await handler(mockEvent);
    
    expect(response.statusCode).toBe(200);
    expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
  });

  test('should reject invalid URL', async () => {
    const mockEvent = {
      httpMethod: 'POST',
      body: JSON.stringify({ url: 'not-a-valid-url' })
    };

    const response = await handler(mockEvent);
    
    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Validation Error');
  });

  test('should handle duplicate custom code', async () => {
    const mockEvent = {
      httpMethod: 'POST',
      body: JSON.stringify({ 
        url: 'https://www.example.com',
        customCode: 'existing123'
      })
    };

    DynamoDBService.putItem = jest.fn().mockRejectedValue(new Error('Short code already exists'));

    const response = await handler(mockEvent);
    
    expect(response.statusCode).toBe(409);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Custom short code already exists');
  });
});
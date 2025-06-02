const { handler } = require('../handlers/redirectUrl');

// Mock the DynamoDB service
jest.mock('../utils/dynamodb');
const DynamoDBService = require('../utils/dynamodb');

describe('redirectUrl handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should redirect to original URL successfully', async () => {
    const mockEvent = {
      pathParameters: { shortCode: 'abc123' }
    };

    const mockUrlMapping = {
      shortCode: 'abc123',
      originalUrl: 'https://www.example.com',
      clickCount: 5,
      createdAt: '2023-01-01T00:00:00Z'
    };

    DynamoDBService.getItem = jest.fn().mockResolvedValue(mockUrlMapping);
    DynamoDBService.updateClickCount = jest.fn().mockResolvedValue({});

    const response = await handler(mockEvent);
    
    expect(response.statusCode).toBe(302);
    expect(response.headers.Location).toBe('https://www.example.com');
    expect(DynamoDBService.updateClickCount).toHaveBeenCalledWith('abc123');
  });

  test('should return 404 for non-existent short code', async () => {
    const mockEvent = {
      pathParameters: { shortCode: 'notfound' }
    };

    DynamoDBService.getItem = jest.fn().mockResolvedValue(null);

    const response = await handler(mockEvent);
    
    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Not Found');
  });

  test('should return 410 for expired URL', async () => {
    const mockEvent = {
      pathParameters: { shortCode: 'expired123' }
    };

    const expiredMapping = {
      shortCode: 'expired123',
      originalUrl: 'https://www.example.com',
      expiresAt: Math.floor(Date.now() / 1000) - 3600 // expired 1 hour ago
    };

    DynamoDBService.getItem = jest.fn().mockResolvedValue(expiredMapping);

    const response = await handler(mockEvent);
    
    expect(response.statusCode).toBe(410);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('URL Expired');
  });

  test('should return 400 for missing short code', async () => {
    const mockEvent = {
      pathParameters: null
    };

    const response = await handler(mockEvent);
    
    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Bad Request');
  });
});
jest.mock('aws-sdk', () => {
  const DocumentClient = {
    put: jest.fn().mockReturnThis(),
    promise: jest.fn().mockResolvedValue({}),
  };
  return { DynamoDB: { DocumentClient: jest.fn(() => DocumentClient) } };
});

process.env.TABLE_NAME = 'url-mappings';
process.env.BASE_URL = 'https://short.ly';

const { handler } = require('../src/handlers/createShortUrl');

describe('Create Short URL', () => {
  it('should return 400 if invalid URL', async () => {
    const event = { body: JSON.stringify({ originalUrl: 'invalid' }) };
    const res = await handler(event);
    expect(res.statusCode).toBe(400);
  });

  it('should return 200 with short URL', async () => {
    const event = { body: JSON.stringify({ originalUrl: 'https://google.com' }) };
    const res = await handler(event);
    const body = JSON.parse(res.body);
    expect(res.statusCode).toBe(200);
    expect(body.shortUrl).toMatch(/https:\/\/short\.ly\/\w+/);
  });
});
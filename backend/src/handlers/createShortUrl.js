const { v4: uuidv4 } = require('uuid');
const { putUrlMapping } = require('../utils/dynamodb');
const { generateShortCode } = require('../utils/generateShortCode');

exports.handler = async (event) => {
  try {
    const { originalUrl } = JSON.parse(event.body);

    if (!originalUrl || !/^https?:\/\/.+\..+/.test(originalUrl)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid URL' }),
      };
    }

    const shortCode = generateShortCode();
    const createdAt = Date.now();

    await putUrlMapping({ shortCode, originalUrl, createdAt });

    return {
      statusCode: 200,
      body: JSON.stringify({
        shortUrl: `${process.env.BASE_URL}/${shortCode}`,
      }),
    };
  } catch (err) {
    console.error('Error creating short URL:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
};

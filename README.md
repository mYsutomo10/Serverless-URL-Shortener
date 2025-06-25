<<<<<<< HEAD
# AWS URL Shortener

A production-ready, serverless URL shortener built with AWS Lambda, API Gateway, and DynamoDB. Features a beautiful React frontend and comprehensive monitoring with CloudWatch.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   CloudFront    │    │   API Gateway    │    │  Lambda         │
│   (Frontend)    │    │                  │    │  Functions      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                       │
         │                        │                       │
         ▼                        ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   S3 Bucket     │    │   Route53        │    │   DynamoDB      │
│   (Static Web)  │    │   (Optional)     │    │   Table         │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Components

- **Frontend**: React application with Tailwind CSS, deployed to S3 + CloudFront
- **API**: AWS API Gateway with CORS enabled
- **Backend**: Two Lambda functions (Node.js 18.x)
  - `shorten.js`: Creates short URLs
  - `redirect.js`: Handles redirects and analytics
- **Database**: DynamoDB with TTL and point-in-time recovery
- **Monitoring**: CloudWatch logs, metrics, and dashboards

## Features

### Frontend
- Modern, responsive React interface
- Beautiful gradient design with animations
- Mobile-first responsive layout
- Copy-to-clipboard functionality
- Local storage for URL history
- Real-time URL validation
- External link indicators

### Backend
- RESTful API with proper HTTP status codes
- URL validation and sanitization
- CORS enabled for cross-origin requests
- Click tracking and analytics
- Automatic URL expiration (1 year TTL)
- Error handling and validation
- CloudWatch metrics and alarms

### Infrastructure
- Serverless architecture (pay-per-use)
- CloudWatch monitoring and dashboards
- Auto-scaling Lambda functions
- DynamoDB with on-demand billing
- Global content delivery via CloudFront
- IAM roles with least privilege access

## Prerequisites

Before deploying, ensure you have:

1. **AWS CLI** installed and configured
   ```bash
   aws --version
   aws configure
   ```

2. **AWS SAM CLI** installed
   ```bash
   sam --version
   ```

3. **Node.js** (v18 or later)
   ```bash
   node --version
   npm --version
   ```

4. **AWS Account** with appropriate permissions:
   - CloudFormation full access
   - Lambda full access
   - API Gateway full access
   - DynamoDB full access
   - S3 full access
   - CloudFront full access
   - CloudWatch full access
   - IAM role creation

## Quick Start

### 1. Clone and Setup

```bash
# If you haven't already, ensure all files are in place
npm install
```

### 2. Deploy Backend Infrastructure

```bash
# Make deploy script executable
chmod +x deploy.sh

# Deploy with default settings (dev environment, us-east-1)
./deploy.sh

# Or deploy with custom settings
./deploy.sh --environment prod --region us-west-2 --stack-name my-shortener
```

### 3. Update Frontend Configuration

After deployment, update your React app to use the actual API endpoint:

```typescript
// In src/App.tsx, replace the mock API call with:
const response = await fetch(`${API_ENDPOINT}/shorten`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ longUrl }),
});
```

### 4. Deploy Frontend

```bash
# Build and deploy the React frontend
npm run build

# The deploy script automatically uploads to S3 if bucket exists
# Or manually sync to S3:
aws s3 sync dist/ s3://your-frontend-bucket --delete
```

## Configuration

### Environment Variables

The SAM template automatically configures these environment variables for Lambda functions:

- `TABLE_NAME`: DynamoDB table name
- `BASE_URL`: Base URL for short links
- `LOG_LEVEL`: Logging level (INFO by default)

### Custom Domain (Optional)

To use a custom domain like `short.yourdomain.com`:

1. Deploy with custom domain parameter:
   ```bash
   sam deploy --parameter-overrides CustomDomainName=short.yourdomain.com
   ```

2. Create a Route53 hosted zone for your domain
3. Add SSL certificate in AWS Certificate Manager
4. Update CloudFront distribution to use custom domain

### DynamoDB Schema

The DynamoDB table uses this schema:

```javascript
{
  shortId: "abc123",      // Partition key
  longUrl: "https://...",  // Original URL
  createdAt: "2024-01-01T00:00:00Z",
  expiresAt: 1735689600,   // TTL (Unix timestamp)
  clickCount: 42,          // Number of times accessed
  lastAccessed: "2024-01-01T12:00:00Z"
}
```

## API Reference

### POST /shorten

Create a shortened URL.

**Request:**
```json
{
  "longUrl": "https://example.com/very/long/url"
}
```

**Response:**
```json
{
  "shortUrl": "https://short.ly/abc123",
  "shortId": "abc123",
  "longUrl": "https://example.com/very/long/url",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

**Error Response:**
```json
{
  "error": "Validation Error",
  "message": "Invalid URL format"
}
```

### GET /{shortId}

Redirect to the original URL.

**Response:** HTTP 301 redirect to original URL
**Error:** HTTP 404 with friendly error page

## Monitoring

### CloudWatch Metrics

The application tracks these custom metrics:

- `URLsShortened`: Number of URLs shortened
- `RedirectsSuccessful`: Successful redirects
- `RedirectNotFound`: 404 errors
- `ShortenErrors`: Errors during shortening
- `RedirectErrors`: Errors during redirect

## Testing

### Test the API

```bash
# Get your API endpoint from CloudFormation outputs
API_ENDPOINT="https://your-api-id.execute-api.us-east-1.amazonaws.com/dev"

# Test URL shortening
curl -X POST $API_ENDPOINT/shorten \
  -H 'Content-Type: application/json' \
  -d '{"longUrl": "https://github.com/aws/aws-sam-cli"}'

# Test redirect (replace abc123 with actual short ID)
curl -I $API_ENDPOINT/abc123
```

### Local Development

```bash
# Start local development server
npm run dev

# Run SAM local API (requires Docker)
sam local start-api --port 3001
```

## Cleanup

To delete all AWS resources:

```bash
# Delete CloudFormation stack
aws cloudformation delete-stack --stack-name url-shortener-dev

# Empty and delete S3 buckets (if needed)
aws s3 rm s3://your-frontend-bucket --recursive
aws s3 rb s3://your-frontend-bucket
```

## 🐛 Troubleshooting

### Logs Location

- **API Gateway**: `/aws/apigateway/url-shortener-dev`
- **Lambda Functions**: `/aws/lambda/url-shortener-shorten-dev`
- **DynamoDB**: CloudWatch Metrics (no logs by default)
=======
# AWS URL Shortener

A production-ready, serverless URL shortener built with AWS Lambda, API Gateway, and DynamoDB. Features a beautiful React frontend and comprehensive monitoring with CloudWatch.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   CloudFront    │    │   API Gateway    │    │  Lambda         │
│   (Frontend)    │    │                  │    │  Functions      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                       │
         │                        │                       │
         ▼                        ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   S3 Bucket     │    │   Route53        │    │   DynamoDB      │
│   (Static Web)  │    │   (Optional)     │    │   Table         │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Components

- **Frontend**: React application with Tailwind CSS, deployed to S3 + CloudFront
- **API**: AWS API Gateway with CORS enabled
- **Backend**: Two Lambda functions (Node.js 18.x)
  - `shorten.js`: Creates short URLs
  - `redirect.js`: Handles redirects and analytics
- **Database**: DynamoDB with TTL and point-in-time recovery
- **Monitoring**: CloudWatch logs, metrics, and dashboards

## Features

### Frontend
- Modern, responsive React interface
- Beautiful gradient design with animations
- Mobile-first responsive layout
- Copy-to-clipboard functionality
- Local storage for URL history
- Real-time URL validation
- External link indicators

### Backend
- RESTful API with proper HTTP status codes
- URL validation and sanitization
- CORS enabled for cross-origin requests
- Click tracking and analytics
- Automatic URL expiration (1 year TTL)
- Error handling and validation
- CloudWatch metrics and alarms

### Infrastructure
- Serverless architecture (pay-per-use)
- CloudWatch monitoring and dashboards
- Auto-scaling Lambda functions
- DynamoDB with on-demand billing
- Global content delivery via CloudFront
- IAM roles with least privilege access

## Prerequisites

Before deploying, ensure you have:

1. **AWS CLI** installed and configured
   ```bash
   aws --version
   aws configure
   ```

2. **AWS SAM CLI** installed
   ```bash
   sam --version
   ```

3. **Node.js** (v18 or later)
   ```bash
   node --version
   npm --version
   ```

4. **AWS Account** with appropriate permissions:
   - CloudFormation full access
   - Lambda full access
   - API Gateway full access
   - DynamoDB full access
   - S3 full access
   - CloudFront full access
   - CloudWatch full access
   - IAM role creation

## Quick Start

### 1. Clone and Setup

```bash
# If you haven't already, ensure all files are in place
npm install
```

### 2. Deploy Backend Infrastructure

```bash
# Make deploy script executable
chmod +x deploy.sh

# Deploy with default settings (dev environment, us-east-1)
./deploy.sh

# Or deploy with custom settings
./deploy.sh --environment prod --region us-west-2 --stack-name my-shortener
```

### 3. Update Frontend Configuration

After deployment, update your React app to use the actual API endpoint:

```typescript
// In src/App.tsx, replace the mock API call with:
const response = await fetch(`${API_ENDPOINT}/shorten`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ longUrl }),
});
```

### 4. Deploy Frontend

```bash
# Build and deploy the React frontend
npm run build

# The deploy script automatically uploads to S3 if bucket exists
# Or manually sync to S3:
aws s3 sync dist/ s3://your-frontend-bucket --delete
```

## Configuration

### Environment Variables

The SAM template automatically configures these environment variables for Lambda functions:

- `TABLE_NAME`: DynamoDB table name
- `BASE_URL`: Base URL for short links
- `LOG_LEVEL`: Logging level (INFO by default)

### Custom Domain (Optional)

To use a custom domain like `short.yourdomain.com`:

1. Deploy with custom domain parameter:
   ```bash
   sam deploy --parameter-overrides CustomDomainName=short.yourdomain.com
   ```

2. Create a Route53 hosted zone for your domain
3. Add SSL certificate in AWS Certificate Manager
4. Update CloudFront distribution to use custom domain

### DynamoDB Schema

The DynamoDB table uses this schema:

```javascript
{
  shortId: "abc123",      // Partition key
  longUrl: "https://...",  // Original URL
  createdAt: "2024-01-01T00:00:00Z",
  expiresAt: 1735689600,   // TTL (Unix timestamp)
  clickCount: 42,          // Number of times accessed
  lastAccessed: "2024-01-01T12:00:00Z"
}
```

## API Reference

### POST /shorten

Create a shortened URL.

**Request:**
```json
{
  "longUrl": "https://example.com/very/long/url"
}
```

**Response:**
```json
{
  "shortUrl": "https://short.ly/abc123",
  "shortId": "abc123",
  "longUrl": "https://example.com/very/long/url",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

**Error Response:**
```json
{
  "error": "Validation Error",
  "message": "Invalid URL format"
}
```

### GET /{shortId}

Redirect to the original URL.

**Response:** HTTP 301 redirect to original URL
**Error:** HTTP 404 with friendly error page

## Monitoring

### CloudWatch Metrics

The application tracks these custom metrics:

- `URLsShortened`: Number of URLs shortened
- `RedirectsSuccessful`: Successful redirects
- `RedirectNotFound`: 404 errors
- `ShortenErrors`: Errors during shortening
- `RedirectErrors`: Errors during redirect

## Testing

### Test the API

```bash
# Get your API endpoint from CloudFormation outputs
API_ENDPOINT="https://your-api-id.execute-api.us-east-1.amazonaws.com/dev"

# Test URL shortening
curl -X POST $API_ENDPOINT/shorten \
  -H 'Content-Type: application/json' \
  -d '{"longUrl": "https://github.com/aws/aws-sam-cli"}'

# Test redirect (replace abc123 with actual short ID)
curl -I $API_ENDPOINT/abc123
```

### Local Development

```bash
# Start local development server
npm run dev

# Run SAM local API (requires Docker)
sam local start-api --port 3001
```

## Cleanup

To delete all AWS resources:

```bash
# Delete CloudFormation stack
aws cloudformation delete-stack --stack-name url-shortener-dev

# Empty and delete S3 buckets (if needed)
aws s3 rm s3://your-frontend-bucket --recursive
aws s3 rb s3://your-frontend-bucket
```

## 🐛 Troubleshooting

### Logs Location

- **API Gateway**: `/aws/apigateway/url-shortener-dev`
- **Lambda Functions**: `/aws/lambda/url-shortener-shorten-dev`
- **DynamoDB**: CloudWatch Metrics (no logs by default)
>>>>>>> e4d0bcd14102ae0bf9201dd3d9e623f6eb8c021c

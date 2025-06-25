#!/usr/bin/env node

/**
 * API Testing Script for URL Shortener
 * Tests both the shorten and redirect endpoints
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Configuration
const STACK_NAME = 'url-shortener-dev';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

// Test URLs
const TEST_URLS = [
  'https://github.com/aws/aws-sam-cli',
  'https://docs.aws.amazon.com/lambda/',
  'https://reactjs.org/docs/getting-started.html'
];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

// Get API endpoint from CloudFormation stack
async function getApiEndpoint() {
  try {
    const command = `aws cloudformation describe-stacks --stack-name ${STACK_NAME} --region ${AWS_REGION} --query 'Stacks[0].Outputs[?OutputKey==\`ApiEndpoint\`].OutputValue' --output text`;
    const { stdout } = await execAsync(command);
    return stdout.trim();
  } catch (error) {
    logError(`Failed to get API endpoint: ${error.message}`);
    process.exit(1);
  }
}

// Test URL shortening
async function testShorten(apiEndpoint, longUrl) {
  logInfo(`Testing URL shortening for: ${longUrl}`);
  
  try {
    const command = `curl -s -X POST ${apiEndpoint}/shorten \\
      -H 'Content-Type: application/json' \\
      -d '{"longUrl": "${longUrl}"}'`;
    
    const { stdout } = await execAsync(command);
    const response = JSON.parse(stdout);
    
    if (response.shortUrl && response.shortId) {
      logSuccess(`Short URL created: ${response.shortUrl}`);
      return response;
    } else {
      logError(`Unexpected response: ${stdout}`);
      return null;
    }
  } catch (error) {
    logError(`Failed to shorten URL: ${error.message}`);
    return null;
  }
}

// Test URL redirect
async function testRedirect(apiEndpoint, shortId) {
  logInfo(`Testing redirect for short ID: ${shortId}`);
  
  try {
    const command = `curl -s -I -L ${apiEndpoint}/${shortId}`;
    const { stdout } = await execAsync(command);
    
    // Check for 301 redirect
    if (stdout.includes('HTTP/1.1 301') || stdout.includes('HTTP/2 301')) {
      const locationMatch = stdout.match(/Location: (.+)/i);
      if (locationMatch) {
        const redirectUrl = locationMatch[1].trim();
        logSuccess(`Redirect successful to: ${redirectUrl}`);
        return true;
      }
    }
    
    logError(`Redirect failed. Response: ${stdout}`);
    return false;
  } catch (error) {
    logError(`Failed to test redirect: ${error.message}`);
    return false;
  }
}

// Test invalid URL
async function testInvalidUrl(apiEndpoint) {
  logInfo('Testing invalid URL handling...');
  
  try {
    const command = `curl -s -X POST ${apiEndpoint}/shorten \\
      -H 'Content-Type: application/json' \\
      -d '{"longUrl": "not-a-valid-url"}'`;
    
    const { stdout } = await execAsync(command);
    const response = JSON.parse(stdout);
    
    if (response.error && response.message) {
      logSuccess(`Invalid URL properly rejected: ${response.message}`);
      return true;
    } else {
      logError(`Invalid URL was not rejected: ${stdout}`);
      return false;
    }
  } catch (error) {
    logError(`Failed to test invalid URL: ${error.message}`);
    return false;
  }
}

// Test non-existent short ID
async function testNotFound(apiEndpoint) {
  logInfo('Testing 404 handling for non-existent short ID...');
  
  try {
    const command = `curl -s -I ${apiEndpoint}/nonexistent123`;
    const { stdout } = await execAsync(command);
    
    if (stdout.includes('HTTP/1.1 404') || stdout.includes('HTTP/2 404')) {
      logSuccess('404 handling works correctly');
      return true;
    } else {
      logError(`Expected 404, got: ${stdout}`);
      return false;
    }
  } catch (error) {
    logError(`Failed to test 404: ${error.message}`);
    return false;
  }
}

// Run performance test
async function testPerformance(apiEndpoint, iterations = 5) {
  logInfo(`Running performance test with ${iterations} iterations...`);
  
  const times = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    
    try {
      const command = `curl -s -X POST ${apiEndpoint}/shorten \\
        -H 'Content-Type: application/json' \\
        -d '{"longUrl": "https://example.com/test-${i}"}'`;
      
      await execAsync(command);
      const duration = Date.now() - start;
      times.push(duration);
      
    } catch (error) {
      logWarning(`Performance test iteration ${i + 1} failed`);
    }
  }
  
  if (times.length > 0) {
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    logSuccess(`Performance results:`);
    log(`  Average response time: ${avgTime.toFixed(2)}ms`, colors.cyan);
    log(`  Min response time: ${minTime}ms`, colors.cyan);
    log(`  Max response time: ${maxTime}ms`, colors.cyan);
    
    return avgTime < 5000; // Pass if average is under 5 seconds
  }
  
  return false;
}

// Main test function
async function runTests() {
  log('\n🧪 Starting URL Shortener API Tests\n', colors.bright);
  
  // Get API endpoint
  logInfo('Getting API endpoint from CloudFormation...');
  const apiEndpoint = await getApiEndpoint();
  
  if (!apiEndpoint || apiEndpoint === 'None') {
    logError('Could not retrieve API endpoint. Make sure the stack is deployed.');
    process.exit(1);
  }
  
  logSuccess(`API Endpoint: ${apiEndpoint}`);
  log('─'.repeat(60), colors.cyan);
  
  const results = {
    shorten: 0,
    redirect: 0,
    validation: 0,
    notFound: 0,
    performance: 0,
    total: 0
  };
  
  // Test URL shortening and redirects
  for (const testUrl of TEST_URLS) {
    const shortResult = await testShorten(apiEndpoint, testUrl);
    if (shortResult) {
      results.shorten++;
      
      // Test redirect
      if (await testRedirect(apiEndpoint, shortResult.shortId)) {
        results.redirect++;
      }
    }
    log(''); // Empty line for readability
  }
  
  // Test error handling
  if (await testInvalidUrl(apiEndpoint)) {
    results.validation++;
  }
  log('');
  
  if (await testNotFound(apiEndpoint)) {
    results.notFound++;
  }
  log('');
  
  // Performance test
  if (await testPerformance(apiEndpoint)) {
    results.performance++;
  }
  
  // Calculate total score
  results.total = results.shorten + results.redirect + results.validation + results.notFound + results.performance;
  const maxScore = TEST_URLS.length * 2 + 3; // 2 points per URL (shorten + redirect) + 3 for error handling + performance
  
  // Display results
  log('\n📊 Test Results Summary', colors.bright);
  log('═'.repeat(60), colors.cyan);
  log(`✅ URL Shortening: ${results.shorten}/${TEST_URLS.length}`, colors.green);
  log(`🔀 Redirects: ${results.redirect}/${TEST_URLS.length}`, colors.green);
  log(`🛡️  Validation: ${results.validation}/1`, colors.green);
  log(`❓ 404 Handling: ${results.notFound}/1`, colors.green);
  log(`⚡ Performance: ${results.performance}/1`, colors.green);
  log('─'.repeat(60), colors.cyan);
  log(`🎯 Total Score: ${results.total}/${maxScore}`, colors.bright);
  
  const percentage = (results.total / maxScore) * 100;
  if (percentage >= 80) {
    log(`🎉 Excellent! ${percentage.toFixed(1)}% of tests passed`, colors.green);
  } else if (percentage >= 60) {
    log(`👍 Good! ${percentage.toFixed(1)}% of tests passed`, colors.yellow);
  } else {
    log(`😞 Needs work. ${percentage.toFixed(1)}% of tests passed`, colors.red);
  }
  
  log('\n💡 Tips:', colors.bright);
  log('  • Check CloudWatch logs if tests fail');
  log('  • Verify AWS credentials and permissions');
  log('  • Ensure DynamoDB table has proper permissions');
  log('  • Test individual endpoints manually if needed\n');
  
  // Exit with appropriate code
  process.exit(percentage >= 80 ? 0 : 1);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  logError(`Unhandled error: ${error.message}`);
  process.exit(1);
});

// Run tests
runTests().catch((error) => {
  logError(`Test runner failed: ${error.message}`);
  process.exit(1);
});
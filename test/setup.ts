/**
 * Jest test setup file.
 * Sets environment variables and silences console output during tests.
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.TZ = 'Asia/Manila';
process.env.AWS_REGION = 'ap-southeast-1';
process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
process.env.AWS_S3_BUCKET_NAME = 'test-bucket';
process.env.BEDROCK_MODEL_ID = 'anthropic.claude-3-sonnet-20240229-v1:0';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '1433';
process.env.DB_NAME = 'test_db';
process.env.DB_USER = 'sa';
process.env.DB_PASSWORD = 'test';
process.env.MONOLITH_BASE_URL = 'http://localhost:3000';
process.env.APP_AUTH = 'test-secret';
process.env.GATEWAY_SECRET = 'test-gateway-secret';

// Silence console output during tests
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

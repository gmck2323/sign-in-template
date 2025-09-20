// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Used for __tests__/testing-library.js
// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.IDP_ISSUER = 'https://test.auth0.com'
process.env.IDP_CLIENT_ID = 'test_client_id'
process.env.IDP_CLIENT_SECRET = 'test_client_secret'
process.env.JWT_AUDIENCE = 'test_audience'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
process.env.SESSION_COOKIE_SECRET = 'test_session_secret'
process.env.JWT_MOCK_SECRET = 'test_mock_secret'

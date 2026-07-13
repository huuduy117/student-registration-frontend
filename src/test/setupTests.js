import '@testing-library/jest-dom';
import { server } from './mocks/server';

// Establish API mocking before all tests.
beforeAll(() => server.listen());

// Reset any request handlers that are declared as a part of tests
afterEach(() => server.resetHandlers());

// Clean runtime request handlers after the tests are finished.
afterAll(() => server.close());
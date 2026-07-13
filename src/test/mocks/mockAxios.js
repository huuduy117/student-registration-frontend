import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

const mock = new MockAdapter(axios);

export const mockAPI = {
  onGet: (url, response) => mock.onGet(url).reply(200, response),
  onPost: (url, response) => mock.onPost(url).reply(200, response),
  reset: () => mock.resetHandlers(),
  restore: () => mock.restore(),
};

export default mock;
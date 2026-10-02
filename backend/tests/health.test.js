const request = require('supertest');
const app = require('../src/app');

describe('Healthcheck API', () => {
  test('GET /api/health deve responder status 200 e json com status ok', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('message', 'MEI API está operacional');
    expect(response.body).toHaveProperty('uptime');
    expect(response.body).toHaveProperty('timestamp');
  });
});

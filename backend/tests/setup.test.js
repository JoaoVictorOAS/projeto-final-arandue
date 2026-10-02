const fs = require('fs');
const path = require('path');

describe('Ambiente e Scaffolding', () => {
  test('deve conter arquivo .env.example e package.json no backend', () => {
    const envExists = fs.existsSync(path.resolve(__dirname, '../.env.example'));
    const pkgExists = fs.existsSync(path.resolve(__dirname, '../package.json'));
    expect(envExists).toBe(true);
    expect(pkgExists).toBe(true);
  });

  test('deve conter arquivo .env no backend', () => {
    const envExists = fs.existsSync(path.resolve(__dirname, '../.env'));
    expect(envExists).toBe(true);
  });
});

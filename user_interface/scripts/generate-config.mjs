import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const configPath = resolve(process.cwd(), 'src/assets/config.json');

const currentConfig = JSON.parse(readFileSync(configPath, 'utf-8'));

const nextConfig = {
  ...currentConfig,
  apiBaseUrl:
    process.env.API_BASE_URL ||
    currentConfig.apiBaseUrl ||
    'https://75l952sqbk.execute-api.us-east-1.amazonaws.com',
  propertyApiPath: process.env.PROPERTY_API_PATH || currentConfig.propertyApiPath || '/poc-properties/api/property',
  propertyApiToken: process.env.PROPERTY_API_TOKEN || currentConfig.propertyApiToken || '',
};

writeFileSync(configPath, `${JSON.stringify(nextConfig, null, 2)}\n`, 'utf-8');
console.log('Updated src/assets/config.json from environment variables.');

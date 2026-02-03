import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

async function getApiSchema(): Promise<void> {
  const res = await fetch('http://localhost:3000/api-json');
  const json = await res.json();
  const outputPath = path.join(__dirname, '..', 'bikecheckapi_schema.json');
  await fs.writeFile(outputPath, JSON.stringify(json, null, 2));

  console.log(
    chalk.yellow.bgGreen.bold(`--- OpenAPI schema successfully exported ---`),
  );
}

getApiSchema().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});

import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

async function getApiSchema(): Promise<void> {
  const res = await fetch('http://localhost:3000/api-json');
  const json = await res.json();
  const schema = JSON.stringify(json, null, 2);
  if (schema.length < 100) {
    throw new Error('Fetched schema is probably not contain full api schema');
  }
  const outputPath = path.join(__dirname, '..', 'bikecheckapi_schema.json');
  await fs.writeFile(outputPath, schema);
  console.log(
    chalk.yellow.bgGreen.bold(`--- OpenAPI schema successfully exported ---`),
  );
}

getApiSchema().catch((err) => {
  console.error(chalk.yellow.bgRed.bold('Error:', err.message));
  process.exit(1);
});

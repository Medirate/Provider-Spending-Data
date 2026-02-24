import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';
import { from as copyFrom } from 'pg-copy-streams';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'medicaid-provider-spending_part258');
const TABLE_NAME = 'provider_spending';

const DATABASE_URL = process.env.DATABASE_URL;
const RESUME_AFTER = Math.max(0, parseInt(process.env.RESUME_AFTER || '0', 10));

if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL in environment (.env).');
  process.exit(1);
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds
      .toString()
      .padStart(2, '0')}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  }

  return `${seconds}s`;
}

function printProgress(stats) {
  const now = Date.now();
  const elapsedMs = now - stats.startTime;

  const progress =
    stats.totalFiles > 0
      ? Math.min(Math.max(stats.completedFiles / stats.totalFiles, 0), 1)
      : 0;

  const percent = (progress * 100).toFixed(2);

  let etaStr = 'unknown';
  if (progress > 0 && progress < 1) {
    const etaMs = elapsedMs * (1 / progress - 1);
    etaStr = formatDuration(etaMs);
  }

  const line = [
    `Files: ${stats.completedFiles}/${stats.totalFiles}`,
    `Progress: ${percent}%`,
    `Elapsed: ${formatDuration(elapsedMs)}`,
    `ETA: ${etaStr}`,
  ].join(' | ');

  process.stdout.write(`\r${line}`);
}

async function importFile(client, filePath, stats) {
  const fileName = path.basename(filePath);
  console.log(`\nImporting ${fileName}...`);

  const stream = fs.createReadStream(filePath);

  const copySql = `COPY ${TABLE_NAME} (
    billing_provider_npi_num,
    servicing_provider_npi_num,
    hcpcs_code,
    claim_from_month,
    total_unique_beneficiaries,
    total_claims,
    total_paid
  )
  FROM STDIN WITH (FORMAT csv, HEADER true)`;

  await new Promise((resolve, reject) => {
    const dbStream = client.query(copyFrom(copySql));

    dbStream.on('error', (err) => {
      reject(err);
    });

    dbStream.on('finish', () => {
      resolve();
    });

    stream.on('error', (err) => {
      reject(err);
    });

    stream.pipe(dbStream);
  });

  stats.completedFiles += 1;
  printProgress(stats);

  console.log(`\nFinished ${fileName}`);
}

async function main() {
  if (!fs.existsSync(DATA_DIR)) {
    console.error(`Data directory not found: ${DATA_DIR}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.endsWith('.csv'))
    .sort();

  if (!files.length) {
    console.error(`No .csv files found in ${DATA_DIR}`);
    process.exit(1);
  }

  const skipCount = RESUME_AFTER;
  const filesToProcess = skipCount > 0 ? files.slice(skipCount) : files;

  if (filesToProcess.length === 0) {
    console.log('No files to process (RESUME_AFTER >= total files?). Done.');
    return;
  }

  if (skipCount > 0) {
    console.log(
      `\nResume mode: skipping first ${skipCount} files, uploading remaining ${filesToProcess.length} files (no truncate).\n`,
    );
  } else {
    console.log(
      `Found ${files.length} CSV files in ${DATA_DIR}. Starting COPY-based import...`,
    );
  }

  const stats = {
    totalFiles: filesToProcess.length,
    completedFiles: 0,
    startTime: Date.now(),
  };

  const client = new Client({
    connectionString: DATABASE_URL,
  });

  await client.connect();

  try {
    if (skipCount === 0) {
      console.log('\nTruncating existing data in table...');
      await client.query(`TRUNCATE TABLE ${TABLE_NAME};`);
    }

    for (const file of filesToProcess) {
      const filePath = path.join(DATA_DIR, file);
      await importFile(client, filePath, stats);
    }

    process.stdout.write('\n');
    console.log('All files imported successfully.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});


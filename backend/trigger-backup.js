// This script triggers a backup by running the auto-backup.js script from the backend/scripts directory.
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function triggerBackup() {
  const scriptPath = path.resolve(__dirname, 'scripts', 'auto-backup.js');
  exec(`node "${scriptPath}"`, (error, stdout, stderr) => {
    if (error) {
      console.error('Backup trigger failed:', error);
    } else {
      console.log('Backup triggered successfully:', stdout);
    }
    if (stderr) {
      console.error('Backup trigger stderr:', stderr);
    }
  });
}

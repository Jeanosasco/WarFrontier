import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export type TransactionFile = {
  path: string;
  content: string;
  mustNotExist?: boolean;
};

type PreparedFile = TransactionFile & {
  temporaryPath: string;
  backupPath: string;
  hadOriginal: boolean;
};

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await import('node:fs/promises').then(({ access }) => access(filePath));
    return true;
  } catch {
    return false;
  }
}

/**
 * Writes a group of UTF-8 files as one recoverable transaction.
 *
 * Each file is first written beside its destination using a unique temporary
 * name. Existing destinations are moved to backups before temporary files are
 * promoted. If any promotion fails, all promoted files are removed and every
 * available backup is restored.
 */
export async function writeFilesTransaction(files: TransactionFile[]): Promise<void> {
  if (files.length === 0) {
    return;
  }

  const destinations = new Set<string>();
  for (const file of files) {
    const destination = path.resolve(file.path);
    if (destinations.has(destination)) {
      throw new Error(`Duplicate transaction destination: ${destination}`);
    }
    destinations.add(destination);
  }

  const transactionId = randomUUID();
  const prepared: PreparedFile[] = [];
  const promoted: PreparedFile[] = [];
  const backedUp: PreparedFile[] = [];

  try {
    for (const file of files) {
      const destination = path.resolve(file.path);
      await mkdir(path.dirname(destination), { recursive: true });

      const hadOriginal = await pathExists(destination);
      if (file.mustNotExist && hadOriginal) {
        throw new Error(`Refusing to overwrite existing file: ${destination}`);
      }

      const temporaryPath = `${destination}.tmp-${transactionId}`;
      const backupPath = `${destination}.bak-${transactionId}`;
      await writeFile(temporaryPath, file.content, { encoding: 'utf8', flag: 'wx' });

      prepared.push({
        ...file,
        path: destination,
        temporaryPath,
        backupPath,
        hadOriginal,
      });
    }

    for (const file of prepared) {
      if (file.hadOriginal) {
        await rename(file.path, file.backupPath);
        backedUp.push(file);
      }
    }

    for (const file of prepared) {
      await rename(file.temporaryPath, file.path);
      promoted.push(file);
    }

    await Promise.all(
      backedUp.map((file) => rm(file.backupPath, { force: true })),
    );
  } catch (error) {
    await Promise.allSettled(
      promoted.map((file) => rm(file.path, { force: true })),
    );

    for (const file of [...backedUp].reverse()) {
      if (await pathExists(file.backupPath)) {
        await rename(file.backupPath, file.path);
      }
    }

    await Promise.allSettled(
      prepared.flatMap((file) => [
        rm(file.temporaryPath, { force: true }),
        rm(file.backupPath, { force: true }),
      ]),
    );

    throw error;
  } finally {
    await Promise.allSettled(
      prepared.map((file) => rm(file.temporaryPath, { force: true })),
    );
  }
}

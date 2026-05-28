import { PrismaClient } from '@prisma/client';
import { decrypt, encrypt } from '../modules/admin/crypto.util';

async function main() {
  const oldKey = process.env.OLD_ENCRYPTION_KEY;
  const newKey = process.env.NEW_ENCRYPTION_KEY;

  if (!oldKey || !newKey) {
    console.error(
      'ERROR: Both OLD_ENCRYPTION_KEY and NEW_ENCRYPTION_KEY environment variables must be defined.',
    );
    process.exit(1);
  }

  if (oldKey === newKey) {
    console.error(
      'ERROR: OLD_ENCRYPTION_KEY and NEW_ENCRYPTION_KEY cannot be identical.',
    );
    process.exit(1);
  }

  console.log('Starting system settings encryption key rotation...');

  const prisma = new PrismaClient();

  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'system_settings' },
    });

    if (!setting) {
      console.log(
        'No system settings record found in the database. Rotation is not required.',
      );
      return;
    }

    console.log(
      `Found system settings (Version: ${setting.version}). Processing value string...`,
    );
    const savedConfig = JSON.parse(setting.value) as {
      smtp_password?: string;
      [key: string]: any;
    };

    if (savedConfig.smtp_password) {
      console.log('SMTP password detected. Decrypting with old key...');
      const decryptedPassword = decrypt(savedConfig.smtp_password, oldKey);
      console.log('Decrypted successfully. Re-encrypting with new key...');
      const reEncryptedPassword = encrypt(decryptedPassword, newKey);
      savedConfig.smtp_password = reEncryptedPassword;
      console.log('SMTP password re-encrypted with new key.');
    } else {
      console.log(
        'No SMTP password configured. System settings do not require credential updates.',
      );
    }

    // Save rotated configuration to database in transaction
    await prisma.$transaction(async (tx) => {
      await tx.systemSetting.update({
        where: { key: 'system_settings' },
        data: {
          value: JSON.stringify(savedConfig),
          version: { increment: 1 },
        },
      });
    });

    console.log(
      'SUCCESS: System settings encryption key successfully rotated!',
    );
  } catch (error) {
    console.error(
      'FATAL ERROR: Rotation failed. Ensure the old key is correct.',
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});

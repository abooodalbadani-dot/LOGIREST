export interface AppConfiguration {
  metrics: {
    token: string;
  };
  encryption: {
    key: string;
  };
  backup: {
    encryptionKey: string;
    s3Bucket: string;
    s3Region: string;
  };
  csrf: {
    enabled: boolean;
  };
}

export default (): AppConfiguration => ({
  metrics: {
    token:
      process.env.METRICS_TOKEN ||
      process.env.METRICS_SECRET ||
      'dev-metrics-token',
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY || '',
  },
  backup: {
    encryptionKey: process.env.BACKUP_ENCRYPTION_KEY || '',
    s3Bucket: process.env.BACKUP_S3_BUCKET || 'logirest-backups',
    s3Region: process.env.BACKUP_S3_REGION || 'eu-west-1',
  },
  csrf: {
    enabled:
      process.env.NODE_ENV === 'production' ||
      process.env.CSRF_ENABLED === 'true',
  },
});

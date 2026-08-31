import { Injectable } from '@nestjs/common';

@Injectable()
export class SecurityConfig {
  // Password Policy Configuration
  static readonly PASSWORD_POLICY = {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL_CHARS: true,
    SPECIAL_CHARS: '~!@#$%^&*()_+={}:<>.',
    MAX_AGE_DAYS: 90, // Password expiration
    HISTORY_COUNT: 5, // Prevent reuse of last 5 passwords
  };

  // Account Lockout Configuration
  static readonly ACCOUNT_LOCKOUT = {
    MAX_ATTEMPTS: 5,
    LOCKOUT_DURATION_MINUTES: 30,
    RESET_ATTEMPTS_AFTER_HOURS: 24,
  };

  // Session Configuration
  static readonly SESSION = {
    ACCESS_TOKEN_EXPIRY_MINUTES: 15,
    REFRESH_TOKEN_EXPIRY_DAYS: 4,
    EXTERNAL_TIMEOUT_MINUTES: 10,
    INTERNAL_TIMEOUT_MINUTES: 30,
    CONCURRENT_SESSIONS_ALLOWED: false,
  };

  // Rate Limiting Configuration
  static readonly RATE_LIMITS = {
    LOGIN_ATTEMPTS_PER_HOUR: 10,
    REGISTRATION_PER_HOUR: 3,
    PASSWORD_RESET_PER_HOUR: 3,
    GENERAL_API_PER_MINUTE: 10,
    KYC_SUBMISSION_PER_DAY: 5,
  };

  // MFA Configuration
  static readonly MFA = {
    ISSUER: 'LandTrax',
    ALGORITHM: 'sha1',
    DIGITS: 6,
    PERIOD: 30,
    WINDOW: 2, // Allow 2 time windows for clock drift
    BACKUP_CODES_COUNT: 10,
  };

  // Encryption Configuration
  static readonly ENCRYPTION = {
    ALGORITHM: 'aes-256-cbc',
    SALT_ROUNDS: 12,
    KEY_LENGTH: 32,
  };

  // Audit Logging Configuration
  static readonly AUDIT = {
    RETENTION_DAYS: 90,
    LOG_SENSITIVE_DATA: false,
    LOG_PASSWORD_CHANGES: true,
    LOG_LOGIN_ATTEMPTS: true,
    LOG_DATA_ACCESS: true,
    LOG_ADMIN_ACTIONS: true,
  };

  // KYC Configuration
  static readonly KYC = {
    DOCUMENT_TYPES: [
      "Driver's License",
      'Passport',
      'National ID',
      'SSS ID',
      'GSIS ID',
      'PhilHealth ID',
      'TIN ID',
      "Voter's ID",
    ],
    OCR_CONFIDENCE_THRESHOLD: 70,
    AI_VERIFICATION_THRESHOLD: 80,
    MANUAL_REVIEW_THRESHOLD: 60,
    MAX_FILE_SIZE_MB: 10,
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/jpg'],
  };

  // reCAPTCHA Configuration
  static readonly RECAPTCHA = {
    VERSION: 'v3',
    SCORE_THRESHOLD: 0.5,
    TIMEOUT_SECONDS: 10,
  };

  // Security Headers
  static readonly SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'",
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy':
      'accelerometer=(), ambient-light-sensor=(), autoplay=(), battery=(), camera=(), ' +
      'cross-origin-isolated=(), display-capture=(), document-domain=(), encrypted-media=(), ' +
      'execution-while-not-rendered=(), execution-while-out-of-viewport=(), fullscreen=(), ' +
      'geolocation=(), gyroscope=(), keyboard-map=(), magnetometer=(), microphone=(), ' +
      'midi=(), navigation-override=(), payment=(), picture-in-picture=(), ' +
      'publickey-credentials-get=(), screen-wake-lock=(), sync-xhr=(), usb=(), ' +
      'web-share=(), xr-spatial-tracking=()',
  };

  // Cookie Configuration
  static readonly COOKIES = {
    HTTP_ONLY: true,
    SECURE: true, // HTTPS only in production
    SAME_SITE: 'strict',
    DOMAIN: process.env.COOKIE_DOMAIN || undefined,
  };

  // File Upload Security
  static readonly FILE_UPLOAD = {
    MAX_SIZE_MB: 10,
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
    SCAN_FOR_MALWARE: true,
    VIRUS_SCAN_TIMEOUT: 30000, // 30 seconds
  };

  // IP Whitelisting
  static readonly IP_WHITELIST = {
    ENABLED: false,
    ALLOWED_IPS: ['127.0.0.1', '::1'],
    BLOCKED_IPS: [] as string[],
  };

  // Database Security
  static readonly DATABASE = {
    CONNECTION_TIMEOUT: 30000,
    QUERY_TIMEOUT: 60000,
    MAX_CONNECTIONS: 100,
    ENCRYPT_CONNECTION: true,
    AUDIT_QUERIES: true,
  };

  // API Security
  static readonly API_SECURITY = {
    REQUIRE_HTTPS: true,
    CORS_ORIGINS: process.env.CORS_ORIGINS?.split(',') || ['https://ltrx.questsrv.com'],
    CORS_CREDENTIALS: true,
    CORS_METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    CORS_HEADERS: ['Content-Type', 'Authorization', 'X-Requested-With'],
  };

  // Logging Configuration
  static readonly LOGGING = {
    LEVEL: process.env.LOG_LEVEL || 'info',
    FORMAT: 'json',
    INCLUDE_STACK_TRACE: false,
    MASK_SENSITIVE_DATA: true,
    SENSITIVE_FIELDS: ['password', 'token', 'secret', 'key', 'ssn', 'credit_card'],
  };

  // Notification Security
  static readonly NOTIFICATIONS = {
    EMAIL_VERIFICATION_REQUIRED: true,
    SMS_VERIFICATION_REQUIRED: false,
    NOTIFICATION_RATE_LIMIT: 5, // per hour
    MAX_NOTIFICATIONS_PER_DAY: 20,
  };

  // Backup and Recovery
  static readonly BACKUP = {
    ENABLED: true,
    FREQUENCY_HOURS: 24,
    RETENTION_DAYS: 30,
    ENCRYPT_BACKUPS: true,
    TEST_RESTORE_FREQUENCY_DAYS: 7,
  };

  // Compliance
  static readonly COMPLIANCE = {
    GDPR_ENABLED: true,
    DATA_RETENTION_DAYS: 2555, // 7 years
    RIGHT_TO_BE_FORGOTTEN: true,
    DATA_PORTABILITY: true,
    CONSENT_MANAGEMENT: true,
  };

  // Development vs Production
  static isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev';
  }

  static isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  static isTest(): boolean {
    return process.env.NODE_ENV === 'test';
  }

  // Get configuration based on environment
  static getConfig() {
    const baseConfig = {
      passwordPolicy: this.PASSWORD_POLICY,
      accountLockout: this.ACCOUNT_LOCKOUT,
      session: this.SESSION,
      rateLimits: this.RATE_LIMITS,
      mfa: this.MFA,
      encryption: this.ENCRYPTION,
      audit: this.AUDIT,
      kyc: this.KYC,
      recaptcha: this.RECAPTCHA,
      securityHeaders: this.SECURITY_HEADERS,
      cookies: this.COOKIES,
      fileUpload: this.FILE_UPLOAD,
      ipWhitelist: this.IP_WHITELIST,
      database: this.DATABASE,
      apiSecurity: this.API_SECURITY,
      logging: this.LOGGING,
      notifications: this.NOTIFICATIONS,
      backup: this.BACKUP,
      compliance: this.COMPLIANCE,
    };

    // Override for development
    if (this.isDevelopment()) {
      baseConfig.rateLimits.GENERAL_API_PER_MINUTE = 100;
      baseConfig.session.ACCESS_TOKEN_EXPIRY_MINUTES = 60;
      baseConfig.cookies.SECURE = false;
      baseConfig.apiSecurity.REQUIRE_HTTPS = false;
    }

    // Override for test
    if (this.isTest()) {
      baseConfig.rateLimits.GENERAL_API_PER_MINUTE = 1000;
      baseConfig.session.ACCESS_TOKEN_EXPIRY_MINUTES = 60;
      baseConfig.audit.RETENTION_DAYS = 1;
    }

    return baseConfig;
  }
}

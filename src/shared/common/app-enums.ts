export enum API_TAGS {
  ENTITY_CODE = 'Entity Code',
  SYSTEM_SETTINGS = 'System Settings',
  UTILITIES = 'Utilities',
  PUBLIC_BRANDING = 'Public Branding',
  ADMIN = 'admin',
  BRANDING = 'Branding',
  REPORTS = 'Reports',
  AUTH = 'Authentication',
  ACCESS_CONTROL = 'Access Control',
  ACCESSIBLE_LINK = 'Accessible Link',
  ADMIN_DASHBOARD = 'Admin Dashboard',
  AUDIT_TRAIL = 'Audit Trail',
  COLLECTION = 'Collection',
  COLLECTION_METHOD = 'Collection Method',
  COMPANY = 'Company',
  DOCUMENT = 'Document',
  DASHBOARD = 'Dashboard',
  EMAIL = 'Email',
  EMAIL_TEMPLATE = 'Email Template',
  EMAIL_TEMPLATE_COLOR = 'Email Template Color',
  EMAIL_TEMPLATE_RECIPIENT = 'Email Template Recipient',
  EMAIL_LOG = 'Email Log',
  FAQ = 'FAQs',
  NOTIFICATION = 'Notification',
  OCR = 'OCR',
  PAY_TYPE = 'Pay Type',
  PROPOSAL_REFERENCE = 'Proposal Reference',
  REQUIREMENT = 'Requirement',
  REQUIREMENT_MAPPING = 'Requirement Mapping',
  ROLE = 'role',
  ROLE_ACCESSIBLE_LINK = 'Role Accessible Link',
  SERVICE = 'Service',
  STAGING = 'Staging',
  TRANSACTION = 'Transaction',
  TRANSACTION_SERVICE = 'Transaction Service',
  USER = 'User',
  USER_COMPANY = 'User Company',
  USER_ROLE = 'User Role',
  WIDGET = 'Widget',
  STAGING_STATUS = 'Staging Status',
  STAGING_STATUS_FINDING = 'Staging Status Finding',
  SERVICE_CHECKLIST = 'Service Checklist',
  TAG = 'Tag',
  CATEGORY = 'Category',
  TRANSACTION_SERVICE_REQUIREMENT = 'Transaction Service Requirement',
  MASTER_FILE = 'Master File',
  CONTACT = 'Contact',
  COURIER_PROVIDER = 'Courier Provider',
  LANDTRAX_ADDRESS = 'LandTrax Address',
  COURIER = 'Courier',
  COURIER_CLIENT = 'Courier Client',
  REGISTRY_OF_DEED = 'Registry of Deed',
}
export enum USER_TYPE {
  ALL = 'all',
  ADMINISTRATOR = 'Administrator',
  INDIVIDUAL = 'Individual',
  CORPORATE = 'Corporate',
} // these are static & cannot be changed unless another entity joined

export enum CONTROLLER {
  UTILITIES = 'utilities',
  ADMIN = 'admin',
  PUBLIC_BRANDING = 'public/branding',
  BRANDING = 'branding',
  REPORTS = 'reports',
  ACCESS_CONTROL = 'access-control',

  // masterfiles
  ENTITY_CODE = 'entity-codes',
  ENTITY_CODE_V2 = 'v2/entity-code',
  ADDRESS = 'address',
  USER = 'user',
  USER_V2 = 'v2/user',
  USER_CORPORATE = 'user-corporate',
  USER_ROLE = 'user-role',
  ROLE = 'role',
  ROLE_ACCESSIBLE_LINK = 'role-accessible-link',
  USER_COMPANY = 'user-company',
  COMPANY = 'company',
  PROPOSAL_REFERENCE = 'proposal-reference',
  REQUIREMENT_MAPPING = 'requirement-mapping',
  REQUIREMENT = 'requirement',
  SERVICE = 'service',
  SERVICES_CHECKLIST = 'service-checklist',
  EMAIL = 'email',
  EMAIL_TEMPLATE = 'email-template',
  EMAIL_TEMPLATE_COLOR = 'email-template-color',
  EMAIL_TEMPLATE_RECIPIENT = 'email-template-recipient',
  EMAIL_LOG = 'email-log',

  // transactions
  TRANSACTION_SERVICE = 'transaction-service',
  TRANSACTION_SERVICE_V2 = 'v2/transaction-service',
  COLLECTION = 'collection',
  COLLECTION_METHOD = 'collection-method',
  TRANSACTION = 'transaction',
  TRANSACTION_V2 = 'v2/transaction',
  CART = 'cart',
  FEEDBACK = 'feedback',

  // utilities
  ACCESSIBLE_LINK = 'accessible-link',
  AUDIT_TRAIL = 'audit-trail',
  WIDGET = 'widget',
  DOCUMENT = 'document',
  DOCUMENT_V2 = 'v2/document',
  OCR = 'ocr',
  EXTRACTED_FIELDS = 'extracted-fields',

  // settings
  SYSTEM_SETTINGS = 'system-settings',
  EOS_CONFIG = 'eos-config',

  // to be confirmed
  ROLE_BASED_ACCESS_CONTROL = 'role-based-access-control',
  ADMIN_DASHBOARD = 'admin-dashboard',
  ADMIN_PROFILE = 'admin-profile',
  MASTERFILE = 'masterfile',
  MASTER_FILE = 'admin/master-files',
  AUTH = 'auth',
  ADMIN_SERVICE = 'admin/services',
  B2C_TRANSACTION = 'transactions/b2c',
  REQUIREMENT_MANAGEMENT = 'admin/requirement',
  DRAFT_TRANSACTION = 'drafts',

  COURIER_PROVIDER = 'courier-provider',
  LANDTRAX_ADDRESS = 'landtrax-address',
  COURIER = 'courier',
  COURIER_CLIENT = 'client/courier',
  CONTACT = 'contact',
  DASHBOARD = 'dashboard',
  PAYMENT = 'payment',
  KYC_APPROVAL = 'kyc-approval',
  FAQ = 'faq',
  NOTIFICATION = 'notification',
  PAY_TYPE = 'pay-type',
  STAGING = 'staging',
  STAGING_STATUS = 'staging-status',
  STAGING_STATUS_FINDING = 'staging-status-finding',
  TAG = 'tag',
  CATEGORY = 'category',
  TRANSACTION_SERVICE_REQUIREMENT = 'transaction-service-requirement',
  REGISTRY_OF_DEED = 'registry-of-deed',
}

export enum API_SECURITY {
  JWT_AUTH = 'JWT-auth',
}

export enum CollectionStatus {
  PENDING = 'Pending',
  PARTIALLY_PAID = 'Partially Paid',
  FULLY_PAID = 'Fully Paid',
}

export enum DocumentCategory {
  // Transaction Service Level - Requirements
  REQUIREMENT = 'REQUIREMENT', // Documents linked to specific requirements (has requirementId)

  // Transaction Service Level - Additional Documents
  SUPPORTING_DOCUMENT = 'SUPPORTING_DOCUMENT', // Supporting documents for the service
  OUTPUT_DOCUMENT = 'OUTPUT_DOCUMENT', // Output/result documents from the service

  // Transaction Level - Official Documents
  EOS = 'EOS', // Engagement of Service documents
  RECEIPT = 'RECEIPT', // Official Receipts (OR)
  RECIPIENT_ID = 'RECIPIENT_ID', // Recipient identification documents (via RecipientDocuments join)

  // Legacy/Other Categories
  CERTIFICATE = 'CERTIFICATE',
  PROOF_OF_DELIVERY = 'PROOF_OF_DELIVERY',
  POD = 'POD',

  OTHER_FILES = 'OTHER_FILES',
  OTHER = 'OTHER',
}

export enum ProgressStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum AnalyticsPeriod {
  LAST_7_DAYS = '7d',
  LAST_30_DAYS = '30d',
  LAST_90_DAYS = '90d',
  LAST_YEAR = '1y',
  ALL_TIME = 'all',
}

export enum AnalyticsGroupBy {
  SERVICE = 'service',
  STATUS = 'status',
  MONTH = 'month',
}

interface LogsModel {
  createdBy: string; // uuid-FK to user-model
  createdDate: Date; //
  updatedBy?: string | null; // uuid-FK to user-model
  updatedDate?: Date | null;
  deletedBy?: string | null; // uuid-FK to user-model
  deletedDate?: Date | null;
}
export interface LineModel {
  id: string;
  createdDate: Date;
  updatedDate?: Date | null;
  deletedDate?: Date | null;
}
export interface BaseModel extends LogsModel {
  id: string; // uuid
}

export enum Entities {
  // Generic
  BASE = 'Base',
  LOGS = 'Logs',
  LINE = 'Line',

  // IAM Service
  USER = 'User',
  USER_ROLE = 'UserRole',
  ROLE = 'Role',
  ROLE_ACCESSIBLE_LINK = 'RoleAccessibleLink',
  USER_COMPANY = 'UserCompany',
  COMPANY = 'Company',
  ENTITY_CODE = 'EntityCode',

  // Reference Service
  REQUIREMENT_MAPPING = 'RequirementMapping',
  REQUIREMENT = 'Requirement',
  
  LANDTRAX_ADDRESS = 'LandtraxAddress',
  REGISTRY_OF_DEED = 'RegistryOfDeed',
  FAQ = 'FAQ',

  SERVICE = 'Service',
  SERVICE_CHECKLIST = 'ServiceChecklist',
  STAGING_STATUS = 'StagingStatus',
  STAGING_STATUS_FINDING = 'StagingStatusFinding',
  STAGING = 'Staging',
  CATEGORY = 'Category',
  COURIER_PROVIDER='CourierProvider',

  // Transaction Service
  TRANSACTION = 'Transaction',
  TRANSACTION_CODE = 'TransactionCode',
  TRANSACTION_SERVICE = 'TransactionService',
  TRANSACTION_HISTORY = 'TransactionHistory',
  TRANSACTION_SERVICE_REQUIREMENT = 'TransactionServiceRequirement',
  PROPOSAL_REFERENCE = 'ProposalReference',

  FEEDBACK = 'Feedback',
  DOCUMENT = 'Document',
  EXTRACTED_FIELDS = 'ExtractedFields',
  RECIPIENT = 'Recipient',
  RECIPIENT_DOCUMENTS = 'RecipientDocuments',

  // Payment Service
  COLLECTION = 'Collection',
  COLLECTION_METHOD = 'CollectionMethod',
  COLLECTION_RECEIPT = 'CollectionReceipts',
  MAYA_CHECKOUT = 'MayaCheckout',
  PAY_TYPE = 'PayType',

  // utilities
  ACCESSIBLE_LINK = 'AccessibleLink',
  NOTIFICATION = 'Notification',
  AUDIT_TRAIL = 'AuditTrail',
  WIDGET = 'Widget',
 
  EMAIL_TEMPLATE = 'EmailTemplate',
  EMAIL_TEMPLATE_COLOR = 'EmailTemplateColor',
  EMAIL_TEMPLATE_RECIPIENT = 'EmailTemplateRecipient',
  EMAIL_LOG = 'EmailLog',

  MFA_OTP = 'MfaOtp',
  BLACKLISTED_TOKEN = 'BlacklistedToken',

  // settings
  SYSTEM_SETTINGS = 'SystemSettings',

  // REPORTS
  EXPORT_AUDIT_JOB = 'AuditExportJob'
}

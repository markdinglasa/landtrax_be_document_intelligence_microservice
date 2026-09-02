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

export enum ENTITY {
  BASE = 'Base',
  LOGS = 'Logs',
  LINE = 'Line',
  // masterfiles
  USER = 'User',
  USER_ROLE = 'UserRole',
  ROLE = 'Role',
  ROLE_ACCESSIBLE_LINK = 'RoleAccessibleLink',
  USER_COMPANY = 'UserCompany',
  COMPANY = 'Company',
  PROPOSAL_REFERENCE = 'ProposalReference',
  REQUIREMENT_MAPPING = 'RequirementMapping',
  REQUIREMENT = 'Requirement',
  SERVICE = 'Service',
  SERVICE_CHECKLIST = 'ServiceChecklist',
  STAGING_STATUS = 'StagingStatus',
  STAGING_STATUS_FINDING = 'StagingStatusFinding',
  STAGING = 'Staging',
  PAY_TYPE = 'PayType',
  FAQ = 'FAQ',
  CATEGORY = 'Category',
  TAG = 'Tag',
  DOCUMENT_TAG = 'DocumentTag',
  MASTER_FILE = 'MasterFile',
  ADDRESS = 'Address',
  BRANDING = 'Branding',
  MASTERFILE = 'Masterfile', // to be removed

  // transactions
  TRANSACTION_SERVICE = 'TransactionService',
  TRANSACTION_HISTORY = 'TransactionHistory',
  TRANSACTION_SERVICE_REQUIREMENT = 'TransactionServiceRequirement',
  COLLECTION = 'Collection',
  COLLECTION_METHOD = 'CollectionMethod',
  COLLECTION_RECEIPT = 'CollectionReceipts',
  TRANSACTION = 'Transaction',
  TRANSACTION_CODE = 'TransactionCode',
  CART = 'Cart',
  FEEDBACK = 'Feedback',
  RECIPIENT = 'Recipient',
  RECIPIENT_DOCUMENTS = 'RecipientDocuments',

  // utilities
  ACCESSIBLE_LINK = 'AccessibleLink',
  NOTIFICATION = 'Notification',
  AUDIT_TRAIL = 'AuditTrail',
  WIDGET = 'Widget',
  DOCUMENT = 'Document',
  EMAIL_TEMPLATE = 'EmailTemplate',
  EMAIL_TEMPLATE_COLOR = 'EmailTemplateColor',
  EMAIL_TEMPLATE_RECIPIENT = 'EmailTemplateRecipient',
  ENTITY_CODE = 'EntityCode',
  MFA_OTP = 'MfaOtp',
  EXTRACTED_FIELDS = 'ExtractedFields',
  COURIER_PROVIDER = 'CourierProvider',
  BLACKLISTED_TOKEN = 'BlacklistedToken',

  // settings
  SYSTEM_SETTINGS = 'SystemSettings',

  // email log
  EMAIL_LOG = 'EmailLog',

  // maya checkout
  MAYA_CHECKOUT = 'MayaCheckout',

  // registry of deeds
  REGISTRY_OF_DEED = 'RegistryOfDeed',

  // system address
  LANDTRAX_ADDRESS = 'LandtraxAddress',

  // document intelligence
  OCR_REQUEST_HISTORY = 'OCRRequestHistory',
}

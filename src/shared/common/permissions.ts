// fine-grain permissions on role-base access control
export enum AppPermission {
  // User Management Permissions(47)
  VIEW_USER_MANAGEMENT_PAGE = 'View User Management Page',
  VIEW_USER_DETAILS = 'View User Details',
  CREATE_CORPORATE_USER = 'Create Corporate User', //
  CREATE_INTERNAL_USER = 'Create Internal User',
  CREATE_INDIVIDUAL_USER = 'Create Individual User',

  EDIT_USER_ACCOUNT_INFORMATION = 'Edit User Account Information',
  EDIT_USER_PERMISSIONS = 'Edit User Permissions',
  EDIT_USER_ROLE = 'Edit User Role',
  DELETE_USER = 'Delete User',
  APPROVE_USER_REGISTRATION = 'Approve User Registration',
  REJECT_USER_REGISTRATION = 'Reject User Registration',
  UNLOCK_USER_ACCOUNT = 'Unlock User Account',
  RESET_USER_PASSWORD = 'Reset User Password',
  SEND_PASSWORD_RECOVERY_EMAIL = 'Send Password Recovery Email',
  ACTIVATE_USER = 'Activate User',
  DEACTIVATE_USER = 'Deactivate User',
  ADD_COMPANY_ENTITY_CODE = 'Add Company Entity Code',
  EDIT_COMPANY_ENTITY_CODE = 'Edit Company Entity Code',
  DELETE_COMPANY_ENTITY_CODE = 'Delete Company Entity Code',
  VIEW_COMPANY_ENTITY_CODE = 'View Company Entity Code', // details
  ADD_PROPOSAL_REFERENCE_NUMBER = 'Add Proposal Reference Number',
  EDIT_PROPOSAL_REFERENCE_NUMBER = 'Edit Proposal Reference Number',
  DELETE_PROPOSAL_REFERENCE_NUMBER = 'Delete Proposal Reference Number',

  // Transaction Permissions (35)
  VIEW_TRANSACTIONS_PAGE = 'View Transactions Page',
  VIEW_TRANSACTION_DETAILS = 'View Transaction Details',
  LODGE_TRANSACTION = 'Lodge Transaction',
  CHANGE_TRANSACTION_STATUS = 'Change Transaction Status',

  DELETE_TRANSACTION = 'Delete Transaction',
  APPROVE_DELETE_TRANSACTION = 'Approve Delete Transaction',
  REJECT_DELETE_TRANSACTION = 'Reject Delete Transaction',

  CANCEL_TRANSACTION = 'Cancel Transaction',
  EDIT_TRANSACTION = 'Edit Transaction', // edit transaction-proposal referenec & add more services
  APPROVE_TRANSACTION = 'Approve Transaction', //executive when discount exceeds 70%
  REJECT_TRANSACTION = 'Reject Transaction', //executive  when discount exceeds 70%
  VALIDATE_TRANSACTION_SERVICE = 'Validate Transaction Service',
  REJECT_TRANSACTION_SERVICE = 'Reject Transaction Service',

  UPLOAD_OUTPUT_DOCUMENTS = 'Upload Output Documents',
  DOWNLOAD_TRANSACTION_DETAILS = 'Download Transaction Details',

  UPLOAD_EOS = 'Upload EOS',
  SUBMIT_EOS = 'Submit EOS',
  EDIT_COSTING = 'Edit Costing',
  UPLOAD_OUTPUT = 'Upload Output',
  UPLOAD_RECEIPT = 'Upload Receipt',

  // Payment Permissions (25)
  VIEW_PAYMENTS_PAGE = 'View Payments Page',
  VIEW_PAYMENT_DETAILS = 'View Payment Details',
  DOWNLOAD_PAYMENT_RECEIPT = 'Download Payment Receipt',
  EXPORT_PAYMENT_REPORT = 'Export Payment Report',
  PROCESS_PAYMENT = 'Process Payment',
  RECORD_PAYMENT = 'Record Payment',
  EDIT_PAYMENT = 'Edit Payment',
  DELETE_PAYMENT = 'Delete Payment',

  // Courier Permissions (30)
  VIEW_COURIER_PAGE = 'View Courier Page',
  VIEW_COURIER_DETAILS = 'View Courier Details',
  VIEW_TRACKING_INFORMATION = 'View Tracking Information',
  CREATE_COURIER_ASSIGNMENT = 'Create Courier Assignment',
  EDIT_COURIER_INFORMATION = 'Edit Courier Information',
  EDIT_COURIER_STATUS = 'Edit Courier Status',
  EDIT_TRACKING_NUMBER = 'Edit Tracking Number',
  EDIT_DELIVERY_ADDRESS = 'Edit Delivery Address',
  UPLOAD_PROOF_OF_DELIVERY = 'Upload Proof of Delivery',
  DOWNLOAD_DELIVERY_REPORT = 'Download Delivery Report',
  // courier provider management
  VIEW_COURIER_PROVIDERS = 'View Courier Provider Settings',
  EDIT_COURIER_PROVIDER = 'Edit Courier Provider',
  CREATE_COURIER_PROVIDER = 'Create Courier Provider',
  DELETE_COURIER_PROVIDER = 'Delete Courier Provider',

  // Documents Library Permissions (40)
  VIEW_DOCUMENTS_LIBRARY_PAGE = 'View Documents Library Page',
  VIEW_DOCUMENT_DETAILS = 'View Document Details',
  EDIT_DOCUMENT_TAGS = 'Edit Document Tags',
  DOWNLOAD_DOCUMENT = 'Download Document',

  // system settings management
  VIEW_SYSTEM_SETTINGS_PAGE = 'View System Settings Page',
  VIEW_SETTINGS_CONFIGURATION = 'View Settings Configuration',
  EDIT_SETTINGS_CONFIGURATION = 'Edit Settings Configuration',
  DELETE_SETTINGS_CONFIGURATION = 'Delete Settings Configuration',
  // email-templates managment
  VIEW_NOTIFICATIONS_SETTINGS = 'View Notifications Settings',
  EDIT_NOTIFICATION_TEMPLATE = 'Edit Notification Template',

  // service category management
  VIEW_SERVICE_CATEGORY = 'View Service Category',
  CREATE_SERVICE_CATEGORY = 'Create Service Category',
  EDIT_SERVICE_CATEGORY = 'Edit Service Category',
  DELETE_SERVICE_CATEGORY = 'Delete Service Category',

  // service cataglog management
  VIEW_SERVICES_CATALOGS = 'View Service Catalogs',
  CREATE_SERVICE_CATALOG = 'Create Service Catalog',
  EDIT_SERVICE_CATALOG_DETAILS = 'Edit Service Catalog Details',
  DELETE_SERVICE_CATALOG = 'Delete Service Catalogs',
  CREATE_CHECKLIST = 'Create Checklist',
  EDIT_CHECKLIST = 'Edit Checklist',
  DELETE_CHECKLIST = 'Delete Checklist',
  CREATE_OCR_MAPPING = 'Create OCR Mapping',
  DELETE_OCR_MAPPING = 'Delete OCR Mapping',
  EDIT_OCR_MAPPING = 'Edit OCR Mapping',

  // pay-type management
  VIEW_PAY_TYPE = 'View Pay Type',
  CREATE_PAY_TYPE = 'Create Pay Type',
  EDIT_PAY_TYPE = 'Edit Pay Type',
  DELETE_PAY_TYPE = 'Delete Pay Type',

  // requirement management
  VIEW_REQUIREMENTS = 'View Requirements',
  CREATE_REQUIREMENT = 'Create Requirement',
  DELETE_REQUIREMENT = 'Delete Requirement',
  EDIT_REQUIREMENT = 'Edit Requirement',

  // role & permission management
  VIEW_ROLES = 'View Roles',
  CREATE_ROLE = 'Create Role',
  DELETE_ROLE = 'Delete Role',
  EDIT_ROLE = 'Edit Role',
  ASSIGN_ROLE_PERMISSIONS = 'Assign Role Permissions',
  REMOVE_ROLE_PERMISSIONS = 'Remove Role Permissions',
  ASSIGN_ROLE_TO_USER = 'Assign Role to User',
  REMOVE_ROLE_TO_USER = 'Remove Role to User',

  // workflow management
  VIEW_WORKFLOW_STAGE_SETTINGS = 'View Workflow Stage Settings',
  CREATE_WORKFLOW_STAGE = 'Create Workflow Stage',
  EDIT_WORKFLOW_STAGE = 'Edit Workflow Stage',
  DELETE_WORKFLOW_STAGE = 'Delete Workflow Stage',

  VIEW_WORKFLOW_STATUS_SETTINGS = 'View Workflow Status Settings',
  CREATE_WORKFLOW_STATUS = 'Create Workflow Status',
  EDIT_WORKFLOW_STATUS = 'Edit Workflow Status',
  DELETE_WORKFLOW_STATUS = 'Delete Workflow STATUS',

  VIEW_WORKFLOW_FINDINGS_SETTINGS = 'View Workflow Findings Settings',
  CREATE_WORKFLOW_FINDINGS = 'Create Workflow Findings',
  EDIT_WORKFLOW_FINDINGS = 'Edit Workflow Findings',
  DELETE_WORKFLOW_FINDINGS = 'Delete Workflow Findings',

  // FAQ Management Permissions (15)
  VIEW_FAQ_MANAGEMENT_PAGE = 'View FAQ Management Page',
  CREATE_FAQ = 'Create FAQ',
  EDIT_FAQ = 'Edit FAQ',
  DELETE_FAQ = 'Delete FAQ',

  // Registry of Deeds / Locations
  VIEW_LOCATION = 'View Location Management Page',
  CREATE_LOCATION = 'Create Location',
  EDIT_LOCATION = 'Edit Location',
  DELETE_LOCATION = 'Delete Location',

  // Reports Permissions (22)
  VIEW_REPORTS_PAGE = 'View Reports Page',
  VIEW_ENTITY_CODE_REPORTS = 'View Entity Code Reports',
  EXPORT_CSV_ENTITY_CODE_REPORTS = 'Export CSV Entity Code Reports',
  EXPORT_EXCEL_ENTITY_CODE_REPORTS = 'Export Excel Entity Code Reports',
  VIEW_TRANSACTION_REPORTS = 'View Transaction Reports',
  EXPORT_CSV_TRANSACTION_REPORTS = 'Export CSV Transaction Reports',
  EXPORT_EXCEL_TRANSACTION_REPORTS = 'Export Excel Transaction Reports',

  VIEW_COURIER_REPORTS = 'View Courier Reports',
  EXPORT_CSV_COURIER_REPORTS = 'Export CSV Courier Reports',
  EXPORT_EXCEL_COURIER_REPORTS = 'Export Excel Courier Reports',

  VIEW_USER_REPORTS = 'View User Reports',
  EXPORT_CSV_USER_REPORTS = 'Export CSV User Reports',
  EXPORT_EXCEL_USER_REPORTS = 'Export Excel User Reports',

  VIEW_PAYMENTS_REPORTS = 'View Payments Reports',
  EXPORT_CSV_PAYMENTS_REPORTS = 'Export CSV Payments Reports',
  EXPORT_EXCEL_PAYMENTS_REPORTS = 'Export Excel Payments Reports',

  VIEW_AUDIT_TRAIL_REPORTS = 'View Audit Trail Reports',
  EXPORT_CSV_AUDIT_TRAIL_REPORTS = 'Export CSV Audit Trail Reports',
  EXPORT_EXCEL_AUDIT_TRAIL_REPORTS = 'Export Excel Audit Trail Reports',

  VIEW_DOCUMENTS_REPORTS = 'View Documents Reports',
  EXPORT_CSV_DOCUMENTS_REPORTS = 'Export CSV Documents Reports',
  EXPORT_EXCEL_DOCUMENTS_REPORTS = 'Export Excel Documents Reports',

  // Audit Trail Permissions (15)
  VIEW_AUDIT_TRAIL_PAGE = 'View Audit Trail Page',

  // EOS Management Permissions
  VIEW_EOS_CONFIGURATION = 'View EOS Configuration',
  EDIT_EOS_CONFIGURATION = 'Edit EOS Configuration',
}

export enum PermissionCategory {
  USER_MANAGEMENT = 'User Management',
  TRANSACTION_MANAGEMENT = 'Transaction Mangement',
  PAYMENT_MANAGEMENT = 'Payment Management',
  COURIER_SERVICE = 'Courier Service',
  DOCUMENT_LIBRARY = 'Document Library',
  SYSTEM_SETTINGS = 'System Settings',
  MASTERFILE_MANAGEMENT = 'Mastefile Management',
  REPORTS = 'Reports',
  AUDIT_TRAIL = 'Audit Trail',
}

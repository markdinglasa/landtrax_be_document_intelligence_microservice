# Document Intelligence Masterplan: Classification & Extraction Pipeline

## 1. Executive Summary
The primary objective of this microservice is to process batches of documents for transactions (like Title Transfer and Registration), perform OCR, dynamically classify documents against configured Requirement Mappings, and intelligently extract specific configured data fields.

## 2. Document Segregation & Partial Success Handling

When a user uploads a large PDF containing multiple mixed requirements, the system must segregate it accordingly.

### **The Segregation Pipeline**
1. **Initial OCR Pass**: AWS Textract extracts text on a per-page basis.
2. **AI Classification**: Bedrock classifies each page into predefined categories.
3. **Document Splitting**: The microservice physically splits the original PDF into smaller, distinct PDFs (e.g., `Requirement_1.pdf`, `Other_Files.pdf`).
4. **Domain Routing**: Each split document is pushed to a domain-targeted BullMQ queue.
5. **Partial Success (AC 31-50)**: If one split requirement fails OCR (e.g., blurry page), the successfully processed requirements remain fully intact. The API allows the client to upload a **Single Replacement File** mapped strictly to the failed requirement. This replacement overrides the failed state without re-triggering or duplicating the successful documents from the original parent PDF.

## 3. Real-Time Status Lifecycle & Error Taxonomy

To support strict UI loading indicators and error states (AC 18-30), the backend will utilize **Socket.IO** (`@nestjs/websockets`) to broadcast real-time state changes per document to the client.

### **Document Statuses**
*   **`OCR - Processing`**: Set immediately upon successful upload and queue insertion. Maintained independently for each document in a batch.
*   **`OCR - Success`**: Set when classification and extraction complete flawlessly.
*   **`OCR Not Readable`**: Set when the file is technically processed, but the content is unusable (AC 1-15).
    *   *Triggers*: Blank document, corrupted file, blurry image, password-protected/encrypted PDF, or no usable text extracted.
    *   *Action*: The document is **retained**. Database creates the configured OCR fields as blanks. No placeholder garbage is inserted. User is allowed manual data entry.
*   **`OCR Processing Failed`**: Set when an internal system, network, or AWS service error occurs.

## 4. Re-Execution & User Modifications
*   **Manual Overrides (AC 60-63)**: Users can manually type in OCR fields for unreadable documents. If they later re-upload a replacement document, and new OCR values conflict with their manual entries, the UI triggers an "Overwrite OCR Values?" modal. The API accepts a flag to strictly enforce the user's Overwrite/Keep decision.
*   **Draft Preservation (AC 51-52)**: All document states (including `OCR Not Readable`) and manually entered values are persisted to the database. Reopening a Draft transaction restores the exact state.

## 5. Audit Trail & Logging (AC 64-69)

In addition to standard logging, specific Audit Trail entries are written for terminal states:
*   **Unreadable Document Event**: 
    *   Module: `OCR Processing`
    *   Action: `OCR Document Not Readable`
    *   Status: `Not Readable`
    *   Details: Transaction Number, Requirement Name, File Name, Failure Reason (e.g., "Password Protected"), and OCR Status.

*(Global process flows and AI Engine configurations remain as defined in earlier architectural discussions).*

## 6. Phased Implementation Roadmap

### Phase 1: Ingestion, Validation & Sockets
*   [ ] Create batch upload API with duplicate detection (Name + Size).
*   [ ] Set up `@nestjs/websockets` Gateway to push `OCR - Processing`, `Success`, and `Failed` events to the client.
*   [ ] Set up BullMQ for resilient processing.

### Phase 2: Classification & Splitting (Multi-Doc Support)
*   [ ] Implement `TextractService` & `BedrockService` for classification.
*   [ ] Implement PDF splitting.
*   [ ] Build API endpoint for **Single Requirement Replacement** uploads (AC 38-48) to handle partial multi-doc failures.

### Phase 3: Extraction, Taxonomy & Persistence
*   [ ] Implement Bedrock extraction logic based on dynamic Requirement Mappings.
*   [ ] Implement error taxonomy logic to differentiate between `OCR Not Readable` (content issues) and `OCR Processing Failed` (service issues).
*   [ ] Persist blank OCR fields for `Not Readable` documents to allow manual entry.

### Phase 4: API Lifecycle & Audit Logging
*   [ ] Implement endpoints for editing and Overwrite/Keep resolution.
*   [ ] Build the Audit Trail logging service for `OCR Document Not Readable` and Success actions.

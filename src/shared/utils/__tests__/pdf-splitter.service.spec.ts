import { PDFDocument } from 'pdf-lib';
import { PdfSplitterService } from '../pdf-splitter.service.js';

describe('PdfSplitterService', () => {
  let service: PdfSplitterService;
  let testPdfBuffer: Buffer;

  beforeAll(async () => {
    // Create a 3-page test PDF in memory
    const doc = await PDFDocument.create();
    doc.addPage([200, 200]);
    doc.addPage([200, 200]);
    doc.addPage([200, 200]);
    const bytes = await doc.save();
    testPdfBuffer = Buffer.from(bytes);
  });

  beforeEach(() => {
    service = new PdfSplitterService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPageCount', () => {
    it('should return correct page count', async () => {
      const count = await service.getPageCount(testPdfBuffer);
      expect(count).toBe(3);
    });
  });

  describe('splitByPages', () => {
    it('should split a PDF into labeled page groups', async () => {
      const pageGroups = [
        { label: 'Requirement 1', pages: [0, 1] }, // Pages 1 and 2
        { label: 'Requirement 2', pages: [2] },    // Page 3
      ];

      const results = await service.splitByPages(testPdfBuffer, pageGroups);

      expect(results).toHaveLength(2);
      expect(results[0].label).toBe('Requirement 1');
      expect(results[1].label).toBe('Requirement 2');

      const doc1 = await PDFDocument.load(results[0].buffer);
      expect(doc1.getPageCount()).toBe(2);

      const doc2 = await PDFDocument.load(results[1].buffer);
      expect(doc2.getPageCount()).toBe(1);
    });
  });
});

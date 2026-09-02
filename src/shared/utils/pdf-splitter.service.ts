import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';
import { IPdfSplitterService } from './pdf-splitter.service.abstract.js';

@Injectable()
export class PdfSplitterService extends IPdfSplitterService {
  private readonly logger = new Logger(PdfSplitterService.name);

  /**
   * Splits a PDF into multiple PDFs based on page groups.
   * @param pdfBuffer The original PDF buffer.
   * @param pageGroups Groups of pages to split into.
   * @returns Array of objects containing the label and the new PDF buffer.
   */
  async splitByPages(
    pdfBuffer: Buffer,
    pageGroups: { label: string; pages: number[] }[],
  ): Promise<{ label: string; buffer: Buffer }[]> {
    try {
      const sourcePdf = await PDFDocument.load(pdfBuffer);
      const results: { label: string; buffer: Buffer }[] = [];

      for (const group of pageGroups) {
        const newPdf = await PDFDocument.create();
        const copiedPages = await newPdf.copyPages(sourcePdf, group.pages);
        
        for (const page of copiedPages) {
          newPdf.addPage(page);
        }

        const newPdfBytes = await newPdf.save();
        results.push({
          label: group.label,
          buffer: Buffer.from(newPdfBytes),
        });
      }

      return results;
    } catch (error: any) {
      this.logger.error(`Error splitting PDF: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Gets the number of pages in a PDF.
   * @param pdfBuffer The PDF buffer.
   * @returns The number of pages.
   */
  async getPageCount(pdfBuffer: Buffer): Promise<number> {
    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
      return pdfDoc.getPageCount();
    } catch (error: any) {
      this.logger.error(`Error getting PDF page count: ${error.message}`, error.stack);
      throw error;
    }
  }
}

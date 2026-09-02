export abstract class IPdfSplitterService {
  /** Splits a PDF into multiple PDFs based on page groups. */
  abstract splitByPages(
    pdfBuffer: Buffer,
    pageGroups: { label: string; pages: number[] }[],
  ): Promise<{ label: string; buffer: Buffer }[]>;

  /** Gets the number of pages in a PDF. */
  abstract getPageCount(pdfBuffer: Buffer): Promise<number>;
}

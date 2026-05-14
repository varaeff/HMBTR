declare module 'markdown2pdf-mcp' {
  export class MarkdownPdfServer {
    constructor();
    convertToPdf(
      markdown: string,
      outputPath: string,
      paperFormat?: string,
      paperOrientation?: string,
      paperBorder?: string,
      watermark?: string,
      watermarkScope?: string,
      showPageNumbers?: boolean,
    ): Promise<void>;
  }
}

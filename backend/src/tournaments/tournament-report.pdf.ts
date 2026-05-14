import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

type MarkdownPdfServerInstance = {
  convertToPdf: (
    markdown: string,
    outputPath: string,
    paperFormat?: string,
    paperOrientation?: string,
    paperBorder?: string,
    watermark?: string,
    watermarkScope?: string,
    showPageNumbers?: boolean,
  ) => Promise<void>;
};

let markdownPdfServer: MarkdownPdfServerInstance | null = null;

const loadMarkdownPdfServerClass = async () => {
  const dynamicImport = new Function(
    'specifier',
    'return import(specifier)',
  ) as (
    specifier: string,
  ) => Promise<{ MarkdownPdfServer: new () => MarkdownPdfServerInstance }>;

  return (await dynamicImport('markdown2pdf-mcp')).MarkdownPdfServer;
};

const getMarkdownPdfServer = async () => {
  if (!markdownPdfServer) {
    const MarkdownPdfServer = await loadMarkdownPdfServerClass();
    markdownPdfServer = new MarkdownPdfServer();
  }

  return markdownPdfServer;
};

export const createReportFileName = (
  tournamentName: string,
  language: string,
) => {
  const slug = tournamentName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 80);

  return `${slug || 'tournament'}-results-${language}.pdf`;
};

export const escapeMarkdownCell = (value: string | number | null | undefined) =>
  String(value ?? '')
    .replace(/\r?\n/g, ' ')
    .replace(/\|/g, '\\|')
    .trim();

export const createMarkdownTable = (
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>,
) => {
  const headerRow = `| ${headers.map(escapeMarkdownCell).join(' |')} |`;
  const separator = `| ${headers.map(() => '---').join(' |')} |`;
  const bodyRows = rows.map(
    (row) => `| ${row.map(escapeMarkdownCell).join(' |')} |`,
  );

  return [headerRow, separator, ...bodyRows].join('\n');
};

export const createTournamentReportPdf = async (
  markdown: string,
  fileName: string,
) => {
  const outputDir = await mkdtemp(path.join(tmpdir(), 'hmbtr-report-'));
  const outputPath = path.join(outputDir, fileName);

  try {
    const server = await getMarkdownPdfServer();

    await server.convertToPdf(
      markdown,
      outputPath,
      'a4',
      'portrait',
      '12mm',
      '',
      'all-pages',
      true,
    );

    return await readFile(outputPath);
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
};

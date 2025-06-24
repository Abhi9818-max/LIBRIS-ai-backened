export interface HighlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Highlight {
  id: string;
  pageNumber: number;
  rects: HighlightRect[];
  text: string;
  color: string;
  visualizationImageUri?: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  summary: string;
  category?: string;
  coverImageUrl: string;
  pdfFileName: string;
  pdfDataUri: string;
  currentPage?: number;
  totalPages?: number;
  highlights?: Highlight[];
}

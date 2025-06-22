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
}

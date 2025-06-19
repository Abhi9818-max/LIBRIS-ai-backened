export interface Book {
  id: string;
  title: string;
  author: string;
  summary: string;
  coverImageUrl: string; // This will be a data URL
  pdfFileName: string; 
  pdfDataUri: string; // Added to store the PDF content as a data URI
}

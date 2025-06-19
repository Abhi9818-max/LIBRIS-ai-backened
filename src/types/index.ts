export interface Book {
  id: string;
  title: string;
  author: string;
  summary: string;
  coverImageUrl: string; // This will be a data URL
  pdfFileName: string; 
  // pdfDataUri is handled during upload/extraction, not necessarily stored with the book object long-term
  // to save space, especially if using localStorage.
}


"use client";

import type { Book } from "@/types";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FileText, Pencil, Trash2 } from "lucide-react";

interface BookDetailViewProps {
  book: Book | null;
  isOpen: boolean;
  onClose: () => void;
  onEditBook: (book: Book) => void;
  onRemoveBook: (id: string) => void;
}

// Helper function to convert data URI to Blob (copied from BookCard.tsx)
function dataURIToBlob(dataURI: string): Blob | null {
  if (!dataURI.includes(',')) {
    console.error("dataURIToBlob: Invalid data URI format - missing comma separator.", {dataURIStart: dataURI.substring(0,100)});
    return null;
  }
  const parts = dataURI.split(',');
  const header = parts[0];
  const base64DataDirty = parts[1];

  if (!header || typeof base64DataDirty === 'undefined') {
    console.error("dataURIToBlob: Invalid data URI format - header or data part is missing.");
    return null;
  }
  
  const mimeMatch = header.match(/:(.*?);/);
  if (!mimeMatch || mimeMatch.length < 2) {
    console.error("dataURIToBlob: Could not extract MIME type from data URI header:", header);
    return null;
  }
  const mimeType = mimeMatch[1];

  let base64Data = base64DataDirty.trim(); 

  if (!base64Data) {
    console.error("dataURIToBlob: Base64 data part is empty after trim.");
    return null;
  }

  try {
    const byteString = atob(base64Data);
    const ia = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ia], { type: mimeType });
  } catch (error: any) {
    console.error("dataURIToBlob: Error converting base64 to Blob (1st attempt):", error.name, error.message);
    
    if (error instanceof DOMException && error.name === 'InvalidCharacterError') {
      console.warn("dataURIToBlob: InvalidCharacterError encountered. Trying to decode URI components in base64 string.");
      try {
        const decodedBase64 = decodeURIComponent(base64Data);
        const byteStringDecoded = atob(decodedBase64); 
        const iaDecoded = new Uint8Array(byteStringDecoded.length);
        for (let i = 0; i < byteStringDecoded.length; i++) {
          iaDecoded[i] = byteStringDecoded.charCodeAt(i);
        }
        return new Blob([iaDecoded], { type: mimeType });
      } catch (decodeError: any) {
        console.error("dataURIToBlob: Error converting base64 to Blob after URI decoding (2nd attempt failed):", decodeError.name, decodeError.message);
        return null; 
      }
    }
    return null; 
  }
}

export default function BookDetailView({ book, isOpen, onClose, onEditBook, onRemoveBook }: BookDetailViewProps) {
  const { toast } = useToast();

  if (!isOpen || !book) {
    return null;
  }

  const handleOpenPdfInDetailView = () => {
    if (!book.pdfDataUri || !book.pdfDataUri.startsWith('data:application/pdf;base64,')) {
      toast({
        title: "Cannot Open PDF",
        description: "No valid PDF data is associated with this book.",
        variant: "destructive",
      });
      return;
    }
    let pdfBlob: Blob | null = null;
    try {
      pdfBlob = dataURIToBlob(book.pdfDataUri);
    } catch (conversionError) {
        toast({
            title: "PDF Conversion Failed",
            description: "An unexpected error occurred while preparing the PDF data.",
            variant: "destructive",
        });
        return;
    }
    if (!pdfBlob) {
      toast({
        title: "PDF Processing Error",
        description: "Could not process the PDF data. It might be corrupted.",
        variant: "destructive",
      });
      return;
    }
    if (pdfBlob.type !== "application/pdf") {
      toast({
        title: "Incorrect PDF Type",
        description: `The processed file type is "${pdfBlob.type}" not "application/pdf".`,
        variant: "destructive",
      });
      return;
    }
    let objectUrl: string | null = null;
    try {
        objectUrl = URL.createObjectURL(pdfBlob);
         if (!objectUrl) throw new Error("URL.createObjectURL returned null.");
    } catch (createUrlError: any) {
        toast({
            title: "PDF Display Error",
            description: "Could not create a displayable URL for the PDF.",
            variant: "destructive",
        });
        return;
    }
    const newWindow = window.open('', '_blank');
    if (newWindow && objectUrl) {
      newWindow.document.title = book.pdfFileName || book.title || "PDF Document";
      newWindow.location.href = objectUrl;
    } else {
      toast({ title: "Could Not Open PDF Tab", variant: "destructive" });
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    }
  };

  const percentageRead = book.totalPages && book.currentPage && book.totalPages > 0
    ? Math.round((book.currentPage / book.totalPages) * 100)
    : 0;
  
  const handleEditClick = () => {
    onEditBook(book);
  };

  const handleRemoveClick = () => {
    onRemoveBook(book.id);
    // onClose(); // The onClose will be handled by page.tsx's handleRemoveBook
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2 border-b">
          <DialogTitle className="font-headline text-2xl">{book.title || "Untitled Book"}</DialogTitle>
          <DialogDescription className="text-md">By: {book.author || "Unknown Author"}</DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 flex flex-col items-center space-y-4">
              <div className="relative w-full aspect-[2/3] max-w-[300px] mx-auto">
                  <Image
                      src={book.coverImageUrl || "https://placehold.co/300x450.png"}
                      alt={`Cover of ${book.title}`}
                      layout="fill"
                      objectFit="contain"
                      className="rounded-md shadow-lg"
                      data-ai-hint="book cover"
                  />
              </div>
              {book.pdfDataUri && book.pdfDataUri.startsWith('data:application/pdf;base64,') && (
                <Button onClick={handleOpenPdfInDetailView} className="w-full max-w-[300px]">
                  <FileText className="mr-2 h-4 w-4" /> Open PDF
                </Button>
              )}
            </div>
            <div className="md:col-span-2 space-y-4">
              <div>
                <h3 className="text-xl font-semibold font-headline mb-1">Summary</h3>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {book.summary || "No summary available."}
                </p>
              </div>
              {book.totalPages && book.totalPages > 0 && (
                <div>
                  <h3 className="text-xl font-semibold font-headline mb-2">Reading Progress</h3>
                  <p className="text-sm text-foreground/90">
                    Currently on page {book.currentPage || 1} of {book.totalPages} ({percentageRead}% completed).
                  </p>
                  <div className="w-full bg-muted rounded-full h-2.5 mt-2">
                    <div 
                        className="bg-primary h-2.5 rounded-full" 
                        style={{ width: `${percentageRead}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter className="p-4 border-t flex flex-col sm:flex-row sm:justify-end space-y-2 sm:space-y-0 sm:space-x-2">
          <Button variant="outline" onClick={handleEditClick} className="w-full sm:w-auto">
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </Button>
          <Button variant="destructive" onClick={handleRemoveClick} className="w-full sm:w-auto">
            <Trash2 className="mr-2 h-4 w-4" /> Remove
          </Button>
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

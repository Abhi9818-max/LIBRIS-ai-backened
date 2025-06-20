
"use client";

import type { Book } from "@/types";
import Image from "next/image";
import { useState, ChangeEvent } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, FileText, Pencil, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BookCardProps {
  book: Book;
  onRemove: (id: string) => void;
  onEdit: (book: Book) => void;
  onUpdateProgress: (bookId: string, currentPage: number) => void;
}

// Helper function to convert data URI to Blob
function dataURIToBlob(dataURI: string): Blob | null {
  if (!dataURI.includes(',')) {
    console.error("Invalid data URI format: missing comma separator.");
    return null;
  }
  const parts = dataURI.split(',');
  const header = parts[0];
  const base64DataDirty = parts[1];

  if (!header || typeof base64DataDirty === 'undefined') {
    console.error("Invalid data URI format: header or data part is missing.");
    return null;
  }
  
  const mimeMatch = header.match(/:(.*?);/);
  if (!mimeMatch || mimeMatch.length < 2) {
    console.error("Could not extract MIME type from data URI header:", header);
    return null;
  }
  const mimeType = mimeMatch[1];
  const base64Data = base64DataDirty.trim(); // Trim whitespace from base64 data

  if (!base64Data) {
    console.error("Invalid data URI: base64 data part is empty after trim.");
    return null;
  }

  try {
    // Attempt to decode with standard atob
    const byteString = atob(base64Data);
    const ia = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    console.log("Successfully converted base64 to Blob (1st attempt). Blob type:", mimeType);
    return new Blob([ia], { type: mimeType });
  } catch (error) {
    console.error("Error converting base64 to Blob (1st attempt):", error, "Base64 length (approx):", base64Data.length);
    // Check if it's an InvalidCharacterError, often due to URL encoding or other non-base64 chars
    if (error instanceof DOMException && error.name === 'InvalidCharacterError') {
      console.warn("Attempting to decode URI components in base64 string due to InvalidCharacterError.");
      try {
        const decodedBase64 = decodeURIComponent(base64Data);
        const byteStringDecoded = atob(decodedBase64); // Try atob again on the cleaned string
        const iaDecoded = new Uint8Array(byteStringDecoded.length);
        for (let i = 0; i < byteStringDecoded.length; i++) {
          iaDecoded[i] = byteStringDecoded.charCodeAt(i);
        }
        console.log("Successfully converted to Blob after URI decoding (2nd attempt). Blob type:", mimeType);
        return new Blob([iaDecoded], { type: mimeType });
      } catch (decodeError) {
        console.error("Error converting base64 to Blob after URI decoding (2nd attempt failed):", decodeError);
        return null; // Return null if the second attempt also fails
      }
    }
    return null; // Return null for other types of errors from the first attempt
  }
}


export default function BookCard({ book, onRemove, onEdit, onUpdateProgress }: BookCardProps) {
  const { toast } = useToast();
  const [currentPageInput, setCurrentPageInput] = useState<string>((book.currentPage || 1).toString());

  const handleOpenPdf = () => {
    if (!book.pdfDataUri || !book.pdfDataUri.startsWith('data:application/pdf;base64,')) {
      toast({
        title: "Cannot Open PDF",
        description: "No valid PDF data is associated with this book. Please re-upload or edit the book to add a PDF.",
        variant: "destructive",
      });
      console.error("Invalid or missing PDF Data URI for book:", book.title, "URI:", book.pdfDataUri?.substring(0,100) + "...");
      return;
    }

    let pdfBlob: Blob | null = null;
    try {
      pdfBlob = dataURIToBlob(book.pdfDataUri);
    } catch (conversionError) {
        console.error("Catastrophic error during dataURIToBlob call:", conversionError);
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
        description: "Could not process the PDF data. It might be corrupted or in an invalid format. Check console for details.",
        variant: "destructive",
      });
      return;
    }
    
    console.log("PDF Blob created successfully. Size:", pdfBlob.size, "Type:", pdfBlob.type);

    let objectUrl: string | null = null;
    try {
        objectUrl = URL.createObjectURL(pdfBlob);
        console.log("Created Object URL:", objectUrl);
    } catch (createUrlError) {
        console.error("Error creating Object URL:", createUrlError);
        toast({
            title: "PDF Display Error",
            description: "Could not create a displayable URL for the PDF.",
            variant: "destructive",
        });
        return;
    }


    const pdfWindow = window.open(objectUrl, '_blank');
    
    if (pdfWindow) {
      // pdfWindow.focus(); // Sometimes focus can be problematic or unnecessary
      toast({
          title: "Opening PDF",
          description: `Attempting to open "${book.pdfFileName || book.title}" in a new tab.`,
          variant: "default",
      });
      // For new tabs, it's generally safer to let the browser manage object URL lifecycle,
      // or revoke it much later if possible. Revoking too soon causes `about:blank`.
      // URL.revokeObjectURL(objectUrl); 
    } else {
      // Fallback or if popup was blocked
      toast({
          title: "Popup Possibly Blocked",
          description: `Could not open PDF in a new tab directly. Your browser might have blocked it. Trying to initiate download as a fallback.`,
          variant: "destructive",
          duration: 7000,
      });
      // As a last resort, offer download if opening fails.
      try {
        const link = document.createElement('a');
        link.href = objectUrl; 
        link.download = book.pdfFileName || `${book.title || "book"}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(objectUrl); // Revoke after download initiated
      } catch (downloadError) {
          console.error("Error attempting to download PDF as fallback:", downloadError);
          toast({
              title: "Download Failed",
              description: "Could not even initiate a download for the PDF.",
              variant: "destructive",
          });
          if (objectUrl) URL.revokeObjectURL(objectUrl); // Clean up if objectUrl was created
      }
    }
    // Note: Do not revoke objectUrl here if pdfWindow was successfully opened,
    // as the new tab needs it. It will be cleaned up when the tab closes or browser session ends.
  };

  const handleProgressChange = (e: ChangeEvent<HTMLInputElement>) => {
    setCurrentPageInput(e.target.value);
  };

  const handleSaveProgress = () => {
    const newPage = parseInt(currentPageInput, 10);
    if (isNaN(newPage) || newPage < 1 || (book.totalPages && newPage > book.totalPages)) {
      toast({
        title: "Invalid Page Number",
        description: `Please enter a valid page number between 1 and ${book.totalPages || 'the total pages'}.`,
        variant: "destructive",
      });
      return;
    }
    onUpdateProgress(book.id, newPage);
    toast({
      title: "Progress Saved!",
      description: `Page ${newPage} saved for "${book.title}".`,
    });
  };
  
  const percentageRead = book.totalPages && book.currentPage && book.totalPages > 0
    ? Math.round((book.currentPage / book.totalPages) * 100)
    : 0;


  return (
    <Card className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out animate-fade-in">
      <CardHeader className="p-4">
        <div className="aspect-[2/3] w-full relative mb-2 rounded-md overflow-hidden">
          <Image
            src={book.coverImageUrl || "https://placehold.co/200x300.png"}
            alt={`Cover of ${book.title}`}
            layout="fill"
            objectFit="cover"
            data-ai-hint="book cover"
            className="transition-opacity opacity-0 duration-500"
            onLoadingComplete={(image) => image.classList.remove('opacity-0')}
          />
        </div>
        <CardTitle className="font-headline text-lg truncate" title={book.title}>{book.title || "Untitled Book"}</CardTitle>
        <CardDescription className="text-sm text-muted-foreground truncate" title={book.author}>By: {book.author || "Unknown Author"}</CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-grow">
        <p className="text-sm text-foreground/80 line-clamp-3">{book.summary || "No summary available."}</p>
        {book.totalPages && book.totalPages > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
            <p>Progress: Page {book.currentPage || 1} of {book.totalPages} ({percentageRead}%)</p>
            <div className="flex items-center space-x-2 mt-1">
              <Input 
                type="number" 
                value={currentPageInput} 
                onChange={handleProgressChange} 
                min="1"
                max={book.totalPages}
                className="h-8 text-xs w-20"
                aria-label="Current page"
              />
              <Button size="xs" variant="outline" onClick={handleSaveProgress} aria-label="Save progress">
                <Save className="h-3 w-3 mr-1" /> Save
              </Button>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="p-4 pt-0 flex flex-col space-y-2">
        <div className="flex space-x-2 w-full">
          {book.pdfDataUri && book.pdfDataUri.startsWith('data:application/pdf;base64,') && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenPdf}
              className="flex-1"
              aria-label={`Open PDF for ${book.title}`}
            >
              <FileText className="mr-2 h-4 w-4" /> Open PDF
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onEdit(book)}
            aria-label={`Edit ${book.title}`}
            className={(!book.pdfDataUri || !book.pdfDataUri.startsWith('data:application/pdf;base64,')) ? "w-full" : "flex-1"}
          >
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </Button>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onRemove(book.id)}
          aria-label={`Remove ${book.title}`}
          className="w-full"
        >
          <Trash2 className="mr-2 h-4 w-4" /> Remove
        </Button>
      </CardFooter>
    </Card>
  );
}

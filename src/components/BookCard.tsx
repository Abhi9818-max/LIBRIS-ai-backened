
"use client";

import type { Book } from "@/types";
import Image from "next/image";
import { useState, ChangeEvent, useEffect } from "react";
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


export default function BookCard({ book, onRemove, onEdit, onUpdateProgress }: BookCardProps) {
  const { toast } = useToast();
  const [currentPageInput, setCurrentPageInput] = useState<string>((book.currentPage || 1).toString());
  const [progressColor, setProgressColor] = useState<string>('hsl(var(--primary))'); // Default to primary theme color

  // Effect to update currentPageInput when book.currentPage changes from props
  useEffect(() => {
    setCurrentPageInput((book.currentPage || 1).toString());
  }, [book.currentPage]);

  // Effect to set a random color for the progress circle on mount (client-side only)
  useEffect(() => {
    const randomHue = Math.floor(Math.random() * 360);
    const randomSaturation = Math.floor(Math.random() * 30) + 70; // Saturation between 70% and 100%
    const randomLightness = Math.floor(Math.random() * 20) + 50; // Lightness between 50% and 70%
    setProgressColor(`hsl(${randomHue}, ${randomSaturation}%, ${randomLightness}%)`);
  }, []); // Empty dependency array ensures this runs once on mount on the client

  const handleOpenPdf = () => {
    if (!book.pdfDataUri || !book.pdfDataUri.startsWith('data:application/pdf;base64,')) {
      toast({
        title: "Cannot Open PDF",
        description: "No valid PDF data is associated with this book. Please re-upload or edit the book to add a PDF.",
        variant: "destructive",
      });
      console.error("handleOpenPdf: Invalid or missing PDF Data URI for book:", book.title, "URI Start:", book.pdfDataUri?.substring(0,100) + "...");
      return;
    }

    let pdfBlob: Blob | null = null;
    try {
      pdfBlob = dataURIToBlob(book.pdfDataUri);
    } catch (conversionError) {
        console.error("handleOpenPdf: Catastrophic error during dataURIToBlob call:", conversionError);
        toast({
            title: "PDF Conversion Failed",
            description: "An unexpected error occurred while preparing the PDF data. Check console.",
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
      console.error("handleOpenPdf: pdfBlob is null after conversion attempt.");
      return;
    }
    
    if (pdfBlob.type !== "application/pdf") {
      toast({
        title: "Incorrect PDF Type",
        description: `The processed file type is "${pdfBlob.type}" not "application/pdf". PDF cannot be displayed. Try re-uploading.`,
        variant: "destructive",
      });
      console.error("handleOpenPdf: Blob type is not application/pdf. Type:", pdfBlob.type);
      return;
    }

    let objectUrl: string | null = null;
    try {
        objectUrl = URL.createObjectURL(pdfBlob);
        if (!objectUrl) {
            throw new Error("URL.createObjectURL returned null or empty string.");
        }
    } catch (createUrlError: any) {
        console.error("handleOpenPdf: Error creating Object URL:", createUrlError.message, createUrlError);
        toast({
            title: "PDF Display Error",
            description: "Could not create a displayable URL for the PDF. Check console.",
            variant: "destructive",
        });
        return;
    }

    const newWindow = window.open('', '_blank');

    if (newWindow && objectUrl) {
      newWindow.document.title = book.pdfFileName || book.title || "PDF Document";
      newWindow.location.href = objectUrl;
      toast({
        title: "Opening PDF",
        description: `Attempting to open "${book.pdfFileName || book.title}" in a new tab.`,
      });
    } else {
      toast({
        title: "Could Not Open PDF Tab",
        description: "Failed to open a new tab, possibly due to browser settings or an error. Initiating download as a fallback.",
        variant: "destructive",
        duration: 7000,
      });
      try {
        const link = document.createElement('a');
        link.href = objectUrl; 
        link.download = book.pdfFileName || `${book.title || "book"}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(objectUrl); 
      } catch (downloadError: any) {
        console.error("handleOpenPdf: Error attempting to download PDF as fallback:", downloadError.message, downloadError);
        toast({
          title: "Download Failed",
          description: "Could not even initiate a download for the PDF. Check console.",
          variant: "destructive",
        });
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl); 
        }
      }
    }
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
          <div className="mt-3 space-y-2">
            <div className="flex items-center space-x-3">
              <div className="relative h-12 w-12">
                <svg className="h-full w-full" viewBox="0 0 36 36">
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="none"
                    className="stroke-current text-muted/20" 
                    strokeWidth="3"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="none"
                    stroke={progressColor}
                    strokeWidth="3"
                    strokeDasharray={`${percentageRead}, 100`}
                    strokeDashoffset="25" 
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-semibold text-foreground">
                    {percentageRead}%
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Page {book.currentPage || 1} of {book.totalPages}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
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
    

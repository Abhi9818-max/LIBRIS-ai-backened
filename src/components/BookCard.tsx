
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
      console.error("Invalid or missing PDF Data URI for book:", book.title);
      return;
    }

    try {
      const pdfWindow = window.open("");
      if (pdfWindow) {
        pdfWindow.document.write(
          `<iframe width='100%' height='100%' src='${book.pdfDataUri}'></iframe>`
        );
        pdfWindow.document.title = book.pdfFileName || book.title || "Book";
        toast({
            title: "Opening PDF",
            description: `Attempting to open "${book.pdfFileName || book.title}" in a new tab. If it doesn't open, check your browser's popup blocker.`,
            variant: "default",
        });
      } else {
        toast({
            title: "Popup Blocked",
            description: `Could not open PDF in a new tab. Please disable your popup blocker for this site and try again. The download was attempted, but the browser prevented it.`,
            variant: "destructive",
            duration: 7000,
        });
      }
    } catch (error) {
      console.error("Error attempting to open PDF:", error);
      toast({
        title: "PDF Open Failed",
        description: "Could not open PDF. Please check the browser console for more details.",
        variant: "destructive",
      });
    }
  };

  const handleProgressChange = (e: ChangeEvent<HTMLInputElement>) => {
    setCurrentPageInput(e.target.value);
  };

  const handleSaveProgress = () => {
    const newPage = parseInt(currentPageInput, 10);
    if (isNaN(newPage) || newPage < 0 || (book.totalPages && newPage > book.totalPages)) {
      toast({
        title: "Invalid Page Number",
        description: `Please enter a valid page number between 0 and ${book.totalPages || 'the total pages'}.`,
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

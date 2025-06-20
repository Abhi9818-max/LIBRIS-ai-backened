"use client";

import type { Book } from "@/types";
import Image from "next/image";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, FileText, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BookCardProps {
  book: Book;
  onRemove: (id: string) => void;
  onEdit: (book: Book) => void;
}

export default function BookCard({ book, onRemove, onEdit }: BookCardProps) {
  const { toast } = useToast();

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
      // Attempt to open in a new tab
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
        // Fallback if window.open is blocked, try direct link click (might download)
        const link = document.createElement('a');
        link.href = book.pdfDataUri;
        link.target = "_blank"; // Try to open in new tab
        link.rel = "noopener noreferrer"; // Security best practice
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({
            title: "Opening PDF",
            description: `Attempting to open "${book.pdfFileName || book.title}". If a new tab didn't appear, your browser might have blocked it or started a download. Please check your popup blocker settings.`,
            variant: "default",
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
        <p className="text-sm text-foreground/80 line-clamp-4">{book.summary || "No summary available."}</p>
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
            className={!book.pdfDataUri || !book.pdfDataUri.startsWith('data:application/pdf;base64,') ? "w-full" : "flex-1"}
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

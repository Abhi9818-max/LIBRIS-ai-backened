
"use client";

import type { Book } from "@/types";
import Image from "next/image";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BookCardProps {
  book: Book;
  onRemove: (id: string) => void;
}

export default function BookCard({ book, onRemove }: BookCardProps) {
  const { toast } = useToast();

  const handleOpenPdf = () => {
    if (!book.pdfDataUri) {
      toast({
        title: "Error",
        description: "No PDF data found for this book.",
        variant: "destructive",
      });
      return;
    }

    // Attempt to open the PDF data URI directly in a new tab.
    // Most browsers will either display it or offer a download.
    const newWindow = window.open(book.pdfDataUri, '_blank');

    // If window.open() was blocked (e.g., by a popup blocker), newWindow will be null.
    if (!newWindow) {
      toast({
        title: "Popup Issue",
        description: "Could not open PDF in a new tab (popup may be blocked). Attempting to download instead.",
        variant: "default",
      });
      // Fallback: create a temporary link and click it to trigger download.
      try {
        const a = document.createElement('a');
        a.href = book.pdfDataUri;
        a.download = book.pdfFileName || 'document.pdf'; // Provide a filename for download
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (error) {
        console.error("PDF download fallback failed:", error);
        toast({
          title: "Download Error",
          description: "Failed to initiate PDF download. Please check your browser's console.",
          variant: "destructive",
        });
      }
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
            className="transition-opacity opacity-0 duration-[500ms]"
            onLoadingComplete={(image) => image.classList.remove('opacity-0')}
          />
        </div>
        <CardTitle className="font-headline text-lg truncate" title={book.title}>{book.title}</CardTitle>
        <CardDescription className="text-sm text-muted-foreground truncate" title={book.author}>By: {book.author}</CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-grow">
        <p className="text-sm text-foreground/80 line-clamp-4">{book.summary}</p>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex space-x-2">
        {book.pdfDataUri && (
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
          variant="destructive"
          size="sm"
          onClick={() => onRemove(book.id)}
          aria-label={`Remove ${book.title}`}
          className={book.pdfDataUri ? "flex-1" : "w-full"}
        >
          <Trash2 className="mr-2 h-4 w-4" /> Remove
        </Button>
      </CardFooter>
    </Card>
  );
}

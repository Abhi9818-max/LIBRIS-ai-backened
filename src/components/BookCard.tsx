
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
    console.log("Attempting to open PDF for:", book.title);
    console.log("PDF Data URI (first 100 chars):", book.pdfDataUri ? book.pdfDataUri.substring(0, 100) + "..." : "No PDF Data URI");
    console.log("PDF File Name:", book.pdfFileName);

    if (!book.pdfDataUri || !book.pdfDataUri.startsWith('data:application/pdf;base64,')) {
      toast({
        title: "Error Opening PDF",
        description: "No valid PDF data found for this book. Please try re-uploading.",
        variant: "destructive",
      });
      console.error("Invalid or missing PDF Data URI for book:", book.title);
      return;
    }

    try {
      // Create a temporary link element to trigger the download
      const link = document.createElement('a');
      link.href = book.pdfDataUri;
      link.download = book.pdfFileName || `${book.title.replace(/\s+/g, '_') || 'document'}.pdf`; // Provide a filename for download
      
      // Append to the document, click, and then remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "PDF Download Initiated",
        description: `Your browser should start downloading "${link.download}". If not, please check your browser's download settings or pop-up blocker.`,
        variant: "default",
      });

    } catch (error) {
      console.error("Error attempting to download PDF:", error);
      toast({
        title: "PDF Download Failed",
        description: "Could not initiate PDF download. Please check the browser console for more details.",
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

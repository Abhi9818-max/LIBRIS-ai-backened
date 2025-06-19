"use client";

import type { Book } from "@/types";
import Image from "next/image";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface BookCardProps {
  book: Book;
  onRemove: (id: string) => void;
}

export default function BookCard({ book, onRemove }: BookCardProps) {
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
      <CardFooter className="p-4 pt-0">
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

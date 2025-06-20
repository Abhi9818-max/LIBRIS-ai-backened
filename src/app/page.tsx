
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { Book } from "@/types";
import BookCard from "@/components/BookCard";
import UploadBookForm from "@/components/UploadBookForm";
import { Button } from "@/components/ui/button";
import { PlusCircle, BookOpen, Sun, Moon, SearchX } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useToast } from "@/hooks/use-toast";

export default function HomePage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
    let newBooks: Book[] = [];
    try {
      const storedBooks = localStorage.getItem("bookshelf_books");
      if (storedBooks) {
        const parsedBooks = JSON.parse(storedBooks);
        if (Array.isArray(parsedBooks)) {
          newBooks = parsedBooks.reduce((acc: Book[], item: any) => {
            if (item && typeof item.id === 'string' && typeof item.title === 'string') {
              acc.push({
                id: item.id,
                title: item.title,
                author: typeof item.author === 'string' ? item.author : "Unknown Author",
                summary: typeof item.summary === 'string' ? item.summary : "No summary available.",
                coverImageUrl: typeof item.coverImageUrl === 'string' ? item.coverImageUrl : "https://placehold.co/200x300.png",
                pdfFileName: typeof item.pdfFileName === 'string' ? item.pdfFileName : "",
                pdfDataUri: typeof item.pdfDataUri === 'string' ? item.pdfDataUri : "",
                currentPage: typeof item.currentPage === 'number' ? item.currentPage : 1,
                totalPages: typeof item.totalPages === 'number' ? item.totalPages : undefined,
              });
            } else {
              console.warn("Skipping malformed book item from localStorage:", item);
            }
            return acc;
          }, []);
        } else if (parsedBooks !== null) {
          console.warn("Stored bookshelf_books is not an array, resetting. Data:", parsedBooks);
          localStorage.removeItem("bookshelf_books"); 
        }
      }
    } catch (error) {
      console.error("Error loading books from localStorage:", error);
      toast({
        title: "Error Loading Books",
        description: "Could not load saved books. Data might be corrupted. Bookshelf has been reset.",
        variant: "destructive",
      });
      try {
        localStorage.removeItem("bookshelf_books");
      } catch (removeError) {
        console.error("Failed to remove corrupted bookshelf_books from localStorage:", removeError);
      }
    }
    setBooks(newBooks);
  }, [toast]);

  useEffect(() => {
    if (isClient) { 
      try {
        const booksToStore = books.map(book => ({
          id: book.id,
          title: book.title,
          author: book.author,
          summary: book.summary,
          coverImageUrl: book.coverImageUrl,
          pdfFileName: book.pdfFileName,
          // pdfDataUri is intentionally not stored in localStorage due to size
          currentPage: book.currentPage,
          totalPages: book.totalPages,
        }));
        localStorage.setItem("bookshelf_books", JSON.stringify(booksToStore));
      } catch (error) {
        console.error("Error saving books to localStorage:", error);
        toast({
          title: "Storage Error",
          description: "Could not save books to local storage. Changes might not persist.",
          variant: "destructive",
        });
      }
    }
  }, [books, isClient, toast]);

  const handleOpenUploadModal = (book: Book | null = null) => {
    setEditingBook(book);
    setIsUploadModalOpen(true);
  };

  const handleCloseUploadModal = () => {
    setIsUploadModalOpen(false);
    setEditingBook(null);
  };

  const handleSaveBook = (book: Book, isEditing: boolean) => {
    setBooks((prevBooks) => {
      if (isEditing) {
        return prevBooks.map((b) => (b.id === book.id ? book : b));
      }
      const newBookWithProgress = {
        ...book,
        currentPage: book.totalPages ? 1 : undefined,
      };
      return [newBookWithProgress, ...prevBooks];
    });
    handleCloseUploadModal();
  };

  const handleRemoveBook = useCallback((id: string) => {
    setBooks((prevBooks) => prevBooks.filter((book) => book.id !== id));
    toast({
      title: "Book Removed",
      description: "The book has been removed from your shelf.",
    });
  }, [toast]);

  const handleEditBook = useCallback((book: Book) => {
    handleOpenUploadModal(book);
  }, []);
  
  const handleUpdateProgress = useCallback((bookId: string, currentPage: number) => {
    setBooks(prevBooks => 
      prevBooks.map(book => 
        book.id === bookId ? { ...book, currentPage } : book
      )
    );
  }, []);


  if (!isClient) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center">
        <BookOpen className="h-16 w-16 text-primary animate-pulse" />
        <p className="text-xl font-headline text-primary mt-4">Loading BookShelf...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="py-6 px-4 md:px-8 border-b border-border shadow-sm sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="text-3xl font-headline text-primary flex items-center">
            <BookOpen className="h-8 w-8 mr-3 text-accent" />
            BookShelf
          </Link>
          <div className="flex items-center space-x-2">
            <Button aria-label="Add new book" onClick={() => handleOpenUploadModal()}>
              <PlusCircle className="mr-2 h-5 w-5" /> Add Book
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Toggle theme"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              {theme === "light" ? (
                <Moon className="h-[1.2rem] w-[1.2rem]" />
              ) : (
                <Sun className="h-[1.2rem] w-[1.2rem]" />
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 md:p-8">
        {books.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center h-[60vh]">
            <SearchX className="h-24 w-24 text-muted-foreground mb-6" />
            <h2 className="text-2xl font-headline text-foreground mb-2">Your Shelf is Empty</h2>
            <p className="text-muted-foreground mb-6">Click "Add Book" to start building your digital library.</p>
            <Button aria-label="Add your first book" onClick={() => handleOpenUploadModal()}>
              <PlusCircle className="mr-2 h-5 w-5" /> Add Your First Book
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {Array.isArray(books) && books.map((book) => (
              <BookCard 
                key={book.id} 
                book={book} 
                onRemove={handleRemoveBook} 
                onEdit={handleEditBook}
                onUpdateProgress={handleUpdateProgress}
              />
            ))}
          </div>
        )}
      </main>

      {isUploadModalOpen && (
        <UploadBookForm
          isOpen={isUploadModalOpen}
          onOpenChange={setIsUploadModalOpen}
          onSaveBook={handleSaveBook}
          bookToEdit={editingBook}
        />
      )}

      <footer className="py-4 px-4 md:px-8 border-t border-border mt-auto">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} BookShelf App. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

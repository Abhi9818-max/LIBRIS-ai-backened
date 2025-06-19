"use client";

import { useState, useEffect } from "react";
import type { Book } from "@/types";
import BookCard from "@/components/BookCard";
import UploadBookForm from "@/components/UploadBookForm";
import { Button } from "@/components/ui/button";
import { PlusCircle, BookOpen, Sun, Moon, Pencil } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export default function HomePage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setIsClient(true);
    try {
      const storedBooks = localStorage.getItem("bookshelf_books");
      if (storedBooks) {
        setBooks(JSON.parse(storedBooks));
      }
    } catch (error) {
      console.error("Failed to load books from localStorage:", error);
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      try {
        localStorage.setItem("bookshelf_books", JSON.stringify(books));
      } catch (error) {
        console.error("Failed to save books to localStorage:", error);
      }
    }
  }, [books, isClient]);

  const handleSaveBook = (savedBook: Book, isEditing: boolean) => {
    if (isEditing) {
      setBooks((prevBooks) =>
        prevBooks.map((book) => (book.id === savedBook.id ? savedBook : book))
      );
    } else {
      setBooks((prevBooks) => [...prevBooks, savedBook]);
    }
    setIsUploadModalOpen(false);
    setEditingBook(null); // Clear editing state
  };

  const handleOpenEditModal = (book: Book) => {
    setEditingBook(book);
    setIsUploadModalOpen(true);
  };

  const handleRemoveBook = (bookId: string) => {
    setBooks((prevBooks) => prevBooks.filter((book) => book.id !== bookId));
  };

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };
  
  const handleModalOpenChange = (open: boolean) => {
    setIsUploadModalOpen(open);
    if (!open) {
      setEditingBook(null); // Reset editingBook when modal closes
    }
  };


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
      <header className="py-6 px-4 md:px-8 border-b border-border shadow-sm">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-headline text-primary flex items-center">
            <BookOpen className="h-8 w-8 mr-3 text-accent" />
            BookShelf
          </h1>
          <div className="flex items-center space-x-2">
            <Button onClick={() => { setEditingBook(null); setIsUploadModalOpen(true); }} aria-label="Add new book">
              <PlusCircle className="mr-2 h-5 w-5" /> Add Book
            </Button>
            <Button onClick={toggleTheme} variant="outline" size="icon" aria-label="Toggle theme">
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
            <BookOpen className="h-24 w-24 text-muted-foreground mb-6" />
            <h2 className="text-2xl font-headline text-foreground mb-2">Your bookshelf is empty.</h2>
            <p className="text-muted-foreground mb-6">Click "Add Book" to start building your collection.</p>
            <Button onClick={() => { setEditingBook(null); setIsUploadModalOpen(true);}} size="lg">
              <PlusCircle className="mr-2 h-5 w-5" /> Add Your First Book
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {books.map((book) => (
              <BookCard key={book.id} book={book} onRemove={handleRemoveBook} onEdit={handleOpenEditModal} />
            ))}
          </div>
        )}
      </main>

      <UploadBookForm
        isOpen={isUploadModalOpen}
        onOpenChange={handleModalOpenChange}
        onSaveBook={handleSaveBook}
        bookToEdit={editingBook}
      />

      <footer className="py-4 px-4 md:px-8 border-t border-border mt-auto">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} BookShelf App. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

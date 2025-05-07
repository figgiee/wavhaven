'use client';

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const [mounted, setMounted] = React.useState(false);
  const { theme, setTheme } = useTheme();

  // Ensure component is mounted on client before rendering theme-dependent UI
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // Render a placeholder or null until mounted
  if (!mounted) {
    // Return a placeholder button of the same size to avoid layout shifts
    return (
        <Button 
          variant="ghost" 
          size="icon" 
          disabled
          className="icon-button hidden md:flex items-center justify-center w-10 h-10" // Use fixed size matching Button size="icon"
          aria-label="Loading theme toggle"
        >
            <Sun className="h-[1.2rem] w-[1.2rem]" /> { /* Default icon */}
        </Button>
    )
  }

  // Render the actual button once mounted
  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={toggleTheme}
      className="icon-button hidden md:flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
      // Dynamic aria-label is now safe
      aria-label={theme === 'dark' ? "Switch to light mode" : "Switch to dark mode"}
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
} 
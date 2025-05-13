'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import { cn } from '@/lib/utils';
import { ThemeToggleDropdown } from '@/components/theme/theme-toggle-dropdown';
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/breadcrumbs";

const colorNames = [
  { name: 'background', bg: 'bg-background', text: 'text-foreground' },
  { name: 'foreground', bg: 'bg-foreground', text: 'text-background' }, // Swapped for visibility
  { name: 'card', bg: 'bg-card', text: 'text-card-foreground' },
  { name: 'card-foreground', bg: 'bg-card-foreground', text: 'text-card' }, // Swapped
  { name: 'popover', bg: 'bg-popover', text: 'text-popover-foreground' },
  { name: 'popover-foreground', bg: 'bg-popover-foreground', text: 'text-popover' }, // Swapped
  { name: 'primary', bg: 'bg-primary', text: 'text-primary-foreground' },
  { name: 'primary-foreground', bg: 'bg-primary-foreground', text: 'text-primary' }, // Swapped
  { name: 'secondary', bg: 'bg-secondary', text: 'text-secondary-foreground' },
  { name: 'secondary-foreground', bg: 'bg-secondary-foreground', text: 'text-secondary' }, // Swapped
  { name: 'muted', bg: 'bg-muted', text: 'text-muted-foreground' },
  { name: 'muted-foreground', bg: 'bg-muted-foreground', text: 'text-muted' }, // Swapped
  { name: 'accent', bg: 'bg-accent', text: 'text-accent-foreground' },
  { name: 'accent-foreground', bg: 'bg-accent-foreground', text: 'text-accent' }, // Swapped
  { name: 'destructive', bg: 'bg-destructive', text: 'text-destructive-foreground' },
  { name: 'destructive-foreground', bg: 'bg-destructive-foreground', text: 'text-destructive' }, // Swapped
  { name: 'border', bg: 'bg-border', text: 'text-foreground' }, // Border is a line, show with foreground text
  { name: 'input', bg: 'bg-input', text: 'text-foreground' }, // Input bg, show with foreground text
  { name: 'ring', bg: 'bg-ring', text: 'text-primary-foreground' }, // Ring is an outline, usually primary based
];

const conceptualColorNames = [
  // Light conceptual colors (for direct Tailwind class testing if needed)
  { name: 'light-background', bg: 'bg-light-background', text: 'text-light-foreground' },
  { name: 'light-foreground', bg: 'bg-light-foreground', text: 'text-light-background' },
  { name: 'light-primary', bg: 'bg-light-primary', text: 'text-light-primary-foreground' },
  { name: 'light-secondary', bg: 'bg-light-secondary', text: 'text-light-secondary-foreground' },
  { name: 'light-accent', bg: 'bg-light-accent', text: 'text-light-accent-foreground' },
  // Dark conceptual colors
  { name: 'dark-background', bg: 'bg-dark-background', text: 'text-dark-foreground' },
  { name: 'dark-foreground', bg: 'bg-dark-foreground', text: 'text-dark-background' },
  { name: 'dark-primary', bg: 'bg-dark-primary', text: 'text-dark-primary-foreground' },
  { name: 'dark-secondary', bg: 'bg-dark-secondary', text: 'text-dark-secondary-foreground' },
  { name: 'dark-accent', bg: 'bg-dark-accent', text: 'text-dark-accent-foreground' },
];

const fontSizes = [
  'xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl', '9xl'
];

export default function ThemeShowcasePage() {
  const { theme, setTheme } = useTheme();
  const [sliderValue, setSliderValue] = useState([50]);
  const [rangeSliderValue, setRangeSliderValue] = useState([25, 75]);

  const customBreadcrumbItems: BreadcrumbItem[] = [
    { label: "Home", href: "/" },
    { label: "UI Lab", href: "/theme-showcase" }, // Assuming /ui-lab is not the current page, or make it current
    { label: "Current Theme Showcase", href: "/theme-showcase", isCurrent: true },
  ];

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-12">
      <header className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
        <h1 className="text-4xl font-bold">Theme Showcase</h1>
        <ThemeToggleDropdown />
      </header>

      {/* Test prop-based breadcrumbs */}
      <Breadcrumbs items={customBreadcrumbItems} className="mb-8" />

      <section>
        <h2 className="text-2xl font-semibold mb-6">Color Palette (via CSS Variables)</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {colorNames.map((color) => (
            <div key={color.name} className={cn("p-4 rounded-lg shadow space-y-1", color.bg)}>
              <p className={cn("font-medium", color.text)}>fg: {color.name}</p>
              <p className={cn("text-xs", color.text)}>(bg: {color.name})</p>
              <div className={cn("w-full h-4 mt-1 rounded", color.name === 'border' ? 'border-2 border-border' : 'bg-transparent')}></div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-6">Conceptual Tailwind Colors (Directly from config)</h2>
        <p className="text-sm text-muted-foreground mb-4">
          These test the direct Tailwind color classes defined in `tailwind.config.ts`. They should match the CSS variable versions above when the correct theme is active.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {conceptualColorNames.map((color) => (
            <div key={color.name} className={cn("p-4 rounded-lg shadow space-y-1", color.bg)}>
              <p className={cn("font-medium", color.text)}>{color.name}</p>
              <p className={cn("text-xs", color.text)}>(bg: {color.bg})</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-6">Typography</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-medium mb-2">Font Family:</h3>
            <p className="font-sans">Primary Sans-Serif (Inter)</p>
            {/* <p className="font-heading">Heading Font (Satoshi - if configured)</p> */}
          </div>
          <div>
            <h3 className="text-xl font-medium mb-2">Font Sizes:</h3>
            <div className="space-y-2">
              {fontSizes.map((size) => (
                <p key={size} className={cn(`text-${size}`)}>
                  text-{size}: Lorem ipsum dolor sit amet.
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-6">Shadcn/ui Components</h2>
        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-medium mb-4">Buttons</h3>
            <div className="flex flex-wrap gap-4 items-center">
              <Button>Default</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
              <Button disabled>Disabled</Button>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-4">Input</h3>
            <Input type="email" placeholder="Email address" className="max-w-sm" />
          </div>

          <div>
            <h3 className="text-xl font-medium mb-4">Card</h3>
            <Card className="max-w-sm">
              <CardHeader>
                <CardTitle>Card Title</CardTitle>
                <CardDescription>This is a card description.</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Card content goes here. Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline">Cancel</Button>
                <Button>Deploy</Button>
              </CardFooter>
            </Card>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-4">Alerts</h3>
            <div className="space-y-4 max-w-md">
              <Alert>
                <AlertTitle>Heads up!</AlertTitle>
                <AlertDescription>
                  You can add components to your app using the cli.
                </AlertDescription>
              </Alert>
              <Alert variant="destructive">
                <AlertTitle>Error!</AlertTitle>
                <AlertDescription>
                  Your session has expired. Please log in again.
                </AlertDescription>
              </Alert>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-4">Dialog</h3>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Open Dialog</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Edit Profile</DialogTitle>
                  <DialogDescription>
                    Make changes to your profile here. Click save when you're done.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="name" className="text-right">
                      Name
                    </label>
                    <Input id="name" defaultValue="Pedro Duarte" className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="username" className="text-right">
                      Username
                    </label>
                    <Input id="username" defaultValue="@peduarte" className="col-span-3" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Save changes</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-4">Slider</h3>
            <div className="max-w-sm pt-4">
              <Slider defaultValue={[50]} max={100} step={1} />
            </div>
            <div className="max-w-sm pt-8">
              <Slider defaultValue={[25, 75]} max={100} step={1} />
            </div>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-4">Badges</h3>
            <div className="flex flex-wrap gap-4 items-center">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
} 
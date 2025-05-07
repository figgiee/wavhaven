import React from 'react';
import Image from 'next/image';
import { OrderWithDetails } from '@/app/(customer)/downloads/page'; // Import the type
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { format } from 'date-fns'; // For formatting dates
import { cn, formatPrice } from '@/lib/utils'; // Import formatPrice instead of formatCurrency
import { DownloadButton } from '@/components/features/DownloadButton'; // Will create this next

interface OrderHistoryProps {
  orders: OrderWithDetails[];
}

export function OrderHistory({ orders }: OrderHistoryProps) {
  return (
    <Accordion type="single" collapsible className="w-full space-y-4">
      {orders.map((order) => (
        <AccordionItem value={`order-${order.id}`} key={order.id}>
          <AccordionTrigger className="px-4 py-3 bg-muted/50 rounded-md hover:bg-muted/80">
            <div className="flex justify-between items-center w-full">
              <div>
                <span className="font-semibold">Order #{order.id.substring(0, 8)}...</span>
                <span className="text-sm text-muted-foreground ml-4">
                  {format(new Date(order.createdAt), 'PPpp')} - {order.items.length} item(s)
                </span>
              </div>
              <span className="font-semibold">{formatPrice(order.amountTotal)}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 px-4 border rounded-b-md">
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-4 py-2 border-b last:border-b-0">
                  <div className="flex items-center gap-4 flex-1">
                     {item.track.imageUrl ? (
                        <Image
                            src={item.track.imageUrl}
                            alt={item.track.title}
                            width={64}
                            height={64}
                            className="rounded-md object-cover aspect-square"
                        />
                        ) : (
                        <div className="w-16 h-16 bg-secondary rounded-md flex items-center justify-center text-muted-foreground">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
                        </div>
                     )}
                     <div>
                        <p className="font-semibold">{item.track.title}</p>
                        <p className="text-sm text-muted-foreground">License: {item.license.type}</p>
                        {/* Display Price at Purchase maybe? 
                        <p className="text-sm text-muted-foreground">Price: {formatCurrency(item.priceAtPurchase)}</p> 
                        */}
                     </div>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                     {item.track.trackFiles.length > 0 ? (
                        item.track.trackFiles.map((file) => (
                          <DownloadButton 
                            key={file.id} 
                            trackFileId={file.id} 
                            fileName={file.fileName || `${item.track.title} (${file.fileType})`} 
                          />
                        ))
                     ) : (
                        <p className="text-sm text-muted-foreground">No downloadable files.</p>
                     )}
                  </div>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
} 
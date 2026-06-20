'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { 
 Mail, 
 RefreshCw, 
 AlertCircle, 
 Calendar, 
 ChevronLeft, 
 ChevronRight, 
 ArrowLeft,
 Info,
 Loader2,
 Database,
 Eye,
 CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import { z } from 'zod';

const OutboxEventSchema = z.object({
 id: z.string(),
 eventType: z.string(),
 payload: z.object({
  to: z.string().optional(),
  subject: z.string().optional(),
 }).passthrough().nullable().optional(),
 status: z.string(),
 attempts: z.number(),
 lastError: z.string().nullable(),
 processedAt: z.string().nullable(),
 createdAt: z.string(),
 expiresAt: z.string(),
});

const OutboxResponseSchema = z.object({
 data: z.array(OutboxEventSchema),
 meta: z.object({
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
 }),
});

type OutboxEvent = z.infer<typeof OutboxEventSchema>;

export function OutboxMonitoringClient() {
 const tCommon = useTranslations('common');
 const { playSound } = useAudioFeedback();

 const [isLoading, setIsLoading] = useState(true);
 const [isRetryingMap, setIsRetryingMap] = useState<Record<string, boolean>>({});
 const [data, setData] = useState<OutboxEvent[]>([]);
 const [selectedEvent, setSelectedEvent] = useState<OutboxEvent | null>(null);
 const [page, setPage] = useState(1);
 const [totalPages, setTotalPages] = useState(1);
 const [totalEvents, setTotalEvents] = useState(0);

 
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'SUCCESS': return 'text-status-success bg-status-success/10 border-status-success/20';
      case 'PENDING': return 'text-status-warning bg-status-warning/10 border-status-warning/20';
      case 'FAILED': return 'text-status-error bg-status-error/10 border-status-error/20';
      default: return 'text-muted-foreground bg-muted/10 border-border';
    }
  };

  const fetchEvents = async (pageNum: number) => {
  setIsLoading(true);
  try {
   const res = await apiClient.get(
    `/admin/outbox?page=${pageNum}&limit=10`,
    OutboxResponseSchema
   );
   setData(res.data);
   setTotalPages(res.meta.totalPages || 1);
   setTotalEvents(res.meta.total || 0);
   if (res.data.length > 0 && !selectedEvent) {
    setSelectedEvent(res.data[0]);
   }
  } catch (err: unknown) {
   const message = err instanceof Error ? err.message : String(err);
   toast.error(message || 'Failed to fetch outbox events');
  } finally {
   setIsLoading(false);
  }
 };

 useEffect(() => {
  fetchEvents(page);
 }, [page]);

 const handleRetryEvent = async (id: string) => {
  setIsRetryingMap(prev => ({ ...prev, [id]: true }));
  try {
   await apiClient.post(
    `/admin/outbox/${id}/retry`,
    z.unknown(),
    {}
   );
   playSound('success');
   toast.success('Event successfully requeued for transmission.');
   
   // Update local state by removing retried event or updating status
   setData(prev => prev.filter(item => item.id !== id));
   setTotalEvents(prev => Math.max(0, prev - 1));
   
   if (selectedEvent?.id === id) {
    setSelectedEvent(null);
   }
   
   // Re-fetch current page to backfill
   fetchEvents(page);
  } catch (err: unknown) {
   playSound('error');
   const message = err instanceof Error ? err.message : String(err);
   toast.error(message || 'Failed to retry event');
  } finally {
   setIsRetryingMap(prev => ({ ...prev, [id]: false }));
  }
 };

 return (
  <div className="min-w-0 gap-6 flex-1 space-y-8 flex mx-auto flex-col max-w-7xl w-full">
   {/* Premium Header */}
   <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 min-w-0">
    <div className="space-y-4">
     <Link 
      href="/dashboard"
      className="group inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-operational-cyan transition-all"
     >
      <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform rtl:rotate-180" />
      Return to Dashboard
     </Link>
     <div className="space-y-1">
      <div className="flex items-center gap-3">
       <div className="p-2.5 bg-operational-red/10 rounded-2xl border border-operational-red/20 animate-pulse">
        <Mail className="w-6 h-6 text-operational-red" />
       </div>
       <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground" style={{ fontFamily: 'Tajawal, sans-serif' }}>
        Outbox Event Monitoring
       </h1>
      </div>
      <p className="text-sm text-muted-foreground/80 max-w-2xl mt-2" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
       Track all transactional mail transmissions, analyze SMTP runtime exceptions, and manually trigger redeliveries.
      </p>
     </div>
    </div>
   </div>

   <div className="w-full flex flex-col md:flex-row gap-6" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
    {/* Left Column (Empty State or Selected Event Details) */}
    <div className="w-full md:w-1/3 min-w-0 flex flex-col">
     <AnimatePresence mode="wait">
      {selectedEvent ? (
       <motion.div
        key={selectedEvent.id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="p-6 md:p-8 rounded-xl bg-card border border-border shadow-sm h-full flex flex-col justify-between min-w-0"
       >
        <div className="space-y-6">
         <div className="flex items-center gap-3 border-b border-surface-highest/10 pb-4">
          <div className="p-2 bg-operational-cyan/10 rounded-xl">
           <Eye className="w-5 h-5 text-operational-cyan" />
          </div>
          <div>
           <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
            Event Specifications
           </h3>
           <p className="text-[10px] text-muted-foreground/60 uppercase mt-0.5">
            Log Entry Details
           </p>
          </div>
         </div>

         <div className="space-y-4">
          {/* Event Type & Info */}
          <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 min-w-0">
           <div className="space-y-1 flex-1 min-w-0 w-full">
            <span className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-wider">
             Type
            </span>
            <div className="text-xs font-bold text-foreground break-all whitespace-normal" dir="ltr" style={{ textAlign: 'start' }}>
             {selectedEvent.eventType}
            </div>
           </div>
           <div className="space-y-1 sm:text-end shrink-0 min-w-fit">
            <span className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-wider">
             Attempts
            </span>
            <p className="text-xs font-bold text-foreground">
             {selectedEvent.attempts} / 5
            </p>
           </div>
          </div>

          {/* Recipient */}
          <div className="p-4 bg-surface-container-highest/20 rounded-2xl border border-surface-highest/5 space-y-1">
           <span className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-wider">
            Recipient (To)
           </span>
           <p dir="ltr" className="text-xs font-mono font-bold text-foreground break-all text-left">
            {selectedEvent.payload?.to || 'Not Specified'}
           </p>
          </div>

          {/* Last Exception */}
          <div className={`p-4 rounded-2xl border space-y-2 ${selectedEvent.status === 'FAILED' ? 'bg-status-error/5 border-status-error/10' : 'bg-muted/5 border-border'}`}>
           <div className="flex items-center gap-2">
            <AlertCircle className={`w-4 h-4 ${selectedEvent.status === 'FAILED' ? 'text-status-error' : 'text-muted-foreground'}`} />
            <span className={`text-[10px] uppercase font-bold tracking-wider ${selectedEvent.status === 'FAILED' ? 'text-status-error' : 'text-muted-foreground'}`}>
             {selectedEvent.status === 'FAILED' ? 'Last SMTP Exception' : 'Event Details'}
            </span>
           </div>
           <p dir="ltr" className="text-xs font-mono text-muted-foreground leading-relaxed bg-card border border-border shadow-sm p-3 rounded-lg break-all max-h-32 overflow-y-auto text-left">
            {selectedEvent.lastError || 'None logged.'}
           </p>
          </div>

          {/* JSON Payload Spec */}
          <div className="space-y-2">
           <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-operational-cyan" />
            <span className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-wider">
             JSON Payload Data
            </span>
           </div>
           <div dir="ltr" className="text-left font-mono w-full overflow-x-auto">
            <pre className="text-[10px] text-muted-foreground/80 leading-relaxed bg-card border border-border shadow-sm p-4 rounded-2xl overflow-x-auto max-h-60 whitespace-pre-wrap break-words shadow-inner" style={{ direction: 'ltr', textAlign: 'left' }}>
             {JSON.stringify(selectedEvent.payload, null, 2)}
            </pre>
           </div>
          </div>
         </div>
        </div>

        <div className="pt-6 border-t border-surface-highest/10 flex gap-4">
         {selectedEvent.status === 'FAILED' && (
         <Button
          onClick={() => handleRetryEvent(selectedEvent.id)}
          disabled={isRetryingMap[selectedEvent.id]}
          className="flex-1 h-14 bg-operational-cyan text-white hover:bg-operational-cyan/90 transition-all font-bold uppercase text-[10px] tracking-widest gap-3 rounded-2xl shadow-sm"
         >
          {isRetryingMap[selectedEvent.id] ? (
           <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
           <RefreshCw className="w-4 h-4" />
          )}
          Requeue Communication
         </Button>
         )}
        </div>
       </motion.div>
      ) : (
       <div className="w-full h-full min-w-0 flex flex-col items-center justify-center p-8 bg-card border border-border rounded-xl text-center py-40">
        <Info className="w-10 h-10 text-muted-foreground/40 mb-3" />
        <div className="max-w-[200px] text-center">
         <h3 className="text-lg font-semibold text-foreground">No Event Selected</h3>
         <p className="text-sm text-muted-foreground mt-2">
          Click on any outbox communication event in the queue list to inspect details.
         </p>
        </div>
       </div>
      )}
     </AnimatePresence>
    </div>

    {/* Right Column: Queue List */}
    <div className="w-full lg:w-2/3 flex flex-col space-y-4">
     <div className="flex items-center justify-between">
      <div>
       <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
        Communications Queue
       </h2>
       <p className="text-xs text-muted-foreground mt-0.5">
        Total events: <span className="font-bold text-foreground">{totalEvents}</span>
       </p>
      </div>
      <Button
       variant="ghost"
       size="sm"
       onClick={() => fetchEvents(page)}
       disabled={isLoading}
       className="h-10 px-3 hover:bg-surface-container-high rounded-xl text-muted-foreground hover:text-foreground"
      >
       <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
      </Button>
     </div>

     {isLoading ? (
      <div className="py-20 flex flex-col items-center justify-center space-y-4 min-w-0">
       <Loader2 className="w-8 h-8 animate-spin text-operational-cyan" />
       <p className="text-xs text-muted-foreground">Retrieving communications queue...</p>
      </div>
     ) : data.length === 0 ? (
      <div className="w-full py-20 flex flex-col items-center justify-center text-center space-y-4 min-w-0">
       <div className="p-4 bg-status-success/10 rounded-full border border-status-success/20">
        <CheckCircle2 className="w-10 h-10 text-status-success" />
       </div>
       <div className="space-y-1 max-w-[280px] mx-auto text-center">
        <p className="text-sm font-bold text-foreground">Empty Queue!</p>
        <p className="text-xs text-muted-foreground">
         No communications events found in the database logs.
        </p>
       </div>
      </div>
     ) : (
      <div className="space-y-3">
       {data.map((event) => (
        <motion.div
         key={event.id}
         layoutId={`event-card-${event.id}`}
         onClick={() => setSelectedEvent(event)}
         className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
          selectedEvent?.id === event.id 
           ? 'bg-operational-cyan/5 border-operational-cyan/40 shadow-sm'
           : 'bg-card border border-border shadow-sm hover:border-operational-cyan/20'
         }`}
        >
         <div className="space-y-2 flex-1 w-full min-w-0">
          <div className="flex flex-wrap items-center gap-2">
           <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold tracking-wider border ${getStatusColor(event.status)}`}>
            <span dir="ltr" className="inline-block text-left break-all whitespace-normal">
             {event.eventType}
            </span>
           </span>
           <span className="text-[10px] text-muted-foreground/60 font-mono shrink-0" dir="ltr">
            Attempts: {event.attempts}
           </span>
          </div>
          <h4 className="text-xs font-bold text-foreground line-clamp-1" dir="ltr">
           {String(event.payload?.subject || event.payload?.documentNumber || event.payload?.id || 'No Document Ref / Subject')}
          </h4>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-[10px] text-muted-foreground/60">
           <span dir="ltr" className="inline-flex items-center gap-1 text-left whitespace-nowrap">
            <Calendar className="w-3 h-3 shrink-0" />
            {new Intl.DateTimeFormat('en-US', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(event.createdAt))}
           </span>
           <span className="hidden sm:inline">•</span>
           <span dir="ltr" className={`font-medium line-clamp-1 text-left ${event.status === 'FAILED' ? 'text-status-error' : 'text-muted-foreground'}`}>
            {event.lastError || (event.status === 'SUCCESS' ? 'Processed Successfully' : 'Pending Processing')}
           </span>
          </div>
         </div>

         <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <Button
           size="sm"
           variant="outline"
           onClick={(e) => {
            e.stopPropagation();
            handleRetryEvent(event.id);
           }}
           disabled={isRetryingMap[event.id]}
           className="h-10 px-4 border-outline-low hover:bg-surface-container-high transition-all text-xs font-bold gap-2 rounded-xl group"
          >
           {isRetryingMap[event.id] ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-operational-cyan" />
           ) : (
            <RefreshCw className="w-3.5 h-3.5 text-operational-cyan group-hover:rotate-180 transition-transform duration-500" />
           )}
           Requeue
          </Button>
         </div>
        </motion.div>
       ))}
      </div>
     )}

     {/* Pagination */}
     {totalPages > 1 && (
      <div className="flex items-center justify-between border-t border-surface-highest/10 pt-4 px-2">
       <Button
        variant="outline"
        size="sm"
        disabled={page === 1}
        onClick={() => setPage(prev => Math.max(1, prev - 1))}
        className="h-10 px-4 border-outline-low rounded-xl text-xs font-bold gap-1"
       >
        <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
        Prev
       </Button>
       <span className="text-xs text-muted-foreground font-medium">
        Page <span className="font-bold text-foreground">{page}</span> of {totalPages}
       </span>
       <Button
        variant="outline"
        size="sm"
        disabled={page === totalPages}
        onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
        className="h-10 px-4 border-outline-low rounded-xl text-xs font-bold gap-1"
       >
        Next
        <ChevronRight className="w-4 h-4 rtl:rotate-180" />
       </Button>
      </div>
     )}
    </div>
   </div>
  </div>
 );
}

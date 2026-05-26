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
  ArrowRightLeft,
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
  payload: z.any(),
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
    limit: z.number(),
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

  const fetchFailedEvents = async (pageNum: number) => {
    setIsLoading(true);
    try {
      const res = await apiClient.get(
        `/admin/outbox/failed?page=${pageNum}&limit=10`,
        OutboxResponseSchema
      );
      setData(res.data);
      setTotalPages(res.meta.totalPages || 1);
      setTotalEvents(res.meta.total || 0);
      if (res.data.length > 0 && !selectedEvent) {
        setSelectedEvent(res.data[0]);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch outbox events');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFailedEvents(page);
  }, [page]);

  const handleRetryEvent = async (id: string) => {
    setIsRetryingMap(prev => ({ ...prev, [id]: true }));
    try {
      await apiClient.post(
        `/admin/outbox/${id}/retry`,
        z.any(),
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
      fetchFailedEvents(page);
    } catch (err: any) {
      playSound('error');
      toast.error(err.message || 'Failed to retry event');
    } finally {
      setIsRetryingMap(prev => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="space-y-4">
          <Link 
            href="/admin"
            className="group inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-operational-cyan transition-all"
          >
            <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform rtl:rotate-180" />
            Return to Admin
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
              Track failed transactional mail transmissions, analyze SMTP runtime exceptions, and manually trigger redeliveries.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
        {/* Left Side: Failed Events List */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 rounded-[2rem] bg-surface-container-low border border-white/5 space-y-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-surface-highest/10 pb-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                  Failed Communications Queue
                </h3>
                <p className="text-xs text-muted-foreground">
                  Total failed events: <span className="font-bold text-operational-red">{totalEvents}</span>
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchFailedEvents(page)}
                disabled={isLoading}
                className="h-10 px-3 hover:bg-surface-container-high rounded-xl text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-operational-cyan" />
                <p className="text-xs text-muted-foreground">Retrieving failed outbox queue...</p>
              </div>
            ) : data.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                <div className="p-4 bg-status-success/10 rounded-full border border-status-success/20">
                  <CheckCircle2 className="w-10 h-10 text-status-success" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-foreground">All Clear!</p>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    No failed communications events found in the database logs.
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
                        : 'bg-surface-container-lowest border-outline-low hover:border-operational-cyan/20'
                    }`}
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-status-error/10 text-status-error border border-status-error/20 uppercase font-bold tracking-wider">
                          {event.eventType}
                        </span>
                        <span className="text-[10px] text-muted-foreground/60 font-mono">
                          Attempts: {event.attempts}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-foreground truncate max-w-sm">
                        {event.payload?.subject || 'No Subject Defined'}
                      </h4>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(event.createdAt).toLocaleString()}
                        </span>
                        <span>•</span>
                        <span className="text-status-error font-medium truncate max-w-xs block">
                          {event.lastError || 'Unknown Error'}
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

        {/* Right Side: Detailed Bento Card */}
        <div className="lg:col-span-5">
          <AnimatePresence mode="wait">
            {selectedEvent ? (
              <motion.div
                key={selectedEvent.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-6 md:p-8 rounded-[2.5rem] bg-surface-container-low border border-white/5 space-y-8 shadow-sm h-full flex flex-col justify-between"
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
                    <div className="grid grid-cols-2 gap-4 p-4 bg-surface-container-highest/20 rounded-2xl border border-surface-highest/5">
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-wider">
                          Type
                        </span>
                        <p className="text-xs font-bold text-foreground">
                          {selectedEvent.eventType}
                        </p>
                      </div>
                      <div className="space-y-1">
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
                      <p className="text-xs font-mono font-bold text-foreground break-all">
                        {selectedEvent.payload?.to || 'Not Specified'}
                      </p>
                    </div>

                    {/* Last Exception Exception */}
                    <div className="p-4 bg-status-error/5 rounded-2xl border border-status-error/10 space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-status-error" />
                        <span className="text-[10px] text-status-error uppercase font-bold tracking-wider">
                          Last SMTP Exception
                        </span>
                      </div>
                      <p className="text-xs font-mono text-muted-foreground leading-relaxed bg-surface-container-lowest/50 p-3 rounded-lg border border-white/5 break-all max-h-32 overflow-y-auto">
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
                      <pre className="text-[10px] font-mono text-muted-foreground/80 leading-relaxed bg-surface-container-lowest p-4 rounded-2xl border border-outline-low overflow-auto max-h-60 break-all shadow-inner">
                        {JSON.stringify(selectedEvent.payload, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-surface-highest/10 flex gap-4">
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
                </div>
              </motion.div>
            ) : (
              <div className="p-8 rounded-[2.5rem] bg-surface-container-low border border-white/5 shadow-sm h-full flex flex-col justify-center items-center text-center py-40">
                <Info className="w-10 h-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-bold text-foreground">No Event Selected</p>
                <p className="text-xs text-muted-foreground max-w-xs mt-1">
                  Click on any failed outbox communication event in the queue list to inspect details.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

import os

filepath = r'c:\kitchen-store-inventory-system\apps\web\src\app\[locale]\(app)\admin\outbox\OutboxMonitoringClient.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

get_status_color = """
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'SUCCESS': return 'text-status-success bg-status-success/10 border-status-success/20';
      case 'PENDING': return 'text-status-warning bg-status-warning/10 border-status-warning/20';
      case 'FAILED': return 'text-status-error bg-status-error/10 border-status-error/20';
      default: return 'text-muted-foreground bg-muted/10 border-border';
    }
  };

  const fetchEvents ="""

content = content.replace("const fetchEvents =", get_status_color)

# Replace the hardcoded bg-status-error badge for event type
old_badge = 'className="text-[10px] font-mono px-2 py-0.5 rounded bg-status-error/10 text-status-error border \nborder-status-error/20 uppercase font-bold tracking-wider"'
old_badge2 = 'className="text-[10px] font-mono px-2 py-0.5 rounded bg-status-error/10 text-status-error border border-status-error/20 uppercase font-bold tracking-wider"'
new_badge = 'className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold tracking-wider border ${getStatusColor(event.status)}`}'

content = content.replace(old_badge, new_badge)
content = content.replace(old_badge2, new_badge)

# Replace the text-status-error on the last error message text
old_error_text = 'className="text-status-error font-medium truncate max-w-xs block text-left"'
new_error_text = 'className={`font-medium truncate max-w-xs block text-left ${event.status === \'FAILED\' ? \'text-status-error\' : \'text-muted-foreground\'}`}'

content = content.replace(old_error_text, new_error_text)

# Also when viewing an event, "Last SMTP Exception" section:
# Change title based on status
old_last_exception = '<span className="text-[10px] text-status-error uppercase font-bold tracking-wider">\n               Last SMTP Exception\n              </span>'
new_last_exception = '<span className={`text-[10px] uppercase font-bold tracking-wider ${selectedEvent.status === \'FAILED\' ? \'text-status-error\' : \'text-muted-foreground\'}`}>\n               {selectedEvent.status === \'FAILED\' ? \'Last SMTP Exception\' : \'Event Details\'}\n              </span>'

content = content.replace(old_last_exception, new_last_exception)

# And the container of the exception
old_exception_container = '<div className="p-4 bg-status-error/5 rounded-2xl border border-status-error/10 space-y-2">'
new_exception_container = '<div className={`p-4 rounded-2xl border space-y-2 ${selectedEvent.status === \'FAILED\' ? \'bg-status-error/5 border-status-error/10\' : \'bg-muted/5 border-border\'}`}>'
content = content.replace(old_exception_container, new_exception_container)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated OutboxMonitoringClient.tsx badges")

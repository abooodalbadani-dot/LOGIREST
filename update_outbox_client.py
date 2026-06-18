import os

filepath = r'c:\kitchen-store-inventory-system\apps\web\src\app\[locale]\(app)\admin\outbox\OutboxMonitoringClient.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

replacements = [
    ('fetchFailedEvents', 'fetchEvents'),
    ('/admin/outbox/failed?page=', '/admin/outbox?page='),
    ('href="/admin"', 'href="/dashboard"'),
    ('Return to Admin', 'Return to Dashboard'),
    ('RETURN TO ADMIN', 'RETURN TO DASHBOARD'),
    ('FAILED COMMUNICATIONS QUEUE', 'COMMUNICATIONS QUEUE'),
    ('Total failed events:', 'Total events:'),
    ('No failed communications events found', 'No communications events found'),
    ('any failed outbox communication event', 'any outbox communication event'),
    ('All Clear!', 'Empty Queue!'),
    ('Track failed transactional mail', 'Track all transactional mail')
]

for old_str, new_str in replacements:
    content = content.replace(old_str, new_str)

# One more fix: adding status colors for PENDING, SUCCESS, FAILED
# Let's see if we can find where status is rendered.
# We'll just run this replacement script first.

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated OutboxMonitoringClient.tsx")

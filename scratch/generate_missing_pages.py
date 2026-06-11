import re
import os

sidebar_path = "apps/web/src/components/layouts/Sidebar.tsx"
hrefs = []

with open(sidebar_path, "r", encoding="utf-8") as f:
    content = f.read()
    # Find all pattern: href: '/...'
    matches = re.findall(r"href:\s*'([^']+)'", content)
    hrefs.extend(matches)
    matches_double = re.findall(r'href:\s*"([^"]+)"', content)
    hrefs.extend(matches_double)

# Remove duplicates
hrefs = sorted(list(set(hrefs)))

# Map href to titles
href_to_title = {
    '/dashboard': 'Dashboard',
    '/inventory/balance': 'Inventory Balance',
    '/inventory/lots': 'Inventory Lots',
    '/inventory/movements': 'Inventory Movements',
    '/goods-received': 'Goods Received',
    '/issues': 'Issues',
    '/transfers': 'Transfers',
    '/stocktake': 'Stocktake',
    '/adjustments': 'Adjustments',
    '/kitchen-requests': 'Kitchen Requests',
    '/inventory/scan-mode': 'Inventory Scan Mode',
    '/inventory/expired-override': 'Expired Override',
    '/stocktake/archive': 'Stocktake Archive',
    '/transfers/hub': 'Transfer Hub',
    '/purchase-requests': 'Purchase Requests',
    '/purchase-orders': 'Purchase Orders',
    '/communications/notifications': 'Notifications',
    '/communications/notifications/templates': 'Notification Templates',
    '/communications/notifications/settings': 'Notification Settings',
    '/communications/email-outbox': 'Email Outbox',
    '/master-data/items': 'Items',
    '/master-data/categories': 'Categories',
    '/master-data/warehouses': 'Warehouses',
    '/master-data/units-of-measure': 'Units of Measure',
    '/master-data/suppliers': 'Suppliers',
    '/master-data/departments': 'Departments',
    '/master-data/barcodes': 'Barcodes',
    '/master-data/barcodes/mapping': 'Barcode Mapping',
    '/master-data/currencies': 'Currencies',
    '/master-data/fx-rates': 'FX Rates',
    '/master-data/branches': 'Branches',
    '/master-data/import': 'Import Data',
    '/reports': 'Reports Hub',
    '/reports/available-inventory': 'Available Inventory Report',
    '/reports/currency-summaries': 'Currency Summaries Report',
    '/reports/expiry': 'Expiry Report',
    '/reports/movements': 'Movements Report',
    '/reports/procurement-status': 'Procurement Status Report',
    '/reports/stocktake-variance': 'Stocktake Variance Report',
    '/admin/users': 'User Management',
    '/admin/roles': 'Role Management',
    '/admin/roles/matrix': 'Roles Matrix',
    '/admin/settings': 'System Settings',
    '/admin/mail-settings': 'Mail Settings',
    '/admin/outbox': 'Outbox Monitoring',
    '/admin/restaurant-profile': 'Restaurant Profile',
    '/admin/audit-logs': 'Audit Logs',
}

base_dir = "apps/web/src/app/[locale]/(app)"

created_files = []

for href in hrefs:
    # Build target path
    # Remove leading slash
    clean_href = href.lstrip('/')
    target_path = os.path.join(base_dir, clean_href, "page.tsx")
    
    # Check if page.tsx exists at target path
    if not os.path.exists(target_path):
        # Create directories if they do not exist
        os.makedirs(os.path.dirname(target_path), exist_ok=True)
        
        # Get title
        title = href_to_title.get(href, clean_href.replace('-', ' ').title())
        
        # Generate minimal page.tsx content
        content = f"""'use client';

import React from 'react';

export default function {title.replace(' ', '')}Page() {{
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">{title}</h1>
    </div>
  );
}}
"""
        with open(target_path, "w", encoding="utf-8") as out:
            out.write(content)
        created_files.append(target_path)
        print(f"Created: {target_path}")

print(f"Total placeholder files created: {len(created_files)}")

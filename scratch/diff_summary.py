import os
import difflib

def analyze_diffs():
    backup_root = r"e:\Kitchen‑Store Inventory System\scratch\app_backup"
    app_root = r"e:\Kitchen‑Store Inventory System\apps\web\src\app"

    modified_files = [
        r"[locale]\(app)\(operations)\adjustments\AdjustmentListClient.tsx",
        r"[locale]\(app)\(operations)\adjustments\[id]\AdjustmentForm.tsx",
        r"[locale]\(app)\(operations)\adjustments\new\AdjustmentCreateClient.tsx",
        r"[locale]\(app)\(operations)\issues\IssueListClient.tsx",
        r"[locale]\(app)\(operations)\issues\[id]\scan-mode\page.tsx",
        r"[locale]\(app)\(operations)\issues\new\issue-form.tsx",
        r"[locale]\(app)\(operations)\kitchen-requests\[id]\KitchenRequestForm.tsx",
        r"[locale]\(app)\(operations)\kitchen-requests\new\KitchenRequestFormClient.tsx",
        r"[locale]\(app)\(operations)\stocktake\[id]\StocktakeForm.tsx",
        r"[locale]\(app)\(operations)\stocktake\[id]\StocktakeViewer.tsx",
        r"[locale]\(app)\(operations)\stocktake\[id]\approve\StocktakeApproveClient.tsx",
        r"[locale]\(app)\(operations)\stocktake\[id]\count\StocktakeCountClient.tsx",
        r"[locale]\(app)\(operations)\stocktake\[id]\post\StocktakePostClient.tsx",
        r"[locale]\(app)\(operations)\stocktake\[id]\start\StocktakeStartClient.tsx",
        r"[locale]\(app)\(operations)\stocktake\[id]\variance\StocktakeVarianceClient.tsx",
        r"[locale]\(app)\(operations)\stocktake\archive\StocktakeArchiveClient.tsx",
        r"[locale]\(app)\(operations)\stocktake\new\stocktake-form.tsx",
        r"[locale]\(app)\(operations)\transfers\TransferListClient.tsx",
        r"[locale]\(app)\(operations)\transfers\[id]\dispute\TransferDisputeClient.tsx",
        r"[locale]\(app)\(operations)\transfers\[id]\receive\TransferReceiveClient.tsx",
        r"[locale]\(app)\(operations)\transfers\[id]\ship\TransferShipClient.tsx",
        r"[locale]\(app)\(operations)\transfers\new\TransferNewClient.tsx",
        r"[locale]\(app)\(operations)\yield-management\YieldManagementClient.tsx",
        r"[locale]\(app)\(procurement)\goods-received\[id]\post\page.tsx",
        r"[locale]\(app)\(procurement)\goods-received\[id]\scan-mode\GRNScanClient.tsx",
        r"[locale]\(app)\(procurement)\goods-received\[id]\scan-mode\LotEntryModal.tsx",
        r"[locale]\(app)\(procurement)\goods-received\page.tsx",
        r"[locale]\(app)\(procurement)\landed-cost\LandedCostClient.tsx",
        r"[locale]\(app)\(procurement)\purchase-orders\[id]\POForm.tsx",
        r"[locale]\(app)\admin\restaurant-profile\ProfileFormClient.tsx",
        r"[locale]\(app)\admin\roles\page.tsx",
        r"[locale]\(app)\communications\email-outbox\page.tsx",
        r"[locale]\(app)\communications\notifications\page.tsx",
        r"[locale]\(app)\communications\notifications\settings\NotificationSettingsClient.tsx",
        r"[locale]\(app)\communications\notifications\templates\[id]\TemplateEditorClient.tsx",
        r"[locale]\(app)\inventory\expired-override\ExpiredOverrideClient.tsx",
        r"[locale]\(app)\inventory\lots\LotBalanceClient.tsx",
        r"[locale]\(app)\inventory\transfers\hub\TransferHubClient.tsx",
        r"[locale]\(app)\master-data\barcodes\BarcodeFormClient.tsx",
        r"[locale]\(app)\master-data\barcodes\mapping\BarcodeMappingClient.tsx",
        r"[locale]\(app)\master-data\branches\BranchListClient.tsx",
        r"[locale]\(app)\master-data\categories\CategoryFormClient.tsx",
        r"[locale]\(app)\master-data\currencies\CurrencyFormClient.tsx",
        r"[locale]\(app)\master-data\currencies\[id]\fx-rates\FXRatesClient.tsx",
        r"[locale]\(app)\master-data\items\ItemFormClient.tsx",
        r"[locale]\(app)\master-data\suppliers\SupplierFormClient.tsx",
        r"[locale]\(app)\master-data\warehouses\WarehouseFormClient.tsx",
        r"[locale]\(app)\master-data\warehouses\WarehouseListClient.tsx",
        r"[locale]\(auth)\forgot-password\page.tsx",
        r"[locale]\(auth)\login\page.tsx",
        r"[locale]\(auth)\reset-password\page.tsx",
        r"[locale]\layout.tsx",
        r"[locale]\not-found.tsx",
        r"globals.css"
    ]

    out_report = []

    for rel_path in modified_files:
        b_path = os.path.join(backup_root, rel_path)
        a_path = os.path.join(app_root, rel_path)

        if not os.path.exists(b_path) or not os.path.exists(a_path):
            continue

        with open(b_path, 'r', encoding='utf-8', errors='ignore') as fb:
            b_lines = fb.readlines()
        with open(a_path, 'r', encoding='utf-8', errors='ignore') as fa:
            a_lines = fa.readlines()

        diff = list(difflib.unified_diff(b_lines, a_lines, fromfile='Backup', tofile='Active', n=2))
        
        # Analyze diff
        additions = 0
        deletions = 0
        for line in diff:
            if line.startswith('+') and not line.startswith('+++'):
                additions += 1
            elif line.startswith('-') and not line.startswith('---'):
                deletions += 1

        out_report.append(f"==================================================")
        out_report.append(f"FILE: {rel_path}")
        out_report.append(f"Backup Size: {os.path.getsize(b_path)} bytes | Active Size: {os.path.getsize(a_path)} bytes")
        out_report.append(f"Diff Summary: +{additions} additions, -{deletions} deletions")
        out_report.append(f"==================================================")
        
        # Keep interesting parts of diff (max 40 lines of diff for each)
        if len(diff) > 0:
            out_report.extend(diff[:50])
            if len(diff) > 50:
                out_report.append(f"... ({len(diff) - 50} more lines of diff)")
        else:
            out_report.append("No text differences found (maybe line endings or encoding).")
        out_report.append("\n\n")

    with open(r"e:\Kitchen‑Store Inventory System\scratch\diff_details.txt", 'w', encoding='utf-8') as fout:
        fout.write("\n".join(out_report))

    print("Diff analysis complete. Saved to scratch/diff_details.txt.")

if __name__ == '__main__':
    analyze_diffs()

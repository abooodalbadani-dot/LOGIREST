# Operational Workflow Refactoring Report
**System:** Kitchen-Store Inventory System  
**Document Status:** (Status: PLANNING)  
**Target:** High-Throughput Enterprise Ledger & Grid Stabilizations  

---

## 1. Executive Summary & Architectural Motivation

In high-throughput kitchen-store operations, speed, accuracy, and predictability are the ultimate measures of front-end engineering success. The legacy user interfaces in the Kitchen-Store Inventory System, which rely heavily on card-based form topologies, are ill-suited for the rigorous demands of enterprise inventory management. 

### Why Card-Based Forms Fail in Enterprise Operations
1. **Low Data Density & Cognitive Load:** A card-based layout displays a single line item over a large visual area. For document types with dozens or hundreds of lines (such as a multi-item Purchase Order or a warehouse Stocktake), cards force the user into endless vertical scrolling, fragmenting their context and increasing cognitive load.
2. **DOM Performance Degradation:** Each card component wraps numerous DOM nodes (divs, buttons, icons, borders). Rendering 100+ items on a mobile tablet inside the kitchen using card structures balloons the DOM tree to thousands of nodes, causing sluggish scroll behavior, keyboard input lag, and browser memory exhaustion.
3. **Imprecise Tab-Index Flow:** Keyboard-driven data entry is highly non-deterministic in card layouts. Because input fields are vertically and horizontally scattered across multiple card boundaries, standard browser tab flows break, forcing users to repeatedly reach for the mouse or touchscreen.

### The Dense Grid Solution
To resolve these inefficiencies, we are transitioning all 7 core operational screens from cards to a **High-Density Keyboard-First Grid Architecture**. 
* **Compact Metrics:** Cell padding is compressed to `py-1 px-2` (using Tailwind CSS `py-1 px-2` or standard styling) with line heights restricted to a strict minimum.
* **No-Line Rule Compliance:** In accordance with our design system, grid borders are entirely removed. Row separation is achieved through alternating tonal shifts (`bg-surface/50` vs. `bg-surface`) and clear hover highlights, eliminating screen clutter and visual noise.
* **Continuous Tab Progression:** Row columns are carefully indexed so that pressing `Tab` or `Shift+Tab` moves focus horizontally across the active row's inputs (e.g., Item Selection -> UoM -> Quantity -> Price -> Expiry -> Actions) before moving to the next row, enabling high-speed touch-typing.

---

## 2. Advanced Barcode Scanning Mechanics

Barcode scanners behave as keyboard wedge devices, injecting rapid-fire keystrokes followed by a carriage return (`Enter` or `\r`). Standard browser inputs cannot distinguish these signals from manual human typing, leading to partial scans, accidental focus loss, or form double-submission. We have engineered a three-tier barcode processing layer to guarantee rock-solid accuracy.

### 2.1 Timing-Based USB Wedge Auto-Detection
To differentiate between a human typing and a hardware scanner, we measure the temporal gap between incoming keystrokes.
* **Heuristic Threshold:** A hardware barcode scanner outputs a string with an average keystroke interval of **10ms to 20ms**. In contrast, a fast human typist average interval is rarely below **80ms**.
* **Detection Algorithm:** We implement a key-press time tracker. If more than 3 consecutive characters arrive with an inter-character latency of **<50ms**, the system automatically flags the input stream as a hardware barcode scan.
* **Wedge Logic:** Once a scan is detected, the front-end dynamically bypasses standard input validation, suspends manual autocomplete search suggestions, and routes the raw buffered string directly to the barcode processor.

### 2.2 Hook-Driven Always-Focused Management
During high-speed kitchen operations, focus loss is catastrophic. If the user scans an item while the cursor is not in the barcode field, the scan is lost or injected into an incorrect input.
* **Auto-Focus Hook (`useAlwaysFocused`):** A custom hook that attaches event listeners to the window and the barcode container.
* **Refocus Loop:** Upon detecting a `blur` event on the scanner field, the hook checks if the active element is another valid input field (such as a quantity override). If it is not, the hook schedules an immediate refocus (`inputRef.current.focus()`) within a **100ms** event loop.
* **Async & Modal Safe Guards:** During asynchronous API calls (e.g., looking up a scanned barcode) or when a modal is active (e.g., the FEFOLotAllocator), the refocus loop is temporarily paused. Upon modal close, the focus is immediately reclaimed by the primary barcode input.

### 2.3 Keystroke Debouncing & Double-Trigger Prevention
* **Buffered Input:** Raw keystrokes are collected into a local React `useRef` buffer rather than updating the component state on every keypress. This avoids continuous component re-renders during high-speed scans.
* **Carriage Return Trigger:** The scanner buffer is only processed once a termination character (typically `\r`, `\n`, or a keypress of `Enter`) is received.
* **Double-Trigger Prevention:** High-speed scanning can cause double-scans of the same item within milliseconds. We implement a **300ms** lock window. If a duplicate barcode is detected within 300ms of a successful scan, the subsequent event is suppressed, and a soft warning tone is emitted to alert the operator.

---

## 3. Transactional Safety & Guard Systems

Operational inventory systems must prevent state corruption, double-deductions, and transactional discrepancies. We enforce strict transactional safety on the front-end before any request hits the network.

### 3.1 Double-Post Prevention
* **State-Driven Locks:** All primary action buttons (e.g., **Post**, **Approve**, **Submit**) utilize the `useTransition` or React Query `isPending` state. The button component automatically injects a loading spinner, changes visual state, and sets `disabled={isPending}`.
* **Idempotency Keys:** Every data-modifying mutation creates a unique client-side UUID (e.g., `crypto.randomUUID()`) when the form is initialized. This key is passed in the request header (`X-Idempotency-Key`). If a network timeout occurs and the user clicks "Retry", the server identifies the key and prevents duplicate ledger writes.

### 3.2 Warehouse Lock Systems (`useWarehouseLock`)
Inventory movements (transfers, issues, adjustments) must not occur inside a warehouse that is currently undergoing an active stocktake.
* **Lock State Subscription:** The front-end leverages the `useWarehouseLock` hook, subscribing to the global lock state. 
* **Proactive UI Freezing:** When a warehouse is locked:
  1. A persistent pulsating visual banner is displayed at the top of the workspace: `"Posting in Progress — Inventory Frozen"`.
  2. The entire form is wrapped in a `<DocumentLock>` component, which automatically applies `disabled={isLocked}` to all child inputs, select boxes, and grid elements.
  3. Action buttons are disabled and show a padlock icon.
* **Dual-Warehouse Locks:** Transfer documents are unique because they involve a *source* warehouse and a *destination* warehouse. The Transfers form checks both warehouses using `isEitherLocked(sourceId, destId)` and blocks shipment or receipt if *either* warehouse is undergoing stocktake.

### 3.3 Workflow Validation & Status Checks
All actions are governed by the decentralized state machine in `core/workflow/document-engine.ts`.
* **State Transitions:** Before rendering any state-changing button, the UI wraps the action in an `<ActionGuard>` component. This component references `canPerformActionV2(currentUser, currentDocumentStatus, targetStatus)` to determine visibility.
* **Immutable Records:** Once a document (e.g., GRN, Stocktake, Adjustment) reaches a terminal state (`POSTED` or `APPROVED`), the front-end automatically enforces read-only mode, freezing all grids, inline edits, and metadata inputs to prevent tampering.

---

## 4. Architectural Summary

The combination of dense keyboard-friendly grids, timing-aware barcode scanning, and multi-layered transaction guards provides the Kitchen-Store Inventory System with a robust, enterprise-grade user interface. By executing this planning phase, we lay down a deterministic foundation that makes backend integration secure, highly performant, and completely safe from concurrency and validation failures.

async function run() {
  const adminEmail = 'admin@otantikrestaurant.com';
  const password = 'Password123!';
  const baseUrl = 'http://localhost:4000/api/v1';

  console.log(`[Validation] Authenticating as ${adminEmail}...`);
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password })
  });

  if (!loginRes.ok) {
    throw new Error(`Authentication failed: ${await loginRes.text()}`);
  }

  const loginData = await loginRes.json();
  const token = loginData.accessToken;
  const user = loginData.user;
  console.log(`[Validation] Logged in successfully. Token length: ${token.length}`);

  // Retrieve active scope
  const profileRes = await fetch(`${baseUrl}/auth/profile`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const profileData = await profileRes.json();
  const activeScope = profileData.user?.scopes?.[0] || {};
  const branchId = activeScope.branchId || '00ddac3d-45ab-4d92-bb33-57da07188c55';
  const warehouseId = activeScope.warehouseId || '3ecd0f12-0375-4a9a-9c46-900d056e3bca';
  console.log(`[Validation] Scope: Branch=${branchId}, Warehouse=${warehouseId}`);

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'x-branch-id': branchId,
    'x-warehouse-id': warehouseId
  };

  // Fetch GRNs
  console.log(`[Validation] Fetching GRNs...`);
  const grnsRes = await fetch(`${baseUrl}/procurement/grns`, { headers });
  if (!grnsRes.ok) {
    throw new Error(`Failed to fetch GRNs: ${await grnsRes.text()}`);
  }
  const grnsData = await grnsRes.json();
  const grns = grnsData.data || [];
  console.log(`[Validation] Found ${grns.length} GRNs.`);

  let draftGrn = grns.find(g => g.status === 'DRAFT');

  if (!draftGrn) {
    console.log(`[Validation] No DRAFT GRN found. Creating a new one against an approved PO...`);
    // Find an APPROVED PO
    const posRes = await fetch(`${baseUrl}/procurement/purchase-orders?status=APPROVED`, { headers });
    const posData = await posRes.json();
    const approvedPos = posData.data || [];
    if (approvedPos.length === 0) {
      throw new Error('No APPROVED Purchase Orders available to create a test GRN.');
    }
    const po = approvedPos[0];
    console.log(`[Validation] Using approved PO: ${po.poNumber} (ID: ${po.id})`);

    // Fetch details of the PO to get items
    const poDetailRes = await fetch(`${baseUrl}/procurement/purchase-orders/${po.id}`, { headers });
    const poDetailData = await poDetailRes.json();
    const poLines = poDetailData.data?.lines || [];
    if (poLines.length === 0) {
      throw new Error(`PO ${po.poNumber} has no lines.`);
    }

    const grnLines = poLines.map(line => ({
      itemId: line.itemId,
      quantity: Number(line.quantity),
      unitPrice: Number(line.unitPrice),
      lotId: `new-${Date.now()}`,
      lotNumber: `LOT-TEST-${Date.now()}`,
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }));

    console.log(`[Validation] Creating draft GRN...`);
    const createRes = await fetch(`${baseUrl}/procurement/grns`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        poId: po.id,
        warehouseId: warehouseId,
        lines: grnLines
      })
    });

    if (!createRes.ok) {
      throw new Error(`Failed to create GRN: ${await createRes.text()}`);
    }

    const createData = await createRes.json();
    draftGrn = createData.data;
    console.log(`[Validation] Created DRAFT GRN: ${draftGrn.grnNumber} (ID: ${draftGrn.id})`);
  }

  // Fetch full details of the DRAFT GRN to get the lines and version
  console.log(`[Validation] Fetching full details for GRN ID ${draftGrn.id}...`);
  const detailRes = await fetch(`${baseUrl}/procurement/grns/${draftGrn.id}`, { headers });
  if (!detailRes.ok) {
    throw new Error(`Failed to fetch GRN detail: ${await detailRes.text()}`);
  }
  const detailData = await detailRes.json();
  draftGrn = detailData.data;
  console.log(`[Validation] Full details retrieved. GRN: ${draftGrn.grnNumber}, version: ${draftGrn.version}`);

  // Verify updates work on Draft status (Action 2 validation)
  console.log(`[Validation] Testing PUT update on DRAFT GRN (Action 2 check)...`);
  const updatePayload = {
    poId: draftGrn.poId,
    warehouseId: draftGrn.warehouseId,
    version: draftGrn.version,
    notes: 'Validation note update',
    lines: (draftGrn.lines || []).map(line => ({
      id: line.id,
      itemId: line.item.id,
      lotId: line.lot?.id || null,
      lotNumber: line.lot?.lotNumber || `LOT-UPD-${Date.now()}`,
      expiryDate: line.lot?.expiryDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      receivedQty: Number(line.receivedQty),
      unitCostForeign: Number(line.unitCostForeign)
    }))
  };

  const updateRes = await fetch(`${baseUrl}/procurement/grns/${draftGrn.id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(updatePayload)
  });

  if (!updateRes.ok) {
    throw new Error(`Failed to update DRAFT GRN (500 Error?): ${await updateRes.text()}`);
  }
  const updateData = await updateRes.json();
  const updatedGrn = updateData.data;
  console.log(`[Validation] DRAFT GRN updated successfully. Version is now: ${updatedGrn.version}`);

  // Submit the GRN (Action 3 / Action 4 check)
  console.log(`[Validation] Submitting the GRN to RECEIVED status...`);
  const submitRes = await fetch(`${baseUrl}/procurement/grns/${updatedGrn.id}/submit`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ version: updatedGrn.version })
  });

  if (!submitRes.ok) {
    throw new Error(`Submission failed (404/500 Error?): ${await submitRes.text()}`);
  }

  const submitData = await submitRes.json();
  const submittedGrn = submitData.data;
  console.log(`[Validation] GRN submitted successfully. Current status: ${submittedGrn.status}`);

  if (submittedGrn.status !== 'RECEIVED') {
    throw new Error(`Expected status to be RECEIVED, but got: ${submittedGrn.status}`);
  }
  console.log(`[Validation] SUCCESS: GRN status changed to RECEIVED.`);

  // Test if updating a RECEIVED GRN is locked/blocked
  console.log(`[Validation] Verifying that the form is locked (attempting to update a RECEIVED GRN)...`);
  const lockUpdatePayload = {
    poId: submittedGrn.poId,
    warehouseId: submittedGrn.warehouseId,
    version: submittedGrn.version,
    notes: 'This update should fail',
    lines: (submittedGrn.lines || []).map(line => ({
      id: line.id,
      itemId: line.item.id,
      lotId: line.lot?.id || null,
      receivedQty: Number(line.receivedQty),
      unitCostForeign: Number(line.unitCostForeign)
    }))
  };

  const lockUpdateRes = await fetch(`${baseUrl}/procurement/grns/${submittedGrn.id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(lockUpdatePayload)
  });

  if (lockUpdateRes.ok) {
    throw new Error('Security/Business Logic Violation: Successfully updated a RECEIVED GRN, but it should be read-only/locked!');
  }

  console.log(`[Validation] Update attempt blocked correctly with status ${lockUpdateRes.status}. Message: ${await lockUpdateRes.text()}`);
  console.log(`[Validation] SUCCESS: Form is fully locked and read-only once submitted to RECEIVED.`);
}

run().catch(err => {
  console.error('[Validation] Failed:', err);
  process.exit(1);
});

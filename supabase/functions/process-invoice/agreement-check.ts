export async function checkAgreementDeviations(supabase, userId, supplierId, supplierName, lineItemRecords, documentId, invoiceDate) {
  const { data: agreements } = await supabase.from("agreements").select(`id, supplier_id, name, discount_percent, start_date, end_date, status, agreement_items(id, product_group_id, category_id, description, agreed_price, discount_percent, max_price, unit)`).eq("user_id", userId).eq("status", "active");
  if (!agreements || agreements.length === 0) return {
    deviations: [],
    inserted: 0
  };
  const productIds = lineItemRecords.filter((li)=>li.product_id && li.is_primary).map((li)=>li.product_id);
  const { data: products } = await supabase.from("products").select("id, group_id, supplier_id").in("id", productIds.length > 0 ? productIds : [
    "00000000-0000-0000-0000-000000000000"
  ]);
  const productGroupMap = new Map();
  (products || []).forEach((p)=>{
    productGroupMap.set(p.id, p.group_id);
  });
  const deviations = [];
  for (const li of lineItemRecords){
    if (!li.product_id || !li.is_primary) continue;
    const pgId = productGroupMap.get(li.product_id);
    for (const agr of agreements){
      const items = agr.agreement_items || [];
      if (invoiceDate) {
        if (agr.start_date && invoiceDate < agr.start_date) continue;
        if (agr.end_date && invoiceDate > agr.end_date) continue;
      }
      for (const ai of items){
        if (!(pgId && ai.product_group_id === pgId)) continue;
        if (agr.supplier_id !== supplierId) {
          const ap = ai.agreed_price || ai.max_price;
          const sv = li.unit_price && ap && li.unit_price > ap ? Math.round((li.unit_price - ap) * (li.quantity || 1) * 100) / 100 : null;
          deviations.push({
            user_id: userId,
            agreement_id: agr.id,
            product_id: li.product_id,
            supplier_id: supplierId,
            deviation_type: "wrong_supplier",
            actual_price: li.unit_price,
            agreed_price: ap,
            potential_savings: sv,
            invoice_date: invoiceDate,
            description: `Köpt "${li.raw_description}" från ${supplierName} istället för avtalsleverantör (avtal: ${agr.name})`,
            status: "new"
          });
        }
        if (agr.supplier_id === supplierId && ai.max_price && li.unit_price && li.unit_price > ai.max_price) {
          deviations.push({
            user_id: userId,
            agreement_id: agr.id,
            product_id: li.product_id,
            supplier_id: supplierId,
            deviation_type: "price_above_agreed",
            actual_price: li.unit_price,
            agreed_price: ai.max_price,
            potential_savings: Math.round((li.unit_price - ai.max_price) * (li.quantity || 1) * 100) / 100,
            invoice_date: invoiceDate,
            description: `"${li.raw_description}" kostar ${li.unit_price} kr men avtalat maxpris är ${ai.max_price} kr`,
            status: "new"
          });
        }
        if (agr.supplier_id === supplierId && (ai.discount_percent || agr.discount_percent)) {
          const dp = ai.discount_percent || agr.discount_percent || 0;
          if (dp > 0 && ai.agreed_price && li.unit_price) {
            const exp = ai.agreed_price * (1 - dp / 100);
            if (li.unit_price > exp * 1.02) {
              deviations.push({
                user_id: userId,
                agreement_id: agr.id,
                product_id: li.product_id,
                supplier_id: supplierId,
                deviation_type: "no_discount_applied",
                actual_price: li.unit_price,
                agreed_price: exp,
                potential_savings: Math.round((li.unit_price - exp) * (li.quantity || 1) * 100) / 100,
                invoice_date: invoiceDate,
                description: `"${li.raw_description}" saknar ${dp}% rabatt. Betalt ${li.unit_price} kr, förväntat ${exp.toFixed(2)} kr`,
                status: "new"
              });
            }
          }
        }
      }
    }
  }
  let inserted = 0;
  if (deviations.length > 0) {
    const { error } = await supabase.from("agreement_deviations").insert(deviations);
    if (!error) inserted = deviations.length;
    else console.error("Deviation insert error:", error);
  }
  return {
    deviations,
    inserted
  };
}

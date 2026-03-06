import * as XLSX from "xlsx";

interface ExportData {
  products: Record<string, unknown>[];
  alerts: Record<string, unknown>[];
  suppliers: Record<string, unknown>[];
  deviations: Record<string, unknown>[];
}

export function generateExcelReport(data: ExportData, filename: string) {
  const workbook = XLSX.utils.book_new();

  if (data.products.length > 0) {
    const productRows = data.products.map((product) => ({
      Produkt: String(product.product_name ?? ""),
      Leverantor: String(product.supplier_name ?? ""),
      Enhet: String(product.unit ?? ""),
      "Senaste pris (SEK)": product.latest_price ?? "",
      "Foregaende pris (SEK)": product.previous_price ?? "",
      "Forandring (%)":
        product.change_percent != null ? `${product.change_percent}%` : "",
      "Antal fakturor": product.invoice_count ?? "",
      Senast: String(product.latest_date ?? ""),
    }));
    const sheet = XLSX.utils.json_to_sheet(productRows);
    sheet["!cols"] = [
      { wch: 30 },
      { wch: 25 },
      { wch: 10 },
      { wch: 16 },
      { wch: 18 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(workbook, sheet, "Produkter");
  }

  if (data.alerts.length > 0) {
    const alertRows = data.alerts.map((alert) => ({
      Produkt: String(alert.product_name ?? ""),
      Leverantor: String(alert.supplier_name ?? ""),
      "Gammalt pris (SEK)": alert.previous_price ?? "",
      "Nytt pris (SEK)": alert.new_price ?? "",
      "Forandring (%)":
        alert.change_percent != null ? `${alert.change_percent}%` : "",
      Datum: String(alert.new_invoice_date ?? ""),
      Status: String(alert.status ?? ""),
    }));
    const sheet = XLSX.utils.json_to_sheet(alertRows);
    sheet["!cols"] = [
      { wch: 30 },
      { wch: 25 },
      { wch: 18 },
      { wch: 18 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(workbook, sheet, "Prisvarningar");
  }

  if (data.suppliers.length > 0) {
    const supplierRows = data.suppliers.map((supplier) => ({
      Leverantor: String(supplier.supplier_name ?? ""),
      Orgnr: String(supplier.org_number ?? ""),
      "Antal fakturor": supplier.invoice_count ?? "",
      "Antal produkter": supplier.product_count ?? "",
      "Forsta faktura": String(supplier.first_invoice ?? ""),
      "Senaste faktura": String(supplier.last_invoice ?? ""),
      "Oppna varningar": supplier.open_alerts ?? "",
    }));
    const sheet = XLSX.utils.json_to_sheet(supplierRows);
    sheet["!cols"] = [
      { wch: 30 },
      { wch: 16 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(workbook, sheet, "Leverantorer");
  }

  if (data.deviations.length > 0) {
    const deviationRows = data.deviations.map((deviation) => ({
      Typ: String(deviation.deviation_type_label ?? deviation.deviation_type ?? ""),
      Produkt: String(deviation.product_name ?? ""),
      Avtal: String(deviation.agreement_name ?? ""),
      "Faktiskt pris (SEK)": deviation.actual_price ?? "",
      "Avtalat pris (SEK)": deviation.agreed_price ?? "",
      "Mojlig besparing (SEK)": deviation.potential_savings ?? "",
      Datum: String(deviation.invoice_date ?? ""),
      Status: String(deviation.status ?? ""),
    }));
    const sheet = XLSX.utils.json_to_sheet(deviationRows);
    sheet["!cols"] = [
      { wch: 18 },
      { wch: 28 },
      { wch: 28 },
      { wch: 18 },
      { wch: 18 },
      { wch: 20 },
      { wch: 14 },
      { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(workbook, sheet, "Avtalsavvikelser");
  }

  XLSX.writeFile(workbook, filename);
}

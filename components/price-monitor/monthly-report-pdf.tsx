"use client";

import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";

Font.register({
  family: "Inter",
  src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2",
});

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Inter", fontSize: 10 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 8 },
  subtitle: { fontSize: 12, color: "#6B7280", marginBottom: 24 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
    borderBottom: "1px solid #E5E7EB",
    paddingBottom: 4,
  },
  row: { flexDirection: "row", borderBottom: "1px solid #F3F4F6", paddingVertical: 4 },
  headerRow: { flexDirection: "row", borderBottom: "2px solid #111", paddingVertical: 4 },
  cell: { flex: 1 },
  wideCell: { flex: 2 },
  statBox: {
    width: "31%",
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 4,
    marginRight: 10,
  },
  statLabel: { fontSize: 9, color: "#6B7280" },
  statValue: { fontSize: 18, fontWeight: "bold", marginTop: 4 },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#9CA3AF",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

export interface MonthlyReportData {
  companyName: string;
  period: string;
  generatedAt: string;
  totalSpend: number;
  spend30d: number;
  spend12m: number;
  topSuppliers: Array<{ name: string; spend: number; invoiceCount: number }>;
  priceAlerts: Array<{
    product: string;
    supplier: string;
    oldPrice: number;
    newPrice: number;
    change: number;
  }>;
  deviations: Array<{
    type: string;
    product: string;
    actual: number;
    agreed: number;
    savings: number;
  }>;
  topProducts: Array<{ name: string; supplier: string; price: number; invoices: number }>;
}

function getCopy(locale: "sv" | "en") {
  if (locale === "en") {
    return {
      title: "Monthly Report - Purchase Analysis",
      total12m: "Total spend (12 mo)",
      last30d: "Last 30 days",
      alerts: "Alerts",
      topSuppliers: "Top suppliers",
      supplier: "Supplier",
      spend: "Spend",
      invoices: "Invoices",
      priceChanges: "Price changes",
      product: "Product",
      oldPrice: "Old price",
      newPrice: "New price",
      change: "Change",
      deviations: "Agreement deviations",
      type: "Type",
      actual: "Actual",
      agreed: "Agreed",
      savings: "Savings",
      generated: "Generated",
      page: "Page",
      of: "of",
    };
  }

  return {
    title: "Manadsrapport - Inkoppsanalys",
    total12m: "Total utgift (12 man)",
    last30d: "Senaste 30 dagar",
    alerts: "Varningar",
    topSuppliers: "Topp leverantorer",
    supplier: "Leverantor",
    spend: "Utgift",
    invoices: "Fakturor",
    priceChanges: "Prisforandringar",
    product: "Produkt",
    oldPrice: "Gammalt pris",
    newPrice: "Nytt pris",
    change: "Forandring",
    deviations: "Avtalsavvikelser",
    type: "Typ",
    actual: "Faktiskt",
    agreed: "Avtalat",
    savings: "Besparing",
    generated: "Genererad",
    page: "Sida",
    of: "av",
  };
}

function formatSEK(value: number, locale: "sv" | "en") {
  return new Intl.NumberFormat(locale === "en" ? "en-GB" : "sv-SE", {
    style: "currency",
    currency: "SEK",
    minimumFractionDigits: 0,
  }).format(value);
}

export function MonthlyReportPDF({
  data,
  locale,
}: {
  data: MonthlyReportData;
  locale: "sv" | "en";
}) {
  const copy = getCopy(locale);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.subtitle}>
          {data.companyName} · {data.period}
        </Text>

        <View style={{ flexDirection: "row", marginBottom: 20 }}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>{copy.total12m}</Text>
            <Text style={styles.statValue}>{formatSEK(data.spend12m, locale)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>{copy.last30d}</Text>
            <Text style={styles.statValue}>{formatSEK(data.spend30d, locale)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>{copy.alerts}</Text>
            <Text style={styles.statValue}>{data.priceAlerts.length}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{copy.topSuppliers}</Text>
        <View style={styles.headerRow}>
          <Text style={styles.wideCell}>{copy.supplier}</Text>
          <Text style={styles.cell}>{copy.spend}</Text>
          <Text style={styles.cell}>{copy.invoices}</Text>
        </View>
        {data.topSuppliers.slice(0, 10).map((supplier, index) => (
          <View key={`${supplier.name}-${index}`} style={styles.row}>
            <Text style={styles.wideCell}>{supplier.name}</Text>
            <Text style={styles.cell}>{formatSEK(supplier.spend, locale)}</Text>
            <Text style={styles.cell}>{supplier.invoiceCount}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Text>
            {copy.generated} {data.generatedAt}
          </Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `${copy.page} ${pageNumber} ${copy.of} ${totalPages}`
            }
          />
        </View>
      </Page>

      {data.priceAlerts.length > 0 && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>{copy.priceChanges}</Text>
          <View style={styles.headerRow}>
            <Text style={styles.wideCell}>{copy.product}</Text>
            <Text style={styles.cell}>{copy.supplier}</Text>
            <Text style={styles.cell}>{copy.oldPrice}</Text>
            <Text style={styles.cell}>{copy.newPrice}</Text>
            <Text style={styles.cell}>{copy.change}</Text>
          </View>
          {data.priceAlerts.map((alert, index) => (
            <View key={`${alert.product}-${index}`} style={styles.row}>
              <Text style={styles.wideCell}>{alert.product}</Text>
              <Text style={styles.cell}>{alert.supplier}</Text>
              <Text style={styles.cell}>{formatSEK(alert.oldPrice, locale)}</Text>
              <Text style={styles.cell}>{formatSEK(alert.newPrice, locale)}</Text>
              <Text style={styles.cell}>{alert.change.toFixed(1)}%</Text>
            </View>
          ))}

          <View style={styles.footer}>
            <Text>
              {copy.generated} {data.generatedAt}
            </Text>
            <Text
              render={({ pageNumber, totalPages }) =>
                `${copy.page} ${pageNumber} ${copy.of} ${totalPages}`
              }
            />
          </View>
        </Page>
      )}

      {data.deviations.length > 0 && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>{copy.deviations}</Text>
          <View style={styles.headerRow}>
            <Text style={styles.cell}>{copy.type}</Text>
            <Text style={styles.wideCell}>{copy.product}</Text>
            <Text style={styles.cell}>{copy.actual}</Text>
            <Text style={styles.cell}>{copy.agreed}</Text>
            <Text style={styles.cell}>{copy.savings}</Text>
          </View>
          {data.deviations.map((deviation, index) => (
            <View key={`${deviation.product}-${index}`} style={styles.row}>
              <Text style={styles.cell}>{deviation.type}</Text>
              <Text style={styles.wideCell}>{deviation.product}</Text>
              <Text style={styles.cell}>{formatSEK(deviation.actual, locale)}</Text>
              <Text style={styles.cell}>{formatSEK(deviation.agreed, locale)}</Text>
              <Text style={styles.cell}>{formatSEK(deviation.savings, locale)}</Text>
            </View>
          ))}

          <View style={styles.footer}>
            <Text>
              {copy.generated} {data.generatedAt}
            </Text>
            <Text
              render={({ pageNumber, totalPages }) =>
                `${copy.page} ${pageNumber} ${copy.of} ${totalPages}`
              }
            />
          </View>
        </Page>
      )}
    </Document>
  );
}

export async function generateAndDownloadPDF(
  data: MonthlyReportData,
  locale: "sv" | "en"
) {
  const blob = await pdf(<MonthlyReportPDF data={data} locale={locale} />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safePeriod = data.period.toLowerCase().replace(/\s+/g, "-");

  link.href = url;
  link.download = locale === "en" ? `monthly-report-${safePeriod}.pdf` : `manadsrapport-${safePeriod}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

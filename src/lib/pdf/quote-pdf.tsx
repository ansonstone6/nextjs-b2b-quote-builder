import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { QuoteItemComputed } from "@/lib/pricing/types";
import type { SerializedQuote } from "@/lib/quotes/serialize";

const styles = StyleSheet.create({
  page: { padding: 44, fontSize: 10, fontFamily: "Times-Roman", color: "#1a1a1a" },
  brand: { fontSize: 22, fontFamily: "Times-Bold", letterSpacing: 1 },
  brandRule: { marginTop: 6, marginBottom: 18, height: 1, backgroundColor: "#1a1a1a" },
  meta: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  metaCol: { flexDirection: "column" },
  label: { fontSize: 8, color: "#666", textTransform: "uppercase", letterSpacing: 1 },
  value: { fontSize: 11, fontFamily: "Times-Bold", marginTop: 2 },
  body: { fontSize: 10 },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
    paddingBottom: 6,
    marginTop: 14,
    fontFamily: "Times-Bold",
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingTop: 10,
    paddingBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#bdbdbd",
  },
  colDesc: { width: "62%", paddingRight: 8 },
  colQty: { width: "10%", textAlign: "right" },
  colUnit: { width: "14%", textAlign: "right" },
  colLine: { width: "14%", textAlign: "right" },
  itemTitle: { fontSize: 10, fontFamily: "Times-Bold", marginBottom: 3 },
  itemSub: { fontSize: 9, color: "#555" },
  breakdownBox: {
    marginTop: 6,
    paddingTop: 4,
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: "#ddd",
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 1,
    paddingBottom: 1,
  },
  breakdownLabel: { fontSize: 8.5, color: "#444", flex: 1 },
  breakdownDetail: { fontSize: 7.5, color: "#888" },
  breakdownAmount: { fontSize: 8.5, color: "#444", textAlign: "right" },
  totals: { marginTop: 22, alignSelf: "flex-end", width: "45%" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  grand: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#1a1a1a",
    fontFamily: "Times-Bold",
    fontSize: 12,
  },
  notes: { marginTop: 28, fontSize: 9, color: "#444" },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 44,
    right: 44,
    textAlign: "center",
    fontSize: 8,
    color: "#888",
    letterSpacing: 0.5,
  },
});

type Props = { brand: string; quote: SerializedQuote };

function fmtMoney(currency: string, amount: string | number): string {
  const n = typeof amount === "number" ? amount : Number.parseFloat(amount);
  if (!Number.isFinite(n)) return `${currency} ${amount}`;
  return `${currency} ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function QuotePdfDocument({ brand, quote }: Props) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.brand}>{brand}</Text>
        <View style={styles.brandRule} />

        <View style={styles.meta}>
          <View style={styles.metaCol}>
            <Text style={styles.label}>Prepared for</Text>
            <Text style={styles.value}>{quote.client.companyName}</Text>
            <Text style={styles.body}>{quote.client.contactName}</Text>
            <Text style={styles.body}>{quote.client.email}</Text>
          </View>
          <View style={[styles.metaCol, { alignItems: "flex-end" }]}>
            <Text style={styles.label}>Quote</Text>
            <Text style={styles.value}>{quote.quoteNumber}</Text>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.body}>{fmtDate(quote.createdAt)}</Text>
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.colDesc}>Description</Text>
          <Text style={styles.colQty}>Qty</Text>
          <Text style={styles.colUnit}>Unit</Text>
          <Text style={styles.colLine}>Line</Text>
        </View>
        {quote.items.map((item) => {
          const qty = item.quantity || 1;
          const lineTotal = Number.parseFloat(item.lineTotal);
          const unit = qty > 0 ? lineTotal / qty : lineTotal;
          const title = item.label?.trim() || item.product.name;
          const specBits = [
            item.material.name,
            `${item.width}×${item.height} ${item.product.dimensionUnitLabel}`,
            ...item.selectedOptionNames,
          ];
          const computed = item.computed as QuoteItemComputed | null;
          return (
            <View key={item.id} style={styles.tableRow} wrap={false}>
              <View style={styles.colDesc}>
                <Text style={styles.itemTitle}>{title}</Text>
                <Text style={styles.itemSub}>{specBits.join(" · ")}</Text>
                {computed?.rows?.length ? (
                  <View style={styles.breakdownBox}>
                    {computed.rows.map((r) => (
                      <View key={r.key} style={styles.breakdownRow}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={styles.breakdownLabel}>{r.label}</Text>
                          {r.detail ? (
                            <Text style={styles.breakdownDetail}>{r.detail}</Text>
                          ) : null}
                        </View>
                        <Text style={styles.breakdownAmount}>
                          {r.amount < 0 ? "−" : ""}
                          {fmtMoney(quote.currency, Math.abs(r.amount))}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
              <Text style={styles.colQty}>{qty}</Text>
              <Text style={styles.colUnit}>{fmtMoney(quote.currency, unit)}</Text>
              <Text style={styles.colLine}>{fmtMoney(quote.currency, item.lineTotal)}</Text>
            </View>
          );
        })}

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Subtotal</Text>
            <Text>{fmtMoney(quote.currency, quote.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Tax</Text>
            <Text>{fmtMoney(quote.currency, quote.taxAmount)}</Text>
          </View>
          <View style={styles.grand}>
            <Text>Total</Text>
            <Text>{fmtMoney(quote.currency, quote.grandTotal)}</Text>
          </View>
        </View>

        {quote.notes ? (
          <View style={styles.notes}>
            <Text style={styles.label}>Notes</Text>
            <Text style={{ marginTop: 4 }}>{quote.notes}</Text>
          </View>
        ) : null}

        <Text style={styles.footer} fixed>
          {brand}  ·  Custom framing &amp; fine art printing  ·  Quote valid 30 days
        </Text>
      </Page>
    </Document>
  );
}

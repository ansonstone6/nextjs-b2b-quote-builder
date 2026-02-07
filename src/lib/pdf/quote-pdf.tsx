import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { SerializedQuote } from "@/lib/quotes/serialize";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  brand: { fontSize: 18, marginBottom: 4, fontFamily: "Helvetica-Bold" },
  tag: { fontSize: 9, color: "#444", marginBottom: 16 },
  h1: { fontSize: 14, marginBottom: 8, fontFamily: "Helvetica-Bold" },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    paddingBottom: 4,
    marginTop: 12,
    fontFamily: "Helvetica-Bold",
  },
  tableRow: { flexDirection: "row", paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: "#ccc" },
  col1: { width: "40%" },
  col2: { width: "15%", textAlign: "right" },
  col3: { width: "15%", textAlign: "right" },
  totals: { marginTop: 20, alignSelf: "flex-end", width: "45%" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  grand: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, fontFamily: "Helvetica-Bold" },
});

type Props = { brand: string; quote: SerializedQuote };

export function QuotePdfDocument({ brand, quote }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.brand}>{brand}</Text>
        <Text style={styles.tag}>Quote {quote.quoteNumber}</Text>
        <Text style={styles.h1}>Bill to</Text>
        <Text>{quote.client.companyName}</Text>
        <Text>{quote.client.contactName}</Text>
        <Text>{quote.client.email}</Text>

        <View style={styles.tableHeader}>
          <Text style={styles.col1}>Description</Text>
          <Text style={styles.col2}>Qty</Text>
          <Text style={styles.col3}>Line</Text>
        </View>
        {quote.items.map((item) => (
          <View key={item.id} style={styles.tableRow} wrap={false}>
            <View style={styles.col1}>
              <Text>{item.product.name}</Text>
              <Text style={{ fontSize: 8, color: "#555" }}>
                {item.material.name} · {item.width}×{item.height} {item.product.dimensionUnitLabel} · area{" "}
                {item.product.areaUnitLabel}
              </Text>
            </View>
            <Text style={styles.col2}>{item.quantity}</Text>
            <Text style={styles.col3}>
              {quote.currency} {item.lineTotal}
            </Text>
          </View>
        ))}

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Subtotal</Text>
            <Text>
              {quote.currency} {quote.subtotal}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Tax</Text>
            <Text>
              {quote.currency} {quote.taxAmount}
            </Text>
          </View>
          <View style={styles.grand}>
            <Text>Total</Text>
            <Text>
              {quote.currency} {quote.grandTotal}
            </Text>
          </View>
        </View>

        {quote.notes ? (
          <View style={{ marginTop: 24 }}>
            <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 4 }}>Notes</Text>
            <Text>{quote.notes}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}

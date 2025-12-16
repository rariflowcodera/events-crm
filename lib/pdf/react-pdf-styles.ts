import { StyleSheet } from "@react-pdf/renderer"

export const pdfStyles = StyleSheet.create({
  page: {
    padding: 40,
    paddingBottom: 60,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  h1: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    marginTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 6,
  },
  h2: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 6,
    marginTop: 14,
  },
  h3: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 4,
    marginTop: 12,
  },
  h4: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 4,
    marginTop: 10,
  },
  paragraph: {
    marginBottom: 8,
    lineHeight: 1.5,
  },
  list: {
    marginBottom: 8,
    paddingLeft: 16,
  },
  listItem: {
    marginBottom: 4,
    flexDirection: "row",
  },
  listBullet: {
    width: 15,
  },
  listContent: {
    flex: 1,
    lineHeight: 1.4,
  },
  code: {
    fontFamily: "Courier",
    backgroundColor: "#f3f4f6",
    padding: 2,
    fontSize: 9,
  },
  codeBlock: {
    fontFamily: "Courier",
    backgroundColor: "#f3f4f6",
    padding: 10,
    marginBottom: 8,
    fontSize: 8,
    borderRadius: 4,
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: "#3b82f6",
    paddingLeft: 12,
    marginVertical: 8,
    color: "#666666",
    fontStyle: "italic",
  },
  link: {
    color: "#3b82f6",
    textDecoration: "none",
  },
  bold: {
    fontWeight: "bold",
  },
  italic: {
    fontStyle: "italic",
  },
  hr: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    marginVertical: 16,
  },
  pageNumber: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 9,
    color: "#9ca3af",
  },
  coverPage: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  coverTitle: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 12,
  },
  coverSubtitle: {
    fontSize: 16,
    color: "#666666",
    marginBottom: 24,
  },
  coverDate: {
    color: "#9ca3af",
    marginTop: 24,
  },
  tocTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },
  tocItem: {
    flexDirection: "row",
    marginBottom: 6,
  },
  tocItemTitle: {
    flex: 1,
  },
  tocItemPage: {
    width: 30,
    textAlign: "right",
  },
  docTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 6,
  },
  docDescription: {
    color: "#666666",
    marginBottom: 16,
  },
  table: {
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#f9fafb",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tableCell: {
    padding: 5,
    flex: 1,
    fontSize: 8,
  },
  tableHeaderCell: {
    padding: 5,
    flex: 1,
    fontSize: 8,
    fontWeight: "bold",
  },
})

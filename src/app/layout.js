import "./globals.css";

export const metadata = {
  title: "HL Sales & Receivables Management",
  description: "Sistem manajemen internal penjualan, piutang dagang, dan kalkulasi bonus bertingkat (LM & BR) untuk bisnis HL.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        {children}
      </body>
    </html>
  );
}

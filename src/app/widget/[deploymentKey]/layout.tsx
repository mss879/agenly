export default function WidgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ margin: 0, padding: 0, overflow: "hidden", height: "100vh", width: "100vw" }}>
      {children}
    </div>
  );
}

import Navbar from "../components/layout/Navbar";

export default function StubPage({ title }) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg,#071a07 0%,#0d2b0d 40%,#091a09 100%)",
      color: "#e8dfc8",
      fontFamily: "Georgia,serif",
    }}>
      <Navbar />
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        minHeight: "calc(100vh - 56px)",
        gap: 16,
      }}>
        <div style={{ fontSize: 48, opacity: 0.3 }}>🃏</div>
        <h1 style={{
          fontFamily: "'Playfair Display',serif",
          color: "#f0c040", fontSize: 32, margin: 0,
        }}>
          {title}
        </h1>
        <p style={{ color: "#3a5a3a", fontSize: 15, margin: 0 }}>
          Coming soon.
        </p>
      </div>
    </div>
  );
}

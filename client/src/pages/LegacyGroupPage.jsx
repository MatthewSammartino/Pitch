import { Link } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import LegacyDashboard from "../LegacyDashboard";

export default function LegacyGroupPage() {
  return (
    <div>
      <Navbar />
      <div style={{
        maxWidth: 920, margin: "0 auto", padding: "16px 20px 0",
        color: "#5a7a5a", fontSize: 13, fontFamily: "Georgia,serif",
      }}>
        <Link to="/group/sammartino-group" style={{ color: "#f0c040", textDecoration: "none" }}>
          ← Back to group analytics
        </Link>
      </div>
      <LegacyDashboard />
    </div>
  );
}

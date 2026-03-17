export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 20px", fontFamily: "system-ui, sans-serif", color: "#e2e8f0", background: "#0f172a", minHeight: "100vh" }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Privacy Policy</h1>
      <p style={{ color: "#94a3b8", marginBottom: 32 }}>Last updated: March 17, 2026</p>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>1. Information We Collect</h2>
        <p style={{ color: "#cbd5e1", lineHeight: 1.7 }}>
          Agenly collects information you provide when using our platform, including account details (name, email),
          agent configurations, uploaded knowledge base files, and conversation data between end-users and AI agents.
          When you connect messaging channels such as WhatsApp, we process messages sent to and from your AI agents.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>2. How We Use Your Information</h2>
        <p style={{ color: "#cbd5e1", lineHeight: 1.7 }}>
          We use collected information to provide and improve our AI agent platform services, process conversations
          through connected channels, generate AI responses using third-party AI providers, and track usage for billing purposes.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>3. Third-Party Services</h2>
        <p style={{ color: "#cbd5e1", lineHeight: 1.7 }}>
          We use third-party services including Google Gemini AI for processing conversations, Supabase for data storage,
          and Meta WhatsApp Business API for messaging channel integration. These services have their own privacy policies.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>4. Data Retention</h2>
        <p style={{ color: "#cbd5e1", lineHeight: 1.7 }}>
          We retain your data for as long as your account is active or as needed to provide services.
          You may request deletion of your data at any time by contacting us.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>5. Data Security</h2>
        <p style={{ color: "#cbd5e1", lineHeight: 1.7 }}>
          We implement appropriate security measures to protect your data, including encryption in transit
          and at rest, access controls, and secure authentication.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>6. Contact Us</h2>
        <p style={{ color: "#cbd5e1", lineHeight: 1.7 }}>
          If you have questions about this privacy policy, please contact us through our platform.
        </p>
      </section>
    </div>
  );
}

import LegalLayout from "./LegalLayout";

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="April 14, 2026">
      <section>
        <h2>1. Our Commitment</h2>
        <p>
          At Biochar Optimizer Pro, your data privacy is core to our service. This Privacy Policy
          explains what we collect, how we use it, and your rights regarding your personal and project
          data. We comply with the Mexican Federal Law on Protection of Personal Data Held by Private
          Parties (LFPDPPP) and align with EU General Data Protection Regulation (GDPR) principles.
        </p>
        <p>
          <strong>The short version:</strong> Your project data is yours. We never sell it, share it
          with third parties for marketing, or use it to train AI models.
        </p>
      </section>

      <section>
        <h2>2. Information We Collect</h2>

        <h3>2.1 Account information</h3>
        <ul>
          <li>Corporate email address</li>
          <li>Full name</li>
          <li>Password (stored hashed with bcrypt — we never see the plaintext)</li>
          <li>Subscription tier and status</li>
        </ul>

        <h3>2.2 Project data</h3>
        <ul>
          <li>Project names, descriptions, and locations (geocoded coordinates)</li>
          <li>Biomass parameters and pyrolysis configurations</li>
          <li>Custom feedstock compositions you create</li>
          <li>Simulation results, scenarios, and reports</li>
        </ul>

        <h3>2.3 Payment information</h3>
        <p>
          Processed entirely by Stripe. We store only your Stripe customer ID and subscription metadata.
          We do not see or store credit card numbers, CVV, or banking details.
        </p>

        <h3>2.4 Technical information</h3>
        <ul>
          <li>IP address (used for rate limiting and security)</li>
          <li>Browser type and version</li>
          <li>Pages visited within the platform (server logs only)</li>
          <li>Session cookies (essential, no tracking cookies)</li>
        </ul>
      </section>

      <section>
        <h2>3. How We Use Your Information</h2>
        <ul>
          <li><strong>Provide the service:</strong> Run simulations, save your projects, generate reports</li>
          <li><strong>Authenticate you:</strong> Verify session cookies and prevent unauthorized access</li>
          <li><strong>Process payments:</strong> Through Stripe</li>
          <li><strong>Communicate:</strong> Send service updates, billing notifications, and (if you opt-in) product news</li>
          <li><strong>Improve the platform:</strong> Aggregate, anonymized usage metrics. Never your individual project data.</li>
          <li><strong>Comply with law:</strong> Respond to legal requests when required</li>
        </ul>
      </section>

      <section>
        <h2>4. What We Do NOT Do</h2>
        <ul>
          <li>❌ We do not sell your data to anyone, ever</li>
          <li>❌ We do not use your project data to train AI models, including our biomass search feature</li>
          <li>❌ We do not share your data with advertisers</li>
          <li>❌ We do not use third-party analytics that track individual users (no Google Analytics, no Facebook pixel)</li>
          <li>❌ We do not read your project descriptions or simulation results except for technical support when you explicitly request it</li>
        </ul>
      </section>

      <section>
        <h2>5. Sub-processors</h2>
        <p>We use the following service providers, each bound by their own privacy and security obligations:</p>
        <ul>
          <li><strong>Stripe Inc.</strong> — Payment processing</li>
          <li><strong>OpenStreetMap / Nominatim</strong> — Geocoding (only the address you submit, no personal data)</li>
          <li><strong>OpenAI / Anthropic / Google</strong> — AI biomass search (only the search query you type, no project data)</li>
          <li><strong>Cloud hosting provider</strong> — Application hosting and database storage</li>
        </ul>
        <p>We will notify users 30 days in advance before adding any new sub-processor that handles personal data.</p>
      </section>

      <section>
        <h2>6. Data Retention</h2>
        <ul>
          <li>Account data: kept while your account is active</li>
          <li>Project data: kept while your account is active</li>
          <li>Backups: 30 days rolling</li>
          <li>After account deletion: data is permanently removed within 30 days, except where retention is legally required (e.g., tax records: up to 5 years per Mexican law)</li>
        </ul>
      </section>

      <section>
        <h2>7. Your Rights</h2>
        <p>Under LFPDPPP and GDPR principles, you have the right to:</p>
        <ul>
          <li><strong>Access</strong> your personal data</li>
          <li><strong>Rectify</strong> inaccurate or incomplete data</li>
          <li><strong>Cancel</strong> (delete) your data</li>
          <li><strong>Object</strong> to certain processing</li>
          <li><strong>Export</strong> your data in a portable format (JSON or CSV)</li>
          <li><strong>Withdraw consent</strong> at any time</li>
          <li><strong>Lodge a complaint</strong> with the Mexican data protection authority (INAI) or your local supervisory authority</li>
        </ul>
        <p>
          To exercise any of these rights, email <a href="mailto:legal@biocharpro.io">legal@biocharpro.io</a>.
          We respond within 20 business days.
        </p>
      </section>

      <section>
        <h2>8. Security</h2>
        <p>
          We implement industry-standard technical and organizational safeguards including encryption
          in transit (TLS 1.2+), encryption at rest, hashed passwords, role-based access control, and
          daily backups. See our <a href="/legal/security">Security page</a> for details.
        </p>
        <p>
          No system is 100% secure. In the event of a data breach affecting your personal data, we
          will notify you and the relevant authorities within 72 hours of becoming aware.
        </p>
      </section>

      <section>
        <h2>9. International Data Transfers</h2>
        <p>
          Our infrastructure may be hosted outside Mexico (e.g., in the United States or European Union).
          Where applicable, we rely on Standard Contractual Clauses or equivalent safeguards for
          cross-border transfers.
        </p>
      </section>

      <section>
        <h2>10. Children</h2>
        <p>
          The Service is not directed at individuals under 18 years old. We do not knowingly collect
          personal information from minors.
        </p>
      </section>

      <section>
        <h2>11. Changes to This Policy</h2>
        <p>
          We will notify users of material changes via email at least 30 days before they take effect.
        </p>
      </section>

      <section>
        <h2>12. Contact</h2>
        <p>
          Data Protection Officer: <a href="mailto:legal@biocharpro.io">legal@biocharpro.io</a>
        </p>
      </section>
    </LegalLayout>
  );
}

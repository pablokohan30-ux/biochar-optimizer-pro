import LegalLayout from "./LegalLayout";

export default function Security() {
  return (
    <LegalLayout title="Security & Data Protection" lastUpdated="April 14, 2026">
      <section>
        <h2>Why we publish this</h2>
        <p>
          Biochar projects involve sensitive technical and commercial information: feedstock contracts,
          cost structures, partnership details, and proprietary process parameters. We take protecting
          your data seriously and want to be transparent about how we do it.
        </p>
      </section>

      <section>
        <h2>1. Encryption</h2>
        <ul>
          <li><strong>In transit:</strong> All connections to the Service use TLS 1.2 or higher (HTTPS only)</li>
          <li><strong>At rest:</strong> Database and backups are encrypted using industry-standard AES-256</li>
          <li><strong>Passwords:</strong> Hashed with bcrypt (cost factor 12). We can never recover your plaintext password — only reset it</li>
          <li><strong>Session tokens:</strong> Signed with HMAC-SHA256 and stored as HTTP-only, secure cookies</li>
        </ul>
      </section>

      <section>
        <h2>2. Authentication & Access Control</h2>
        <ul>
          <li>Corporate-email-only registration. Free email providers are blocked</li>
          <li>Strong password requirement (minimum 8 characters)</li>
          <li>Session expiration (30 days, sliding window)</li>
          <li>Each user can only access their own projects — enforced at the API level (not just UI)</li>
          <li>Admin access to production data is limited to designated personnel and logged</li>
        </ul>
      </section>

      <section>
        <h2>3. Data Storage & Backups</h2>
        <ul>
          <li>Daily automated backups with 30-day retention</li>
          <li>Backups encrypted at rest and stored in a separate location from production</li>
          <li>Quarterly backup restoration tests to verify recoverability</li>
          <li>Database journal (WAL mode) protects against corruption</li>
        </ul>
      </section>

      <section>
        <h2>4. Data Ownership Guarantees</h2>
        <ul>
          <li>✅ Your project data is yours — we claim no ownership</li>
          <li>✅ We do not sell, share, or rent your data to anyone</li>
          <li>✅ We do not use your project data to train AI models</li>
          <li>✅ You can export all your data anytime in JSON format</li>
          <li>✅ You can delete your account and all associated data anytime</li>
          <li>✅ On account deletion, your data is purged within 30 days</li>
        </ul>
      </section>

      <section>
        <h2>5. Third-Party Sub-processors</h2>
        <p>We use a minimal set of third-party services, each vetted for security and privacy compliance:</p>
        <ul>
          <li><strong>Stripe</strong> (PCI-DSS Level 1) — payment processing</li>
          <li><strong>OpenStreetMap Nominatim</strong> — geocoding (only addresses, no project data)</li>
          <li><strong>OpenAI / Anthropic / Google AI</strong> — biomass search (only the search query, never project data, never personal data)</li>
          <li><strong>Cloud hosting provider</strong> — application and database hosting</li>
        </ul>
      </section>

      <section>
        <h2>6. Vulnerability Management</h2>
        <ul>
          <li>Dependencies scanned for known vulnerabilities on each deployment</li>
          <li>Automated security updates applied promptly</li>
          <li>Code reviewed before merge to production</li>
          <li>Input validation and output encoding to prevent injection attacks (SQL, XSS)</li>
          <li>Rate limiting on authentication and API endpoints</li>
        </ul>
      </section>

      <section>
        <h2>7. Incident Response</h2>
        <p>
          If we discover a security incident affecting your data, we will:
        </p>
        <ul>
          <li>Investigate and contain the incident immediately</li>
          <li>Notify affected users within 72 hours (per GDPR Article 33)</li>
          <li>Notify relevant data protection authorities (Mexico INAI, EU supervisory authorities) when required</li>
          <li>Provide a detailed post-mortem and remediation plan</li>
        </ul>
        <p>
          To report a vulnerability, please email <a href="mailto:legal@biocharpro.io">legal@biocharpro.io</a>.
          We thank security researchers for responsible disclosure.
        </p>
      </section>

      <section>
        <h2>8. Compliance Posture</h2>
        <ul>
          <li>✅ Mexican LFPDPPP compliant</li>
          <li>✅ GDPR-aligned (DPA available on request for EU customers)</li>
          <li>✅ PCI-DSS responsibilities offloaded to Stripe (we never touch card data)</li>
          <li>🟡 SOC 2 Type II — planned for late 2026</li>
          <li>🟡 ISO 27001 — under evaluation</li>
        </ul>
      </section>

      <section>
        <h2>9. Continuous Improvement</h2>
        <p>
          Security is not a checkbox. We continuously monitor, audit, and improve. Customers on the
          Engineer plan and above can request our latest internal security review on demand.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Security questions or vulnerability reports: <a href="mailto:legal@biocharpro.io">legal@biocharpro.io</a>
        </p>
      </section>
    </LegalLayout>
  );
}

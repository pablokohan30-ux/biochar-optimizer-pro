import LegalLayout from "./LegalLayout";

export default function Terms() {
  return (
    <LegalLayout title="Terms of Service" lastUpdated="April 14, 2026">
      <section>
        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing or using Biochar Optimizer Pro (the "Service"), operated by Kottate S.A.P.I. de C.V.,
          a company registered in Mexico ("we," "us," or "our"), you agree to be bound by these
          Terms of Service ("Terms"). If you do not agree, do not use the Service.
        </p>
      </section>

      <section>
        <h2>2. Description of Service</h2>
        <p>
          Biochar Optimizer Pro is a software-as-a-service platform that provides pyrolysis simulation,
          biochar property prediction, project management, life cycle assessment (LCA), and pre-assessment
          tools aligned with carbon certification standards including Puro.earth, EBC, and Isometric.
        </p>
        <p>
          The Service is intended for technical and commercial use by consultants, project developers,
          engineers, and operators in the biochar industry. It is not a substitute for professional
          engineering, legal, financial, or scientific advice.
        </p>
      </section>

      <section>
        <h2>3. User Accounts</h2>
        <ul>
          <li>You must register with a valid corporate email address. Free email providers (Gmail, Yahoo, Hotmail, etc.) are not accepted.</li>
          <li>You are responsible for safeguarding your password and all activities under your account.</li>
          <li>You must be at least 18 years old to use the Service.</li>
          <li>You agree to provide accurate and complete registration information.</li>
        </ul>
      </section>

      <section>
        <h2>4. Subscription and Billing</h2>
        <ul>
          <li>Paid plans are billed via Stripe, our payment processor. We do not store credit card details on our servers.</li>
          <li>Subscriptions are billed quarterly (3-month minimum commitment) unless otherwise specified.</li>
          <li>Promotional one-time access (such as the "Carbon Forum Pass") grants temporary access to specified features for a fixed duration.</li>
          <li>You may cancel your subscription at any time via the Stripe Customer Portal. Access continues until the end of the current billing period.</li>
          <li>Refunds are evaluated on a case-by-case basis. Promotional one-time payments are non-refundable.</li>
        </ul>
      </section>

      <section>
        <h2>5. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Service for any unlawful purpose</li>
          <li>Reverse engineer, decompile, or attempt to extract source code</li>
          <li>Resell or sublicense the Service without our written consent</li>
          <li>Upload malicious code, scrape data programmatically beyond your own account, or interfere with other users</li>
          <li>Misrepresent your identity or affiliation</li>
        </ul>
      </section>

      <section>
        <h2>6. Intellectual Property</h2>
        <p>
          <strong>Our IP:</strong> The Service, including its empirical pyrolysis model, source code,
          UI, branding, methodology implementations, and documentation, is owned by us and protected by
          intellectual property laws.
        </p>
        <p>
          <strong>Your IP — Your Data Stays Yours:</strong> All project data, biomass parameters,
          simulation results, and reports you create or upload remain your sole intellectual property.
          We claim no ownership over your content and we do not use your project data to train AI models,
          benchmark performance, or share with third parties.
        </p>
      </section>

      <section>
        <h2>7. Disclaimers</h2>
        <p>
          The Service uses an empirical pyrolysis model calibrated against peer-reviewed laboratory data.
          Predicted values are estimates intended for technical screening and feasibility assessment.
        </p>
        <p>
          <strong>The Service does not constitute:</strong> certified compliance, legal advice, financial
          advice, regulatory approval, or a substitute for third-party audit. Any carbon credit issuance
          requires independent verification by accredited bodies (e.g., Puro.earth-approved auditors).
        </p>
        <p>
          THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED.
        </p>
      </section>

      <section>
        <h2>8. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, our total liability arising from or related to the
          Service shall not exceed the amount you paid us in the 12 months preceding the claim. We are
          not liable for indirect, incidental, consequential, or punitive damages, including lost profits,
          lost revenue, or business interruption.
        </p>
      </section>

      <section>
        <h2>9. Termination</h2>
        <p>
          You may terminate your account at any time. We may suspend or terminate accounts that violate
          these Terms. Upon termination, your access ends and your data is deleted within 30 days unless
          you request earlier deletion or export.
        </p>
      </section>

      <section>
        <h2>10. Governing Law</h2>
        <p>
          These Terms are governed by the laws of the United Mexican States. Any dispute shall be
          resolved in the competent courts of Mexico City, Mexico, unless mandatory consumer protection
          laws of your jurisdiction provide otherwise.
        </p>
      </section>

      <section>
        <h2>11. Changes to These Terms</h2>
        <p>
          We may update these Terms periodically. Material changes will be notified via email or in-app
          notice at least 30 days before they take effect. Continued use after the effective date
          constitutes acceptance.
        </p>
      </section>

      <section>
        <h2>12. Contact</h2>
        <p>
          Questions about these Terms? Contact us at <a href="mailto:legal@biocharpro.io">legal@biocharpro.io</a>.
        </p>
      </section>
    </LegalLayout>
  );
}

import { Link } from "react-router-dom";

const C = {
  bg: "#020305",
  surface: "#080c14",
  text: "#e8f0f8",
  muted: "#8a8070",
  dim: "#5a5048",
  gold: "#c4a55a",
  goldLt: "#d4bc7a",
};

function useMobile() {
  if (typeof window === "undefined") return false;
  return window.innerWidth <= 768;
}

export default function Privacy() {
  const m = useMobile();
  const px = m ? 20 : 80;

  const Section = ({ num, title, children }: { num: string; title: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: 32 }}>
      <h3 style={{ color: C.gold, fontSize: m ? 16 : 18, fontWeight: 600, marginBottom: 10, letterSpacing: 0.5 }}>
        {num}. {title}
      </h3>
      <div style={{ color: C.muted, fontSize: m ? 13 : 14, lineHeight: 1.8 }}>{children}</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter',system-ui,sans-serif" }}>
      {/* Header */}
      <div style={{ padding: `${m ? 60 : 80}px ${px}px ${m ? 30 : 40}px`, textAlign: "center" }}>
        <Link to="/" style={{ color: C.gold, textDecoration: "none", fontSize: 13, letterSpacing: 3, textTransform: "uppercase" as const, fontWeight: 500 }}>← Back to Home</Link>
        <h1 style={{ fontSize: m ? 28 : 36, fontWeight: 700, marginTop: 20, color: C.text }}>Privacy Policy</h1>
        <p style={{ color: C.dim, fontSize: 13, marginTop: 10 }}>Effective Date: [Insert Date] · Last Updated: [Insert Date]</p>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 780, margin: "0 auto", padding: `0 ${px}px ${m ? 60 : 80}px` }}>
        <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.8, marginBottom: 28 }}>
          KIMUN ("KIMUN," "we," "us," or "our") respects the privacy of delegates, participants, volunteers, staff, speakers, guests, partners, and visitors to our website and conference activities. This Privacy Policy explains how KIMUN collects, uses, stores, protects, and discloses personal information in connection with conference registration, participation, communications, and related activities.
        </p>

        <Section num="1" title="Information We Collect">
          Depending on how you interact with KIMUN, we may collect: full name, date of birth or age, school, university, organization, or institution, student or participant identification information, email address, telephone/mobile number, emergency contact information, country, city, or general location, conference registration information, committee and delegation preferences, payment and registration information, dietary, accessibility, or other participation requirements voluntarily provided by you, photographs, videos, or other media captured during KIMUN activities, communications submitted to KIMUN, and website usage information where technically collected. We only seek information that is reasonably necessary for conference administration, participant safety, communication, and related legitimate purposes.
        </Section>

        <Section num="2" title="How We Use Your Information">
          KIMUN may use personal information to process and manage registrations, allocate delegates to committees and delegations, communicate conference information and updates, verify eligibility and participation, manage payments, issue certificates or identification cards, coordinate accommodation, transportation, security, or other event services, respond to inquiries and requests, provide accessibility or participation-related assistance, maintain conference security and safeguarding, organize schedules and committee operations, produce conference reports and statistics, communicate future KIMUN opportunities where permitted, promote KIMUN through approved photographs, videos, and other event media, and comply with applicable legal or regulatory requirements.
        </Section>

        <Section num="3" title="Conference Photography and Media">
          KIMUN may photograph, record, or otherwise document conference activities for legitimate event, archival, educational, promotional, and communications purposes. Such media may appear on KIMUN's website, social media platforms, promotional materials, conference publications, reports and presentations, and future conference marketing. Participants who have concerns regarding the use of a particular photograph or recording may contact KIMUN using the official contact details provided on the conference website. Where specific consent is legally required, KIMUN will seek such consent through the appropriate process.
        </Section>

        <Section num="4" title="Information Relating to Minors">
          Where a participant is under the applicable age of majority, KIMUN may require appropriate parental or guardian consent for registration, participation, photography/media use, emergency arrangements, or other activities where required. Parents or legal guardians may contact KIMUN regarding information provided in connection with a minor's participation.
        </Section>

        <Section num="5" title="Sharing of Information">
          KIMUN does not intend to sell participants' personal information. Information may be shared with authorized persons or service providers where reasonably necessary to operate the conference, including conference staff and organizing teams, venue and security personnel, registration and event-management service providers, payment processors, technology and communication providers, emergency or safeguarding personnel, and government or law-enforcement authorities where legally required. Third parties receiving information for conference-related purposes should only use it for the relevant purpose and in accordance with applicable obligations.
        </Section>

        <Section num="6" title="Data Security">
          KIMUN takes reasonable administrative, technical, and organizational measures to protect personal information against unauthorized access, misuse, loss, alteration, or disclosure. However, no electronic system or method of transmission can be guaranteed to be completely secure.
        </Section>

        <Section num="7" title="Data Retention">
          KIMUN may retain personal information for as long as reasonably necessary for conference administration, financial and administrative records, certificate verification, legal or regulatory requirements, safeguarding and incident records, institutional and historical records, and legitimate communications and future conference administration. Information that is no longer reasonably required may be deleted, anonymized, or otherwise disposed of where appropriate.
        </Section>

        <Section num="8" title="Your Rights">
          Subject to applicable law, participants may contact KIMUN to request information regarding personal data held about them, request correction of inaccurate information, raise concerns about the use of their information, request deletion where appropriate, withdraw consent where processing is based on consent and withdrawal is legally applicable, and ask questions regarding KIMUN's privacy practices. Certain information may need to be retained where required for legal, administrative, safeguarding, or legitimate operational reasons.
        </Section>

        <Section num="9" title="Third-Party Services">
          KIMUN may use third-party services for registration, communications, payments, website hosting, analytics, event management, or other conference operations. Those services may process information in accordance with their own privacy policies and applicable law.
        </Section>

        <Section num="10" title="Changes to This Policy">
          KIMUN may update this Privacy Policy from time to time. The updated version will be published through KIMUN's official communication channels and will become effective on the date stated in the revised policy.
        </Section>

        <Section num="11" title="Contact">
          Questions, requests, or concerns regarding this Privacy Policy may be directed to:<br /><br />
          <strong style={{ color: C.text }}>KIMUN Organizing Committee</strong><br />
          Email: <span style={{ color: C.gold }}>info@kimun.org</span><br />
          Website: <span style={{ color: C.gold }}>kimun.org</span>
        </Section>

        <div style={{ borderTop: `1px solid rgba(196,165,90,0.12)`, paddingTop: 24, marginTop: 20 }}>
          <p style={{ color: C.dim, fontSize: 12, lineHeight: 1.7 }}>
            By registering for or participating in KIMUN, participants acknowledge that they have had an opportunity to review this Privacy Policy and understand how their information may be processed in connection with the conference.
          </p>
        </div>
      </div>
    </div>
  );
}

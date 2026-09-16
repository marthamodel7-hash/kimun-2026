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

export default function Terms() {
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
        <h1 style={{ fontSize: m ? 28 : 36, fontWeight: 700, marginTop: 20, color: C.text }}>Terms &amp; Conditions</h1>
        <p style={{ color: C.dim, fontSize: 13, marginTop: 10 }}>Effective Date: [Insert Date] · Last Updated: [Insert Date]</p>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 780, margin: "0 auto", padding: `0 ${px}px ${m ? 60 : 80}px` }}>
        <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.8, marginBottom: 28 }}>
          These Terms &amp; Conditions ("Terms") govern registration for and participation in KIMUN ("Conference"), organized by KIMUN and its Organizing Committee ("KIMUN," "we," "us," or "our"). By registering for, attending, or participating in KIMUN, you agree to comply with these Terms and all reasonable instructions issued by the KIMUN Secretariat and Conference Organizing Committee. If you do not agree with these Terms, you should not register for or participate in the Conference.
        </p>

        <Section num="1" title="Registration">
          Registration information must be accurate, complete, and truthful. KIMUN reserves the right to reject, suspend, or cancel a registration where information provided is materially inaccurate, eligibility requirements are not satisfied, registration is incomplete, payment requirements are not met, the participant has previously engaged in serious misconduct, or participation would create a legitimate safety, security, or operational concern. Registration does not necessarily guarantee allocation to a particular committee, country, delegation, position, or role unless expressly confirmed by KIMUN.
        </Section>

        <Section num="2" title="Delegate Allocation">
          KIMUN may assign committees, portfolios, countries, roles, or positions based on conference requirements and available capacity. Requests may be considered but are not guaranteed. KIMUN may modify committee assignments or conference structures where necessary for operational, academic, security, or logistical reasons.
        </Section>

        <Section num="3" title="Fees and Payments">
          Where a registration fee applies, the applicable fee and payment deadline will be communicated through official KIMUN channels. Participants are responsible for ensuring that payments are made through authorized payment methods. KIMUN is not responsible for losses resulting from payments made to unauthorized persons, accounts, or platforms.
        </Section>

        <Section num="4" title="Refunds and Cancellations">
          Refund eligibility will depend on the cancellation and refund terms published for the relevant KIMUN conference or registration category. Where no refund is expressly guaranteed, registration fees may be non-refundable. KIMUN may consider exceptional circumstances at its discretion, subject to administrative and operational requirements. If KIMUN cancels or substantially changes the Conference, KIMUN will communicate the applicable arrangements to registered participants.
        </Section>

        <Section num="5" title="Conference Changes">
          KIMUN reserves the right to modify dates, venues, committees, schedules, speakers, sessions, activities, registration procedures, and conference formats. Such changes may be necessary because of venue availability, security concerns, public authorities, emergencies, operational requirements, or circumstances beyond KIMUN's reasonable control.
        </Section>

        <Section num="6" title="Participant Conduct">
          Participants must comply with these Terms, KIMUN policies, conference rules, committee procedures, venue rules, and instructions of authorized KIMUN officials. Participants must not engage in harassment, bullying, threats, violence, discrimination, intimidation, theft, property damage, fraud, unauthorized access to systems, disruptive conduct, possession of prohibited items, or conduct that creates a significant safety or security concern.
        </Section>

        <Section num="7" title="Academic and Committee Rules">
          Delegates are expected to follow the rules of procedure applicable to their assigned committee. The Secretariat may establish additional committee-specific rules, provided they are communicated to participants. The decision of the authorized Chair, Director, Secretariat member, or designated conference official regarding procedural matters may be treated as final within the conference proceedings, subject to any formal appeal mechanism expressly provided by KIMUN.
        </Section>

        <Section num="8" title="Awards and Recognition">
          KIMUN may provide awards, certificates, recognitions, or other distinctions. Awards are determined according to the conference's applicable evaluation procedures. KIMUN may establish, modify, or discontinue award categories where reasonably necessary. Receipt of an award or certificate does not create an entitlement to future participation, employment, leadership positions, or other opportunities.
        </Section>

        <Section num="9" title="Photography, Video, and Media">
          KIMUN may photograph and record conference activities for documentation, educational, archival, and promotional purposes, subject to applicable law and the KIMUN Privacy Policy. Participants should not intentionally obstruct official conference photography or recording where reasonably practicable. Separate consent may be required for certain uses or circumstances.
        </Section>

        <Section num="10" title="Intellectual Property">
          KIMUN's name, logo, branding, website content, graphics, publications, photographs commissioned by KIMUN, and other original materials may be protected by applicable intellectual property laws. Participants may use conference materials for personal, educational, or non-commercial purposes where permitted. Commercial reproduction, unauthorized resale, or misleading use of KIMUN branding is not permitted without written authorization. Participants retain ownership of original work they independently create, subject to any separate agreement governing its use.
        </Section>

        <Section num="11" title="Online Platforms and Accounts">
          Where KIMUN provides online portals, communication channels, registration systems, or other digital services, participants must not attempt unauthorized access, share credentials improperly, interfere with conference systems, upload malicious software, impersonate another participant or official, abuse communication systems, or use conference systems for unlawful activities. KIMUN may suspend access where necessary to protect participants, systems, or conference operations.
        </Section>

        <Section num="12" title="Safety and Security">
          Participants must follow reasonable security instructions issued by KIMUN, venue personnel, and authorized authorities. KIMUN may deny entry or remove an individual from the Conference where reasonably necessary for safety, security, or serious misconduct. Participants may be required to present identification or registration credentials.
        </Section>

        <Section num="13" title="Minors">
          Participants under the applicable age of majority may require parental or guardian consent. Parents or guardians may remain responsible for matters that legally or practically require parental responsibility outside the scope of KIMUN's conference operations. KIMUN may establish additional safeguarding requirements for minors.
        </Section>

        <Section num="14" title="Personal Belongings">
          Participants are responsible for their personal belongings. KIMUN is not responsible for loss, theft, or damage to personal property except to the extent liability cannot lawfully be excluded. Participants should avoid bringing unnecessary valuables to the Conference.
        </Section>

        <Section num="15" title="Travel and Accommodation">
          Unless expressly stated otherwise, participants are responsible for arranging and paying for their own transportation, accommodation, travel documentation, visa requirements, personal expenses, and meals not included in the conference package. KIMUN does not guarantee the availability or performance of third-party travel, accommodation, transportation, or other external service providers.
        </Section>

        <Section num="16" title="Limitation of Liability">
          To the maximum extent permitted by applicable law, KIMUN and its organizers, volunteers, staff, and representatives shall not be responsible for indirect, incidental, or consequential losses arising from participation in the Conference. Nothing in these Terms is intended to exclude or limit liability that cannot lawfully be excluded or limited. Participants remain responsible for their own actions and for complying with applicable laws and conference rules.
        </Section>

        <Section num="17" title="Force Majeure">
          KIMUN will not be responsible for failure or delay caused by circumstances beyond its reasonable control, including but not limited to natural disasters, epidemics or public-health emergencies, government restrictions, security incidents, civil unrest, transportation disruptions, venue cancellation, power or telecommunications failures, severe weather, or other extraordinary circumstances. Where reasonably possible, KIMUN will communicate changes and alternative arrangements to participants.
        </Section>

        <Section num="18" title="Disciplinary Action">
          Where a participant violates these Terms or other applicable KIMUN policies, KIMUN may take proportionate administrative action, including verbal or written warning, loss of speaking privileges, committee reassignment, loss of eligibility for an award, suspension from activities, removal from the Conference, cancellation of registration, or referral to a parent, guardian, institution, venue authority, or relevant authority where appropriate. No refund is necessarily owed following removal for serious misconduct, subject to applicable law and the published refund policy.
        </Section>

        <Section num="19" title="Complaints and Appeals">
          Participants may submit concerns regarding conference administration to the KIMUN Secretariat. Where KIMUN establishes an appeal process for a specific decision, the applicable procedure and deadline will be communicated to the affected participant.
        </Section>

        <Section num="20" title="Governing Law and Jurisdiction">
          These Terms shall be interpreted in accordance with the laws applicable in Pakistan. Subject to any mandatory legal requirements, disputes relating to these Terms or participation in KIMUN shall be addressed through the appropriate legal or dispute-resolution mechanisms applicable in Pakistan.
        </Section>

        <Section num="21" title="Changes to These Terms">
          KIMUN may update these Terms where reasonably necessary. The latest version will be published through official KIMUN communication channels. Continued participation after an updated version becomes effective constitutes acceptance of the updated Terms, to the extent permitted by applicable law.
        </Section>

        <Section num="22" title="Contact">
          For questions regarding these Terms:<br /><br />
          <strong style={{ color: C.text }}>KIMUN Organizing Committee</strong><br />
          Email: <span style={{ color: C.gold }}>info@kimun.org</span><br />
          Website: <span style={{ color: C.gold }}>kimun.org</span>
        </Section>

        <div style={{ borderTop: `1px solid rgba(196,165,90,0.12)`, paddingTop: 24, marginTop: 20 }}>
          <p style={{ color: C.dim, fontSize: 12, lineHeight: 1.7 }}>
            By registering for KIMUN, the participant confirms that the information submitted during registration is accurate and agrees to comply with these Terms &amp; Conditions, the KIMUN Equity &amp; Inclusion Policy, Privacy Policy, Code of Conduct, and applicable conference rules.
          </p>
        </div>
      </div>
    </div>
  );
}

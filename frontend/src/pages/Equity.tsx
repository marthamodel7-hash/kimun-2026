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

export default function Equity() {
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
        <h1 style={{ fontSize: m ? 28 : 36, fontWeight: 700, marginTop: 20, color: C.text }}>Equity, Inclusion &amp; Anti-Discrimination Policy</h1>
        <p style={{ color: C.dim, fontSize: 13, marginTop: 10 }}>Effective Date: [Insert Date] · Last Updated: [Insert Date]</p>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 780, margin: "0 auto", padding: `0 ${px}px ${m ? 60 : 80}px` }}>
        <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.8, marginBottom: 28 }}>
          KIMUN is committed to providing a respectful, inclusive, safe, and equitable environment in which participants can engage in academic debate, diplomacy, leadership, collaboration, and cultural exchange. This policy applies to delegates, secretariat members, organizing committee members, volunteers, staff, speakers, guests, partners, and other individuals participating in KIMUN activities.
        </p>

        <Section num="1" title="Commitment to Equity and Inclusion">
          KIMUN seeks to ensure that participants are treated fairly and with dignity. Participation and access to conference opportunities should not be unfairly restricted on the basis of characteristics protected by applicable law, including, where applicable: sex or gender, disability, age, nationality, ethnic or social background, religion or belief, language, socioeconomic background, or any other legally protected characteristic. KIMUN also recognizes that participants may have different educational, financial, physical, cultural, and accessibility needs.
        </Section>

        <Section num="2" title="Equal Opportunity">
          KIMUN aims to provide fair access to delegate registration, committee participation, leadership opportunities, academic activities, awards and recognition, training and preparation, and volunteering opportunities. Selection decisions may nevertheless be based on legitimate conference requirements, including capacity, eligibility, committee requirements, application quality, experience, or other published criteria.
        </Section>

        <Section num="3" title="Respectful Conduct">
          Participants are expected to treat others with dignity and respect, engage in constructive academic debate, respect differing opinions, avoid personal attacks, follow committee procedures, respect conference staff and volunteers, respect venue rules, and avoid discriminatory, threatening, abusive, or harassing conduct. Political, diplomatic, or policy disagreements may occur during Model United Nations proceedings. Such disagreements should remain focused on ideas, policies, positions, and debate rather than personal attacks against participants.
        </Section>

        <Section num="4" title="Harassment and Discrimination">
          KIMUN does not tolerate harassment, discrimination, intimidation, bullying, threats, or targeted abuse connected to conference participation. Examples may include verbal or written harassment, sexual harassment, threatening behavior, persistent unwanted contact, bullying, discriminatory insults, intimidation, deliberate exclusion intended to harass or discriminate, and online harassment connected to KIMUN activities.
        </Section>

        <Section num="5" title="Accessibility">
          KIMUN will make reasonable efforts to accommodate participants with accessibility requirements where practical and where sufficient notice is provided. Participants are encouraged to communicate relevant requirements during registration or as early as possible before the conference. Possible accommodations may include reasonable adjustments relating to physical access, seating, mobility, communication, dietary requirements, and other participation needs. The availability of specific accommodations may depend on venue, safety, staffing, and operational limitations.
        </Section>

        <Section num="6" title="Safeguarding">
          KIMUN takes participant safety seriously. Where concerns arise involving a participant's safety, abuse, harassment, exploitation, or other serious misconduct, KIMUN may take appropriate protective and administrative action. Where legally required or necessary to protect an individual from serious harm, information may be reported to appropriate authorities or responsible guardians.
        </Section>

        <Section num="7" title="Reporting Concerns">
          A participant who experiences or witnesses discrimination, harassment, bullying, threatening conduct, or another serious violation may report the matter to the KIMUN Secretariat / Safeguarding Team. Reports should provide sufficient information for KIMUN to understand and assess the concern. Reports may be handled as confidentially as reasonably possible. However, confidentiality cannot always be guaranteed where disclosure is necessary for safety, investigation, legal obligations, or procedural fairness.
        </Section>

        <Section num="8" title="Review of Complaints">
          KIMUN may review complaints through an appropriate member or panel of the Secretariat. Depending on the circumstances, KIMUN may request additional information, speak with relevant participants, review available evidence, implement interim safety measures, issue warnings, restrict participation, remove a participant from an activity or venue, or refer matters to parents, guardians, institutions, venue authorities, or relevant authorities where appropriate. KIMUN will seek to handle complaints fairly and without unnecessary delay.
        </Section>

        <Section num="9" title="Protection Against Retaliation">
          KIMUN does not support retaliation against a person who raises a genuine concern or participates in an appropriate complaint process. However, deliberately false, malicious, or knowingly misleading reports may themselves constitute a violation of conference rules.
        </Section>

        <Section num="10" title="Committee Debate">
          KIMUN recognizes that delegates may represent countries, organizations, or assigned positions with views different from their own. A delegate's assigned position should not automatically be treated as their personal belief. Participants are expected to distinguish diplomatic representation from personal attacks and to conduct debate within established Model United Nations procedures.
        </Section>

        <Section num="11" title="Policy Enforcement">
          KIMUN reserves the right to take reasonable action when conduct conflicts with this policy or threatens the safety, dignity, or proper functioning of the conference. Actions will depend on the nature and seriousness of the circumstances.
        </Section>

        <Section num="12" title="Contact">
          Questions regarding equity, accessibility, inclusion, or safeguarding may be directed to:<br /><br />
          <strong style={{ color: C.text }}>KIMUN Organizing Committee</strong><br />
          Email: <span style={{ color: C.gold }}>info@kimun.org</span><br />
          Website: <span style={{ color: C.gold }}>kimun.org</span>
        </Section>

        <div style={{ borderTop: `1px solid rgba(196,165,90,0.12)`, paddingTop: 24, marginTop: 20 }}>
          <p style={{ color: C.dim, fontSize: 12, lineHeight: 1.7 }}>
            KIMUN encourages participants to raise concerns early so that reasonable steps can be considered before or during the conference.
          </p>
        </div>
      </div>
    </div>
  );
}

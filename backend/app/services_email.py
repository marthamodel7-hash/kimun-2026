"""Email service — sends registration + payment confirmation emails via SMTP.
Falls back to console logging when SMTP_HOST is not configured."""
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core_config import settings

log = logging.getLogger("kimun.email")


def _send(to_email: str, subject: str, html_body: str, text_body: str = ""):
    """Send an email via SMTP or log to console if not configured."""
    if not settings.SMTP_HOST:
        log.info("EMAIL (no SMTP) → %s | Subject: %s\n%s", to_email, subject, text_body or html_body[:500])
        print(f"\n{'='*60}\nEMAIL TO: {to_email}\nSUBJECT: {subject}\n{text_body or html_body[:500]}\n{'='*60}\n")
        return True
    msg = MIMEMultipart("alternative")
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to_email
    msg["Subject"] = subject
    if text_body:
        msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))
    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            if settings.SMTP_USER:
                server.login(settings.SMTP_USER, settings.SMTP_PASS)
            server.sendmail(settings.SMTP_FROM, [to_email], msg.as_string())
        log.info("EMAIL sent → %s | %s", to_email, subject)
        return True
    except Exception as e:
        log.warning("EMAIL failed → %s: %s", to_email, e)
        print(f"\nEMAIL FAILED → {to_email}: {e}\n{subject}\n{text_body or html_body[:500]}\n")
        return False


def send_registration_email(delegate, fee: int):
    """Send post-registration email with payment details and reference number."""
    ref = delegate.checkin_code or delegate.registration_token or f"K26-{delegate.id:04d}"
    subject = f"KIMUN 2026 — Registration Received (Ref: {ref})"
    text = f"""Dear {delegate.name},

Thank you for registering for KIMUN 2026!

Your Reference Number: {ref}
(Use this to log into your delegate portal)

Registration Type: {delegate.registration_type.title()}
Fee Amount: Rs. {fee:,}

Payment Details:
-------------------
Bank:           Habib Bank Limited (HBL)
Account Title:  KIMUN 2026 Secretariat
Account Number: 1234-5678-9012-3456
IBAN:           PK12HABB1234567890123456

JazzCash:       03XX-XXXXXXX
Easypaisa:      03XX-XXXXXXX
-------------------

After transferring, please upload your payment screenshot at:
{settings.CONFERENCE_NAME} Delegate Portal

Once payment is confirmed, your portal will unlock with:
- Study guides & background documents
- Committee & country allotment
- Personal notes

Best regards,
{settings.CONFERENCE_NAME} Secretariat"""

    html = f"""<div style="font-family:Inter,system-ui,sans-serif;max-width:540px;margin:0 auto;padding:24px;background:#0b0e14;color:#eef1f6;border-radius:12px;">
<h2 style="color:#d3ab6b;">KIMUN 2026 — Registration Received</h2>
<p>Dear <strong>{delegate.name}</strong>,</p>
<p>Thank you for registering for <strong>{settings.CONFERENCE_NAME}</strong>!</p>
<div style="background:rgba(255,255,255,0.05);padding:14px;border-radius:8px;margin:14px 0;">
<p><strong>Reference Number:</strong> <code style="color:#d3ab6b;font-size:16px;">{ref}</code></p>
<p><strong>Fee:</strong> Rs. {fee:,}</p>
<p><strong>Type:</strong> {delegate.registration_type.title()}</p>
</div>
<h3 style="color:#d3ab6b;">Payment Details</h3>
<table style="width:100%;font-size:14px;border-collapse:collapse;">
<tr><td style="padding:6px 0;color:#9aa3b2;">Bank</td><td>Habib Bank Limited (HBL)</td></tr>
<tr><td style="padding:6px 0;color:#9aa3b2;">Account Title</td><td>KIMUN 2026 Secretariat</td></tr>
<tr><td style="padding:6px 0;color:#9aa3b2;">Account Number</td><td>1234-5678-9012-3456</td></tr>
<tr><td style="padding:6px 0;color:#9aa3b2;">JazzCash</td><td>03XX-XXXXXXX</td></tr>
<tr><td style="padding:6px 0;color:#9aa3b2;">Easypaisa</td><td>03XX-XXXXXXX</td></tr>
</table>
<p style="margin-top:18px;color:#9aa3b2;">After transferring, upload your payment screenshot on the portal.</p>
<p style="color:#9aa3b2;font-size:12px;">— {settings.CONFERENCE_NAME} Secretariat</p>
</div>"""
    _send(delegate.email, subject, html, text)


def send_payment_confirmation(delegate):
    """Send payment confirmation email."""
    ref = delegate.checkin_code or delegate.registration_token or f"K26-{delegate.id:04d}"
    subject = f"KIMUN 2026 — Payment Confirmed! Portal Unlocked"
    text = f"""Dear {delegate.name},

Your payment has been confirmed!

Reference: {ref}
Status: PAID

Your delegate portal is now unlocked. Log in with your reference number to access:
- Study guides & background documents
- Committee & country allotment
- Personal notes

See you at {settings.CONFERENCE_NAME}!

Best regards,
{settings.CONFERENCE_NAME} Secretariat"""

    html = f"""<div style="font-family:Inter,system-ui,sans-serif;max-width:540px;margin:0 auto;padding:24px;background:#0b0e14;color:#eef1f6;border-radius:12px;">
<h2 style="color:#4ade80;">Payment Confirmed!</h2>
<p>Dear <strong>{delegate.name}</strong>,</p>
<p>Your payment for <strong>{settings.CONFERENCE_NAME}</strong> has been confirmed.</p>
<div style="background:rgba(74,222,128,0.1);padding:14px;border-radius:8px;margin:14px 0;border:1px solid rgba(74,222,128,0.3);">
<p><strong>Status:</strong> <span style="color:#4ade80;">PAID</span></p>
<p><strong>Reference:</strong> <code style="color:#d3ab6b;">{ref}</code></p>
</div>
<p>Your delegate portal is now unlocked. Log in with your reference number.</p>
<p style="color:#9aa3b2;font-size:12px;">— {settings.CONFERENCE_NAME} Secretariat</p>
</div>"""
    _send(delegate.email, subject, html, text)


def send_interview_email(application, interview_date):
    """Send interview confirmation email to applicant."""
    date_str = interview_date.strftime("%B %d, %Y at %I:%M %p") if interview_date else "TBD"
    subject = f"KIMUN 2026 — Interview Scheduled"
    text = f"""Dear {application.name},

Your interview for {settings.CONFERENCE_NAME} has been scheduled!

Date: {date_str}
Department: {application.department_preference}

Please arrive 10 minutes early. Bring a valid ID.

Best regards,
{settings.CONFERENCE_NAME} Secretariat"""

    html = f"""<div style="font-family:Inter,system-ui,sans-serif;max-width:540px;margin:0 auto;padding:24px;background:#0b0e14;color:#eef1f6;border-radius:12px;">
<h2 style="color:#d3ab6b;">Interview Scheduled</h2>
<p>Dear <strong>{application.name}</strong>,</p>
<p>Your interview for <strong>{settings.CONFERENCE_NAME}</strong> has been scheduled!</p>
<div style="background:rgba(255,255,255,0.05);padding:14px;border-radius:8px;margin:14px 0;">
<p><strong>Date:</strong> {date_str}</p>
<p><strong>Department:</strong> {application.department_preference}</p>
</div>
<p>Please arrive 10 minutes early. Bring a valid ID.</p>
<p style="color:#9aa3b2;font-size:12px;">— {settings.CONFERENCE_NAME} Secretariat</p>
</div>"""
    _send(application.email, subject, html, text)


def send_selection_email(application, reference_number, department_name):
    """Send selection email with reference number for portal login."""
    subject = f"KIMUN 2026 — Congratulations! You've Been Selected"
    text = f"""Dear {application.name},

Congratulations! You have been selected for {settings.CONFERENCE_NAME}!

Department: {department_name}
Reference Number: {reference_number}

Use this reference number to log into your Department Portal at:
{settings.CONFERENCE_NAME} Portal

Your portal contains:
- Department tasks and assignments
- Meeting schedules
- Guides and resources

Welcome to the team!

Best regards,
{settings.CONFERENCE_NAME} Secretariat"""

    html = f"""<div style="font-family:Inter,system-ui,sans-serif;max-width:540px;margin:0 auto;padding:24px;background:#0b0e14;color:#eef1f6;border-radius:12px;">
<h2 style="color:#4ade80;">Congratulations! You've Been Selected</h2>
<p>Dear <strong>{application.name}</strong>,</p>
<p>You have been selected for <strong>{settings.CONFERENCE_NAME}</strong>!</p>
<div style="background:rgba(74,222,128,0.1);padding:14px;border-radius:8px;margin:14px 0;border:1px solid rgba(74,222,128,0.3);">
<p><strong>Department:</strong> {department_name}</p>
<p><strong>Reference Number:</strong> <code style="color:#d3ab6b;font-size:16px;">{reference_number}</code></p>
</div>
<p>Use this reference number to log into your Department Portal.</p>
<p style="color:#9aa3b2;font-size:12px;">— {settings.CONFERENCE_NAME} Secretariat</p>
</div>"""
    _send(application.email, subject, html, text)


def send_rejection_email(application):
    """Send rejection email."""
    subject = f"KIMUN 2026 — Application Update"
    text = f"""Dear {application.name},

Thank you for applying to {settings.CONFERENCE_NAME}.

After careful review, we regret to inform you that we are unable to offer you a position at this time.

We encourage you to apply again in the future.

Best regards,
{settings.CONFERENCE_NAME} Secretariat"""

    html = f"""<div style="font-family:Inter,system-ui,sans-serif;max-width:540px;margin:0 auto;padding:24px;background:#0b0e14;color:#eef1f6;border-radius:12px;">
<h2 style="color:#9aa3b2;">Application Update</h2>
<p>Dear <strong>{application.name}</strong>,</p>
<p>Thank you for applying to <strong>{settings.CONFERENCE_NAME}</strong>.</p>
<p>After careful review, we regret to inform you that we are unable to offer you a position at this time.</p>
<p>We encourage you to apply again in the future.</p>
<p style="color:#9aa3b2;font-size:12px;">— {settings.CONFERENCE_NAME} Secretariat</p>
</div>"""
    _send(application.email, subject, html, text)


def send_application_confirmation(application):
    """Send confirmation email after volunteer application submission."""
    subject = f"KIMUN 2026 — Application Received"
    text = f"""Dear {application.name},

Thank you for applying to {settings.CONFERENCE_NAME}!

We have received your application for the {application.department_preference} department.

Our Secretariat team will review your application and schedule an interview. You will be notified once a decision has been made.

What happens next:
1. Application review by the Secretariat
2. Interview scheduling (you'll receive an email with the date/time)
3. Final decision and department assignment

If you have any questions, please contact us.

Best regards,
{settings.CONFERENCE_NAME} Secretariat"""

    html = f"""<div style="font-family:Inter,system-ui,sans-serif;max-width:540px;margin:0 auto;padding:24px;background:#0b0e14;color:#eef1f6;border-radius:12px;">
<h2 style="color:#d3ab6b;">Application Received</h2>
<p>Dear <strong>{application.name}</strong>,</p>
<p>Thank you for applying to <strong>{settings.CONFERENCE_NAME}</strong>!</p>
<div style="background:rgba(255,255,255,0.05);padding:14px;border-radius:8px;margin:14px 0;">
<p><strong>Department:</strong> {application.department_preference}</p>
<p><strong>Status:</strong> <span style="color:#d3ab6b;">Under Review</span></p>
</div>
<h3 style="color:#d3ab6b;">What happens next?</h3>
<ol style="padding-left:20px;line-height:2;">
<li>Application review by the Secretariat</li>
<li>Interview scheduling (you'll receive an email with the date/time)</li>
<li>Final decision and department assignment</li>
</ol>
<p>If you have any questions, please contact us.</p>
<p style="color:#9aa3b2;font-size:12px;">— {settings.CONFERENCE_NAME} Secretariat</p>
</div>"""
    _send(application.email, subject, html, text)

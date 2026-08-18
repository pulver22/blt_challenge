import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from backend.config import Settings

logger = logging.getLogger(__name__)


def send_admin_submission_notification(settings: Settings, submission: dict, result: dict) -> bool:
    """Dispatches email notification to rpolvara@lincoln.ac.uk when a new submission is evaluated & published."""
    team = submission.get("team", "Unknown")
    method = submission.get("method", "Unknown")
    category = submission.get("category", "Unknown")
    contact_email = submission.get("contact_email", "Unknown")
    sub_id = submission.get("id", "")
    token = submission.get("token", "")

    ate_rmse = result.get("ate_rmse", "N/A")
    rpe_rmse = result.get("rpe_rmse", "N/A")

    subject = f"[BLT Benchmark] New Submission Published: {team} ({method})"
    status_url = (
        f"{settings.public_base_url}/submissions/{sub_id}?token={token}"
        if settings.public_base_url
        else f"/submissions/{sub_id}?token={token}"
    )

    body_text = f"""
A new SLAM odometry submission has been evaluated and published to the BLT Challenge Leaderboard!

Team: {team}
Method: {method}
Category: {category.upper()}
Contact Email: {contact_email}

Results:
- ATE RMSE: {ate_rmse} m
- RPE RMSE: {rpe_rmse} m

View Private Submission Details:
{status_url}
"""

    if not settings.smtp_host:
        logger.info("[Email Service MOCK] Notification to %s:\n%s", settings.admin_email, body_text)
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.smtp_from
        msg["To"] = settings.admin_email

        msg.attach(MIMEText(body_text, "plain"))

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
            server.starttls()
            if settings.smtp_user and settings.smtp_password:
                server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(settings.smtp_from, [settings.admin_email], msg.as_string())

        logger.info("Successfully sent submission notification email to %s", settings.admin_email)
        return True
    except Exception as exc:
        logger.error("Failed to send email notification to %s: %s", settings.admin_email, exc)
        return False

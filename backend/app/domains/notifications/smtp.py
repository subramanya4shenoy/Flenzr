"""SMTP transport and a queue-independent provider check. Never prints credentials."""
import argparse
import smtplib
import ssl
import sys
from email.message import EmailMessage
from email.utils import formatdate, make_msgid, parseaddr
from urllib.parse import urlsplit

from email_validator import EmailNotValidError, validate_email
from app.core.config import settings


class SMTPConfigurationError(ValueError):
    """Safe diagnostic containing no configured values."""


def validate_smtp():
    if not settings.NOTIFICATION_SMTP_HOST.strip():
        raise SMTPConfigurationError('Set NOTIFICATION_SMTP_HOST.')
    if not 1 <= settings.NOTIFICATION_SMTP_PORT <= 65535:
        raise SMTPConfigurationError('SMTP port must be between 1 and 65535.')
    if settings.NOTIFICATION_SMTP_SSL and settings.NOTIFICATION_SMTP_STARTTLS:
        raise SMTPConfigurationError('Use SSL or STARTTLS, not both.')
    if not settings.NOTIFICATION_SMTP_SSL and not settings.NOTIFICATION_SMTP_STARTTLS:
        raise SMTPConfigurationError('Enable STARTTLS (usually port 587) or SSL (usually port 465).')
    if bool(settings.NOTIFICATION_SMTP_USERNAME) != bool(settings.NOTIFICATION_SMTP_PASSWORD):
        raise SMTPConfigurationError('Set both SMTP username and password, or neither for a trusted relay.')
    sender = settings.NOTIFICATION_EMAIL_FROM
    if '\r' in sender or '\n' in sender:
        raise SMTPConfigurationError('Invalid sender address.')
    address = parseaddr(sender)[1]
    try:
        validate_email(address, check_deliverability=False)
    except EmailNotValidError:
        raise SMTPConfigurationError('Set NOTIFICATION_EMAIL_FROM to a real, provider-verified sender.') from None
    origin = urlsplit(settings.NOTIFICATION_APP_ORIGIN)
    if (origin.scheme not in ('http', 'https') or not origin.hostname or origin.username
            or origin.password or origin.query or origin.fragment or origin.path not in ('', '/')):
        raise SMTPConfigurationError('NOTIFICATION_APP_ORIGIN must be an application origin without a path.')
    if origin.scheme != 'https' and origin.hostname not in ('localhost', '127.0.0.1', '::1'):
        raise SMTPConfigurationError('Use HTTPS for the public application origin.')


def send_smtp(mail):
    validate_smtp()
    context = ssl.create_default_context()
    kwargs = {'timeout': 20}
    connection = smtplib.SMTP
    if settings.NOTIFICATION_SMTP_SSL:
        connection = smtplib.SMTP_SSL
        kwargs['context'] = context
    with connection(settings.NOTIFICATION_SMTP_HOST, settings.NOTIFICATION_SMTP_PORT, **kwargs) as smtp:
        if settings.NOTIFICATION_SMTP_STARTTLS:
            smtp.starttls(context=context)
        if settings.NOTIFICATION_SMTP_USERNAME:
            smtp.login(settings.NOTIFICATION_SMTP_USERNAME, settings.NOTIFICATION_SMTP_PASSWORD)
        smtp.send_message(mail)


def main(argv=None):
    parser = argparse.ArgumentParser(description='Check SMTP configuration without processing the notification queue.')
    parser.add_argument('--send-test', action='store_true', help='Send one test email to --to.')
    parser.add_argument('--to', help='Your chosen test inbox; required with --send-test.')
    args = parser.parse_args(argv)
    if bool(args.to) != args.send_test:
        parser.error('Use --send-test and --to together.')
    try:
        validate_smtp()
        if args.send_test:
            recipient = validate_email(args.to, check_deliverability=False).normalized
            mail = EmailMessage()
            mail['From'] = settings.NOTIFICATION_EMAIL_FROM
            mail['To'] = recipient
            mail['Subject'] = 'Flenzr email delivery test'
            mail['Date'] = formatdate(localtime=False)
            mail['Message-ID'] = make_msgid(domain=parseaddr(settings.NOTIFICATION_EMAIL_FROM)[1].split('@')[1])
            mail.set_content('This is the Flenzr email delivery test you requested.\n\n'
                             'Open Flenzr:\n' + settings.NOTIFICATION_APP_ORIGIN.rstrip('/') +
                             '\n\nNo queued notifications were processed.\n')
            send_smtp(mail)
            print('SMTP accepted the test email. Check the inbox and spam folder; acceptance is not proof of inbox delivery.')
        else:
            print('SMTP configuration is valid. No connection or email sent; sender verification must be checked with the provider.')
        return 0
    except SMTPConfigurationError as exc:
        print(str(exc), file=sys.stderr)
    except EmailNotValidError:
        print('Invalid test inbox address.', file=sys.stderr)
    except Exception as exc:
        print('SMTP test failed: ' + type(exc).__name__ + '. Check provider settings; provider responses are not logged.', file=sys.stderr)
    return 1


if __name__ == '__main__':
    sys.exit(main())

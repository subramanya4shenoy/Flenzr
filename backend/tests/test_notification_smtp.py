from email.message import EmailMessage
from unittest.mock import MagicMock
import pytest
from app.core.config import settings
from app.domains.notifications import smtp

@pytest.fixture(autouse=True)
def configured(monkeypatch):
    for key, value in {
        'NOTIFICATION_SMTP_HOST': 'smtp.example.com', 'NOTIFICATION_SMTP_PORT': 587,
        'NOTIFICATION_SMTP_USERNAME': 'test-user', 'NOTIFICATION_SMTP_PASSWORD': 'test-password',
        'NOTIFICATION_SMTP_STARTTLS': True, 'NOTIFICATION_SMTP_SSL': False,
        'NOTIFICATION_EMAIL_FROM': 'Flenzr <notifications@flenzr.com>',
        'NOTIFICATION_APP_ORIGIN': 'https://app.flenzr.com',
    }.items(): monkeypatch.setattr(settings, key, value)

@pytest.mark.parametrize('overrides', [
    {'NOTIFICATION_SMTP_HOST': ''}, {'NOTIFICATION_SMTP_PORT': 0},
    {'NOTIFICATION_SMTP_SSL': True}, {'NOTIFICATION_SMTP_STARTTLS': False},
    {'NOTIFICATION_SMTP_PASSWORD': ''},
    {'NOTIFICATION_EMAIL_FROM': 'Flenzr <notifications@flenzr.test>'},
    {'NOTIFICATION_EMAIL_FROM': 'bad\r\nBcc: somebody@example.com'},
    {'NOTIFICATION_APP_ORIGIN': 'https://app.flenzr.com/login'},
    {'NOTIFICATION_APP_ORIGIN': 'http://app.flenzr.com'},
    {'NOTIFICATION_APP_ORIGIN': 'https://user:password@app.flenzr.com'},
])
def test_invalid_setup_never_contacts_provider(monkeypatch, overrides):
    for key, value in overrides.items(): monkeypatch.setattr(settings, key, value)
    connection = MagicMock()
    monkeypatch.setattr(smtp.smtplib, 'SMTP', connection)
    with pytest.raises(ValueError): smtp.send_smtp(EmailMessage())
    connection.assert_not_called()

@pytest.mark.parametrize('implicit_tls', [False, True])
def test_verified_tls_delivery_and_auth(monkeypatch, implicit_tls):
    monkeypatch.setattr(settings, 'NOTIFICATION_SMTP_SSL', implicit_tls)
    monkeypatch.setattr(settings, 'NOTIFICATION_SMTP_STARTTLS', not implicit_tls)
    monkeypatch.setattr(settings, 'NOTIFICATION_SMTP_PORT', 465 if implicit_tls else 587)
    connection = MagicMock()
    monkeypatch.setattr(smtp.smtplib, 'SMTP_SSL' if implicit_tls else 'SMTP', connection)
    mail = EmailMessage()
    smtp.send_smtp(mail)
    client = connection.return_value.__enter__.return_value
    assert client.starttls.call_count == (0 if implicit_tls else 1)
    client.login.assert_called_once_with('test-user', 'test-password')
    client.send_message.assert_called_once_with(mail)
    context = connection.call_args.kwargs['context'] if implicit_tls else client.starttls.call_args.kwargs['context']
    assert context.verify_mode == smtp.ssl.CERT_REQUIRED

def test_offline_check_and_explicit_test_send(monkeypatch):
    send = MagicMock()
    monkeypatch.setattr(smtp, 'send_smtp', send)
    assert smtp.main([]) == 0
    send.assert_not_called()
    assert smtp.main(['--send-test', '--to', 'owner@flenzr.com']) == 0
    mail = send.call_args.args[0]
    assert mail['To'] == 'owner@flenzr.com'
    assert 'https://app.flenzr.com' in mail.get_content()
    assert 'No queued notifications' in mail.get_content()

def test_provider_response_stays_private(monkeypatch, capsys):
    def fail(mail): raise smtp.smtplib.SMTPAuthenticationError(535, b'secret-provider-detail')
    monkeypatch.setattr(smtp, 'send_smtp', fail)
    assert smtp.main(['--send-test', '--to', 'owner@flenzr.com']) == 1
    output = capsys.readouterr().err
    assert 'SMTPAuthenticationError' in output
    assert 'secret-provider-detail' not in output

@pytest.mark.asyncio
async def test_invalid_setup_does_not_claim_queue(monkeypatch):
    from app.domains.notifications import worker
    monkeypatch.setattr(settings, 'NOTIFICATION_EMAIL_TRANSPORT', 'smtp')
    monkeypatch.setattr(settings, 'NOTIFICATION_SMTP_HOST', '')
    claim = MagicMock()
    monkeypatch.setattr(worker, 'process_one', claim)
    with pytest.raises(ValueError, match='NOTIFICATION_SMTP_HOST'): await worker.run(once=True)
    claim.assert_not_called()

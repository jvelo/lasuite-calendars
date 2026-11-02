"""Tests for the Messages role in the mailbox ACL sync payload.

SabreDAV stores the role on each sync-managed instance. A mailbox admin
can then delete a mailbox calendar for every user.
"""

from unittest import mock

from django.test import override_settings

import pytest

from core import factories
from core.services.setup_service import SetupService

pytestmark = pytest.mark.django_db

MAILBOX = "team@example.com"


@pytest.fixture(name="messages")
def fixture_messages():
    """Mock the Messages client of the setup service."""
    with mock.patch("core.services.setup_service.MessagesService") as messages_cls:
        yield messages_cls.return_value


@pytest.fixture(name="caldav")
def fixture_caldav():
    """Mock the CalDAV client of the setup service."""
    with mock.patch("core.services.setup_service.CalDAVHTTPClient") as http_cls:
        http = http_cls.return_value
        http.internal_request.return_value = mock.Mock(
            status_code=200, json=lambda: {"active": []}
        )
        yield http


def _sync_payload(caldav):
    """Return the JSON body of the only call to the internal sync route."""
    caldav.internal_request.assert_called_once()
    args, kwargs = caldav.internal_request.call_args
    assert args[2] == "internal-api/sync-mailbox-acls/"
    return kwargs["json"]


@override_settings(FEATURE_MESSAGES_INTEGRATION=True)
@pytest.mark.parametrize(
    ("role", "privilege"),
    [
        ("admin", "read-write"),
        ("sender", "read-write"),
        ("editor", "read"),
        ("viewer", "read"),
    ],
)
def test_sync_user_mailboxes_sends_the_role(messages, caldav, role, privilege):
    """Each share carries the Messages role and the CalDAV privilege."""
    user = factories.UserFactory()
    messages.get_user_mailboxes.return_value = [{"email": MAILBOX, "role": role}]

    SetupService().sync_user_mailboxes(user)

    assert _sync_payload(caldav)["shares"] == [
        {
            "user_email": user.email,
            "mailbox_email": MAILBOX,
            "privilege": privilege,
            "role": role,
        }
    ]


@override_settings(FEATURE_MESSAGES_INTEGRATION=True)
def test_sync_user_mailboxes_drops_an_unknown_role(messages, caldav):
    """An unknown role is not sent, so SabreDAV does not refuse the sync."""
    user = factories.UserFactory()
    messages.get_user_mailboxes.return_value = [{"email": MAILBOX, "role": "owner"}]

    SetupService().sync_user_mailboxes(user)

    share = _sync_payload(caldav)["shares"][0]
    assert share["role"] is None
    assert share["privilege"] == "read"


def test_sync_mailbox_sends_the_role_of_each_user(caldav):
    """The mailbox-side sync sends the role of every mailbox user."""
    caller = factories.UserFactory()

    SetupService().sync_mailbox(
        caller,
        MAILBOX,
        users=[
            {"email": "admin@example.com", "role": "admin"},
            {"email": "viewer@example.com", "role": "viewer"},
        ],
    )

    assert _sync_payload(caldav)["shares"] == [
        {
            "user_email": "admin@example.com",
            "mailbox_email": MAILBOX,
            "privilege": "read-write",
            "role": "admin",
        },
        {
            "user_email": "viewer@example.com",
            "mailbox_email": MAILBOX,
            "privilege": "read",
            "role": "viewer",
        },
    ]

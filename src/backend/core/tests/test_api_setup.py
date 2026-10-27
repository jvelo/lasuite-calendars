"""Tests for the calendar setup API errors."""

from unittest import mock

from django.test import override_settings

import pytest
import requests
from rest_framework.test import APIClient

from core import factories
from core.services.setup_service import (
    CALENDAR_CREATION_FAILED,
    MAILBOX_ACCESS_DENIED,
    MAILBOX_ROLE_REQUIRED,
)

pytestmark = pytest.mark.django_db

SETUP_URL = "/api/v1.0/setup/"


def _client_for(user):
    client = APIClient()
    client.force_login(user)
    return client


def test_api_setup_name_required():
    """A request without a name gets the name_required code."""
    user = factories.UserFactory()

    response = _client_for(user).post(SETUP_URL, {"name": " "}, format="json")

    assert response.status_code == 400
    assert response.json() == {"code": "name_required", "error": "name is required"}


@override_settings(FEATURE_MESSAGES_INTEGRATION=True)
@mock.patch("core.services.setup_service.MessagesService")
def test_api_setup_mailbox_viewer_role_returns_code(mock_messages):
    """A mailbox viewer gets the mailbox role error code."""
    user = factories.UserFactory()
    mock_messages.return_value.get_user_mailboxes.return_value = [
        {"email": "team@example.com", "role": "viewer"}
    ]

    response = _client_for(user).post(
        SETUP_URL,
        {"name": "Team", "mailbox_email": "team@example.com"},
        format="json",
    )

    assert response.status_code == 400
    assert response.json() == {
        "code": MAILBOX_ROLE_REQUIRED,
        "error": "Calendar setup failed.",
    }


@override_settings(FEATURE_MESSAGES_INTEGRATION=True)
@mock.patch("core.services.setup_service.MessagesService")
def test_api_setup_unknown_mailbox_does_not_echo_details(mock_messages):
    """An unknown mailbox gets a code, without the user or mailbox email."""
    user = factories.UserFactory()
    mock_messages.return_value.get_user_mailboxes.return_value = []

    response = _client_for(user).post(
        SETUP_URL,
        {"name": "Team", "mailbox_email": "team@example.com"},
        format="json",
    )

    assert response.status_code == 400
    assert response.json() == {
        "code": MAILBOX_ACCESS_DENIED,
        "error": "Calendar setup failed.",
    }


@mock.patch("core.services.setup_service.CalDAVHTTPClient")
def test_api_setup_caldav_failure_hides_internal_details(mock_http):
    """A CalDAV failure does not show the internal host to the client."""
    user = factories.UserFactory()
    mock_http.return_value.internal_request.side_effect = requests.ConnectionError(
        "HTTPConnectionPool(host='caldav', port=80): Max retries exceeded "
        "with url: /internal-api/calendars/"
    )

    response = _client_for(user).post(SETUP_URL, {"name": "Mine"}, format="json")

    assert response.status_code == 400
    assert response.json() == {
        "code": CALENDAR_CREATION_FAILED,
        "error": "Calendar setup failed.",
    }

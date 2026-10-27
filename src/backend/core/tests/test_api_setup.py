"""Tests for the calendar setup API errors."""

from unittest import mock

from django.test import override_settings

import pytest
from rest_framework.test import APIClient

from core import factories
from core.services.setup_service import MAILBOX_ROLE_REQUIRED

pytestmark = pytest.mark.django_db

SETUP_URL = "/api/v1.0/setup/"


def _client_for(user):
    client = APIClient()
    client.force_login(user)
    return client


def test_api_setup_name_required():
    """A request without a name gets an error without a code."""
    user = factories.UserFactory()

    response = _client_for(user).post(SETUP_URL, {"name": " "}, format="json")

    assert response.status_code == 400
    assert response.json() == {"error": "name is required"}


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
    data = response.json()
    assert data["code"] == MAILBOX_ROLE_REQUIRED
    assert "current role: viewer" in data["error"]


@override_settings(FEATURE_MESSAGES_INTEGRATION=True)
@mock.patch("core.services.setup_service.MessagesService")
def test_api_setup_unknown_mailbox_has_no_code(mock_messages):
    """Other setup errors keep the text and have no code."""
    user = factories.UserFactory()
    mock_messages.return_value.get_user_mailboxes.return_value = []

    response = _client_for(user).post(
        SETUP_URL,
        {"name": "Team", "mailbox_email": "team@example.com"},
        format="json",
    )

    assert response.status_code == 400
    data = response.json()
    assert "code" not in data
    assert "does not have access to mailbox" in data["error"]

"""RSVP link tests against the real CalDAV server.

An RSVP must never create or restore an event that the organizer
cancelled, deleted, or removed the attendee from.
"""

# pylint: disable=missing-function-docstring,protected-access

from datetime import timedelta
from uuid import uuid4

from django.core.signing import TimestampSigner
from django.test import RequestFactory
from django.utils import timezone

import icalendar
import pytest

from caldav.lib.error import NotFoundError
from core import factories
from core.api.viewsets_rsvp import RSVPConfirmView
from core.services.caldav_service import CalDAVHTTPClient, CalendarService

ATTENDEE = "rsvp-attendee@external-domain.com"


def _fmt(value):
    return value.strftime("%Y%m%dT%H%M%SZ")


def _vevent(uid, organizer, start, extra=(), attendee=True):
    lines = [
        "BEGIN:VEVENT",
        f"UID:{uid}",
        f"DTSTART:{_fmt(start)}",
        f"DTEND:{_fmt(start + timedelta(hours=1))}",
        "SUMMARY:RSVP guard",
        f"ORGANIZER:mailto:{organizer}",
        *extra,
    ]
    if attendee:
        lines.append(f"ATTENDEE;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:{ATTENDEE}")
    lines.append("END:VEVENT")
    return lines


def _calendar(*vevents):
    lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Test//EN"]
    for vevent in vevents:
        lines.extend(vevent)
    lines.append("END:VCALENDAR")
    return "\r\n".join(lines)


def _instances(ics):
    """Map each VEVENT recurrence-id (None for the master) to its
    status and the attendee PARTSTAT (None when the attendee is absent).
    """
    result = {}
    for vevent in icalendar.Calendar.from_ical(ics).walk("VEVENT"):
        recurrence_id = vevent.get("RECURRENCE-ID")
        attendees = vevent.get("ATTENDEE", [])
        if not isinstance(attendees, list):
            attendees = [attendees]
        partstat = next(
            (
                a.params.get("PARTSTAT")
                for a in attendees
                if str(a).lower() == f"mailto:{ATTENDEE}"
            ),
            None,
        )
        key = recurrence_id.dt if recurrence_id else None
        result[key] = (str(vevent.get("STATUS", "")), partstat)
    return result


@pytest.mark.django_db
@pytest.mark.xdist_group("caldav")
class TestRSVPDoesNotRestoreEvents:
    """RSVP links leave cancelled or removed events untouched."""

    @pytest.fixture(autouse=True)
    def _setup(self):  # pylint: disable=attribute-defined-outside-init
        self.organizer = factories.UserFactory(
            email=f"rsvp-organizer-{uuid4().hex[:8]}@example.com"
        )
        service = CalendarService()
        self.caldav_path = service.create_calendar(
            self.organizer, name="RSVP guard", color="#ff0000"
        )
        client = service._get_client(self.organizer)
        self.calendar = client.calendar(url=service._calendar_url(self.caldav_path))
        self.uid = f"rsvp-guard-{uuid4()}"
        self.start = (timezone.now() + timedelta(days=7)).replace(microsecond=0)

    def _rsvp(self, action="accepted"):
        token = TimestampSigner(salt="rsvp").sign_object(
            {
                "u": self.uid,
                "e": ATTENDEE,
                "o": self.organizer.email,
                "g": str(self.organizer.organization_id),
                "a": action,
            }
        )
        request = RequestFactory().post("/rsvp/", {"token": token})
        return RSVPConfirmView.as_view()(request)

    def _stored(self):
        return self.calendar.event_by_uid(self.uid).data

    def test_cancelled_event_is_not_updated(self):
        self.calendar.save_event(
            _calendar(
                _vevent(
                    self.uid, self.organizer.email, self.start, ["STATUS:CANCELLED"]
                )
            )
        )

        response = self._rsvp()

        assert response.status_code == 400
        assert "cancelled by the organizer" in response.content.decode()
        assert _instances(self._stored()) == {None: ("CANCELLED", "NEEDS-ACTION")}

    def test_deleted_event_is_not_recreated(self):
        event = self.calendar.save_event(
            _calendar(_vevent(self.uid, self.organizer.email, self.start))
        )
        event.delete()

        response = self._rsvp()

        assert response.status_code == 400
        assert "no longer exists" in response.content.decode()
        with pytest.raises(NotFoundError):
            self._stored()

    def test_removed_attendee_is_not_added_back(self):
        event = self.calendar.save_event(
            _calendar(_vevent(self.uid, self.organizer.email, self.start))
        )
        event.data = _calendar(
            _vevent(self.uid, self.organizer.email, self.start, attendee=False)
        )
        event.save()

        response = self._rsvp()

        assert response.status_code == 400
        assert "not listed as an attendee" in response.content.decode()
        assert _instances(self._stored())[None][1] is None

    def test_excluded_occurrence_stays_excluded(self):
        excluded = self.start + timedelta(days=1)
        self.calendar.save_event(
            _calendar(
                _vevent(
                    self.uid,
                    self.organizer.email,
                    self.start,
                    ["RRULE:FREQ=DAILY;COUNT=3", f"EXDATE:{_fmt(excluded)}"],
                )
            )
        )

        response = self._rsvp()

        assert response.status_code == 200
        stored = self._stored()
        instances = _instances(stored)
        assert list(instances) == [None]
        assert instances[None][1] == "ACCEPTED"
        master = icalendar.Calendar.from_ical(stored).walk("VEVENT")[0]
        assert [d.dt for d in master["EXDATE"].dts] == [excluded]

    def test_cancelled_occurrence_stays_cancelled(self):
        cancelled = self.start + timedelta(days=1)
        # The override comes first. The RSVP must still target the master.
        # A raw PUT keeps this order; the caldav library would reorder it.
        response = CalDAVHTTPClient().request(
            "PUT",
            self.organizer,
            f"{self.caldav_path}{self.uid}.ics",
            data=_calendar(
                _vevent(
                    self.uid,
                    self.organizer.email,
                    cancelled,
                    [f"RECURRENCE-ID:{_fmt(cancelled)}", "STATUS:CANCELLED"],
                ),
                _vevent(
                    self.uid,
                    self.organizer.email,
                    self.start,
                    ["RRULE:FREQ=DAILY;COUNT=3"],
                ),
            ).encode(),
            content_type="text/calendar",
        )
        assert response.status_code == 201

        response = self._rsvp()

        assert response.status_code == 200
        stored = CalDAVHTTPClient().request(
            "GET", self.organizer, f"{self.caldav_path}{self.uid}.ics"
        )
        instances = _instances(stored.text)
        assert instances[None][1] == "ACCEPTED"
        assert instances[cancelled] == ("CANCELLED", "NEEDS-ACTION")

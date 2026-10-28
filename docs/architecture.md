# Calendar Application Architecture

## Overview

The Calendar application is a modern, self-hosted calendar solution that combines a Django REST API backend with a separate CalDAV server for standards-compliant calendar data storage and synchronization. This architecture provides both a modern web interface and full CalDAV protocol support for compatibility with standard calendar clients.

## System Architecture

```
┌─────────────────┐
│   Frontend      │
│ (Vite + React)  │
└────────┬────────┘
         │
         │ HTTP/REST API + CalDAV Protocol
         │
┌────────▼─────────────────────────────────────┐
│         Django Backend                       │
│  ┌──────────────────────────────────────┐  │
│  │  REST API Endpoints                  │  │
│  │  - /api/v1.0/calendars               │  │
│  │  - /api/v1.0/users                   │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │  CalDAV Proxy                        │  │
│  │  - /caldav/*                        │  │
│  │  - /.well-known/caldav              │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │  Authentication (OIDC/Keycloak)      │  │
│  └──────────────────────────────────────┘  │
└────────┬───────────────────────────────────┘
         │
         │ HTTP/CalDAV Protocol
         │
┌────────▼─────────────────────────────────────┐
│         CalDAV Server                      │
│  (CalDAV Protocol Implementation)            │
│  - Calendar storage                          │
│  - Event storage (iCalendar format)          │
│  - CalDAV protocol handling                  │
└────────┬─────────────────────────────────────┘
         │
         │ PostgreSQL
         │
┌────────▼─────────────────────────────────────┐
│         PostgreSQL Database                  │
│  - Django models (users, calendars metadata) │
│  - CalDAV server schema (calendar data)      │
└──────────────────────────────────────────────┘
```

## Component Responsibilities

### Django Backend

The Django backend serves as the **orchestration layer** and **business logic engine** for the application.

**Primary Responsibilities:**
- **User Management & Authentication**: OIDC authentication via Keycloak, user profiles, sessions, authorization
- **Calendar Policies**: Entitlement checks for calendar creation and deletion, the organization default sharing level, ICS import, and mailbox calendar provisioning. The CalDAV server stores the calendars.
- **REST API Layer**: Modern RESTful API for the web frontend (JSON, standard HTTP methods, versioned at `/api/v1.0/`)
- **CalDAV Proxy**: Proxies CalDAV requests to CalDAV server, handles authentication translation, URL routing, discovery endpoint
- **Business Logic**: Invitation emails, permission checks, data validation, integration coordination

**Data Storage:**
- User accounts
- Organizations
- Channels (integration tokens, see [channels.md](channels.md))
- Application configuration

**Important**: Django does not store calendars, events or shares. The CalDAV server stores them.

### CalDAV Server

The CalDAV server is a **standards-compliant CalDAV server** that handles all calendar data storage and protocol operations.

**Primary Responsibilities:**
- **Calendar Data Storage**: Stores actual calendar events in iCalendar format, manages calendar collections
- **CalDAV Protocol Implementation**: Full RFC 4791 implementation (PROPFIND, REPORT, MKCALENDAR, PUT, DELETE)
- **iCalendar Format Management**: Parses and generates iCalendar files, validates syntax, handles VEVENT/VTODO components
- **Database Schema**: Uses PostgreSQL with its own schema for calendar data

**Authentication Integration:**
- Uses `ApiKeyAuthBackend`, which reads the user from the `X-LS-User` header
- Accepts `X-LS-User` only when the request also has a valid `X-LS-Api-Key` header (`CALDAV_OUTBOUND_API_KEY`)
- All communication is via HTTP - no direct database access from Django

### Frontend (Vite + React)

The frontend provides the user interface and interacts with both REST API and CalDAV protocol:
- Modern React-based UI
- Uses REST API for users, resources, channels, onboarding setup, ICS import and settings
- Uses CalDAV protocol directly for event operations
- Supports multiple languages and themes

## Why This Architecture?

### Design Decision: CalDAV Server Separation

The decision to use a separate CalDAV server rather than implementing CalDAV directly in Django was made for several reasons:

1. **Standards Compliance**: Using a mature, well-tested CalDAV server that fully implements RFC 4791. Implementing CalDAV from scratch would be error-prone and time-consuming.

2. **Protocol Complexity**: CalDAV is built on WebDAV, involving complex XML handling, property management, and collection hierarchies. A dedicated CalDAV server handles all of this complexity.

3. **Maintenance**: Using a proven, maintained CalDAV server reduces maintenance burden and ensures compatibility with various CalDAV clients.

4. **Focus**: Django backend can focus on business logic, user management, and REST API, while the CalDAV server handles calendar protocol operations.

5. **Shared database**: The CalDAV server stores its data into Postgres, which we use in all LaSuite projects.

6. **Clean separation**: All communication between Django and the CalDAV server is via HTTP, ensuring clean separation of concerns and no direct database access.

### Benefits

1. **Standards Compliance**
   - Full CalDAV protocol support enables compatibility with any CalDAV client (Apple Calendar, Thunderbird, etc.)
   - Users can sync calendars with external applications
   - Follows industry standards (RFC 4791)

2. **Separation of Concerns**
   - Django handles business logic and user management
   - CalDAV server handles calendar protocol and data storage
   - Each component focuses on its core competency

3. **Flexibility**
   - Can expose both REST API (for web app) and CalDAV (for external clients)
   - Different clients can use different protocols
   - Future-proof architecture

4. **Maintainability**
   - Clear boundaries between components
   - Easier to test and debug
   - Can update components independently

5. **Performance**
   - CalDAV server is optimized for CalDAV operations
   - Django can focus on application logic
   - Database can be optimized separately for each use case

## Data Flow

### Creating a Calendar

The frontend creates calendars directly with the CalDAV protocol:

1. **Frontend** → MKCALENDAR `/caldav/calendars/users/{email}/{calendar}/` (CalDAV)
2. **Django Backend**: `CalDAVProxyView` authenticates the user and forwards the request to the CalDAV server with authentication headers
3. **CalDAV Server**: Creates the calendar collection

### Creating an Event

Events are created directly via CalDAV protocol:

1. **Frontend** → PUT `/caldav/calendars/users/{email}/{calendar}/{event_uid}.ics` (CalDAV)
2. **Django Backend**: `CalDAVProxyView` authenticates user, forwards request to CalDAV server with authentication headers
3. **CalDAV Server**: Receives PUT request with iCalendar data, stores event in calendar collection
4. **Django Backend**: Forwards CalDAV response to frontend

### CalDAV Client Access

1. **CalDAV Client** → PROPFIND `/caldav/` (CalDAV protocol)
2. **Django Backend**: Authenticates user via Django session, forwards request to CalDAV server with `X-LS-User` header
3. **CalDAV Server**: Processes CalDAV request, returns CalDAV response
4. **Django Backend**: Forwards response to client

## Integration Points

### User Synchronization

The CalDAV server creates a user principal automatically on the first access. Its `ApiKeyAuthBackend` reads the user from the `X-LS-User` header that Django sends. Explicit user creation is not necessary.

### Calendar Creation

Django does not store calendars. The frontend creates them with MKCALENDAR
through the proxy. During onboarding setup, Django creates calendars with
`POST /internal-api/calendars/` on the CalDAV server. It authenticates with
`X-LS-Internal-Api-Key` (`CALDAV_INTERNAL_API_KEY`).

### Authentication Translation

Django sessions are translated to CalDAV server authentication:
- Django adds `X-LS-User` header with user email
- Django adds the `X-LS-Api-Key` header with `CALDAV_OUTBOUND_API_KEY`
- The CalDAV server's `ApiKeyAuthBackend` checks the key and reads `X-LS-User`
- All communication is via HTTP - no direct database access

### URL Routing

CalDAV clients expect specific URL patterns. The CalDAV proxy handles path translation:
- Discovery endpoint at `.well-known/caldav` redirects to `/caldav/`
- Proxy forwards requests to CalDAV server with correct paths

## Database Schema

Both Django and the CalDAV server use the same PostgreSQL database in a local Docker install, but maintain separate schemas:

**Django Schema (public schema):**
- `calendars_user` - User accounts
- `calendars_organization` - Organizations
- `calendars_channel` - Integration channels
- Other Django app tables

**CalDAV Server Schema (`CALDAV_DB_SCHEMA`, `sabre` in development, same database):**
- `users` - CalDAV server user records (not used, because authentication uses an API key)
- `principals` - CalDAV server principals
- `calendars` - Calendar collections
- `calendarinstances` - Calendar instance metadata
- `calendarobjects` - Calendar resources (events)
- `calendarchanges` - Change tracking
- Other CalDAV server-specific tables

This allows them to share the database locally while keeping data organized. Note that Django never directly accesses CalDAV server tables - all communication is via HTTP.

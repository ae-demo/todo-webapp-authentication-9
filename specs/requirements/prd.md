# todo-webapp-authentication-9 — PRD

## Problem Statement

People who track personal tasks in ad-hoc places — sticky notes, chat messages
to themselves, scattered notes apps — lose track of what they need to do and
have no durable, private record of it. They need a simple place to keep a
todo list that is theirs alone, persists across sessions and devices, and is
protected behind a sign-in so nobody else can see or change it.

## Solution

A todo web application where each person signs in with their own account and
manages a personal list of todo items — creating, viewing, and completing
entries. Every todo is stored durably in a database and is only ever visible
to the user who owns it.

## Actors

- **User** — a signed-in individual who manages their own private list of
todo entries: creating, viewing, and completing them. There is no admin or
shared-access actor; every user sees only their own todos.

## User Stories

1. As a User, I want to sign up and sign in, so that I have a private,
personal todo list only I can access.
2. As a User, I want to create a new todo entry with a title, so that I can
record something I need to do.
3. As a User, I want to see the list of all my todo entries, so that I know
what is pending and what is done.
4. As a User, I want to mark a todo entry as complete (and reopen it if
needed), so that I can track my progress.
5. As a User, I want my todos to persist across sign-ins and devices, so that
my list is always there when I come back.

## Product Decisions

- **Sign-in:** every user authenticates via SSO through Thunder, the
platform IDP (org default).
- **Self-service enrolment:** permitted — this product describes people who
sign themselves up for a personal todo list, with no invitation or admin
step required.
- **Data scope:** todo lists are private per user; there is no sharing,
collaboration, or admin visibility into another user's todos.
- **Todo entry shape:** a todo entry carries a title and a completion status
only — no due date, priority, or category in this version.
- **Persistence:** todo entries are stored in a database so they survive
across sessions and devices.
- **Notifications:** the product sends no reminders or notification emails
in this version.
- **Editing and deleting:** not supported in this version — once created, a
todo entry can only be marked complete or reopened; its title cannot be
edited and the entry cannot be deleted.

## Out of Scope

- Sharing todo lists or assigning todos to other users.
- An admin or manager actor with visibility into other users' todos.
- Due dates, priorities, categories, tags, or reminders on todo entries.
- Native mobile applications (this is a web app only).
- Notification emails or push reminders.
- Editing a todo entry's title or deleting a todo entry.

## Open Questions

*(none — the interview converged on the decisions above)*
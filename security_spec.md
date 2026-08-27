# Security Specification: Support Chat & Real-Time Desk Architecture

## 1. System Architecture & Access Control

### 1.1 Roles and Isolation Boundaries
- **Administrator (`admin`)**:
  - Full read and reply permissions across all support ticket threads, chat rooms, and registered users.
  - Dedicated search interface querying user email, account numbers, client names, and message payloads.
  - Exclusively permitted to moderate or delete test messages.
- **Regular Client (`user`)**:
  - Strictly isolated to 1-on-1 private messaging with the SVB Support Desk.
  - Zero visibility into any other user's conversations, identity, account balance, or inquiries.
  - **No Self-Deletion**: End users have zero permissions or controls to delete sent messages or chat history.

## 2. Firestore Collections & Security Invariants

### 2.1 Collections Schema
- `/support_tickets/{ticketId}`:
  - Document holding ticket metadata (`subject`, `category`, `status`, `userId`, `userEmail`, `accountNumber`, `createdAt`, `updatedAt`, `messages`).
- `/support_tickets/{ticketId}/messages/{msgId}`:
  - Subcollection holding timestamped messages, sender identity, and image attachments.
- `/chats/{chatId}` and `/chats/{chatId}/messages/{msgId}`:
  - Mirror/alias collections for live chat sync.

### 2.2 Data Invariants & Security Testing (Dirty Dozen)
1. **Cross-Tenant Leakage**: Non-admin clients querying support tickets must never receive documents where `userId != auth.uid` or `userEmail != auth.token.email`.
2. **Client Self-Deletion Prohibition**: DELETE requests against `/support_tickets/{ticketId}/messages/{msgId}` by non-admin users must be rejected.
3. **Admin Verification**: Sensitive administrative operations (e.g., status mutations, direct customer messaging) require administrative privilege validation.
4. **Message Immutability**: Historical user messages cannot be overwritten or wiped once persisted to the database.
5. **Real-Time Cross-Tab Synchronization**: Real-time snapshots and event bus dispatches ensure admin and user screens remain in exact parity without race conditions.

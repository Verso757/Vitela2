# Security Spec

## Data Invariants
1. A clinic must have a valid ownerId matching the authenticated user during creation.
2. Only owners or members of a clinic can access or modify its patients, appointments, and records.
3. Appointments and records must reference a positive/valid patientId.

## The "Dirty Dozen" Payloads
1. Clinic creation with mismatched ownerId (Spoofing)
2. Clinic update trying to change ownerId (Immutability violation)
3. Adding a member to a clinic without being the owner (Authorization)
4. Adding an appointment with a missing patientId (Integrity)
5. Modifying a clinic's patient without being a member (Authorization)
6. Updating a record's authorId (Immutability violation)
7. Querying patients without specifying clinic membership (Scraping)
8. Modifying member role as a non-owner (Privilege escalation)
9. Creating an appointment with a 1MB string for patientId (Resource exhaust)
10. Updating a clinic's name with an object instead of a string (Type violation)
11. Reading records of a different clinic (Isolation)
12. Creating a member with an invalid role string (Enum violation)

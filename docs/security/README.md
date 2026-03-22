# Security Documentation

This directory contains security-related documentation for the Ledgy application.

## Security Issues & Resolutions

### Profile Isolation Security Fix (2026-03-22)
- **File:** [profile-isolation-fix.md](./profile-isolation-fix.md)
- **Severity:** High
- **Status:** ✅ Resolved
- **Issue:** Users could see encrypted profiles from other users
- **Solution:** Implemented user-scoped database architecture

## Security Best Practices

### Data Isolation
- Each user's data is stored in user-scoped databases
- Profile enumeration is limited to current user only
- No cross-user data visibility or metadata leakage

### Authentication & Authorization
- Stable user identifiers derived from TOTP secrets
- User ID validation for all profile operations
- Proper authentication boundaries enforced

### Encryption & Privacy
- AES-256-GCM encryption for all profile data
- User-specific encryption keys
- No plaintext storage of sensitive information

## Reporting Security Issues

If you discover a security issue:
1. Document the issue thoroughly
2. Assess the potential impact
3. Implement and test a fix
4. Document the resolution in this directory
5. Update relevant tests and documentation

## Security Testing

Security features should be validated with:
- Unit tests for isolation logic
- Integration tests for user boundaries  
- Manual verification of fix effectiveness
- Performance impact assessment

---

**Last Updated:** 2026-03-22  
**Maintained By:** Development Team
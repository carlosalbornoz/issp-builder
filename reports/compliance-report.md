# Compliance Report - issp


Generated: 2026-06-29T03:15:13.461Z


## Executive Summary

Overall compliance score: **0%** (Grade: **F**)

| Framework | Grade | Score | Controls | Passed | Failed | Warnings | Critical Failures |
|-----------|-------|-------|----------|--------|--------|----------|-------------------|
| GDPR | F | 11% | 39 | 3 | 2 | 2 | 2 |
| OWASP | F | 33% | 6 | 2 | 1 | 0 | 1 |
| CIS | F | 0% | 5 | 0 | 0 | 0 | 0 |
| NIST | F | 0% | 23 | 0 | 0 | 0 | 0 |
| NIST-800-53 | F | 13% | 76 | 8 | 0 | 0 | 0 |
| ISO27001 | C | 67% | 10 | 7 | 0 | 0 | 0 |
| ISO27701 | F | 0% | 11 | 0 | 0 | 0 | 0 |
| PRIVACY-CORE | F | 0% | 40 | 0 | 0 | 0 | 0 |
| DPA-PH | F | 0% | 10 | 0 | 0 | 0 | 0 |

**Security Findings**: 5 total (1 critical, 1 high)

**Audit Impact**: -31% (1 critical, 1 high, 3 medium, 0 low findings)

## Security Findings

Total findings: **5**

### Secrets

| Severity | Title | File | Fix |
|----------|-------|------|-----|
| critical | Hardcoded secret/token | docs/security-review.md:69 | Move this secret to a secure vault (Vault, AWS KMS, etc.) or... |

### Authentication

| Severity | Title | File | Fix |
|----------|-------|------|-----|
| medium | No session timeout configuration detected | project-wide | Configure session expiration: maxAge, idle timeout, or JWT e... |

### Database

| Severity | Title | File | Fix |
|----------|-------|------|-----|
| high | Missing audit timestamps in schema | uacs/uacs_codes.sql | Add created_at and updated_at columns. In Prisma: add DateTi... |
| medium | Missing soft delete pattern | uacs/uacs_codes.sql | Add deleted_at column or soft delete flag. In Prisma: Delete... |
| medium | Missing user audit columns | uacs/uacs_codes.sql | Add created_by and updated_by columns to track which user ma... |

## Compliance Details

### Framework Scores

#### GDPR - 11% (Grade: F)

- Total Controls: 39
- Passed: 3
- Failed: 2
- Warnings: 2
- Not Applicable: 0
- Not Implemented: 32
- Critical Failures: 2

**Severity Breakdown:**
| Level | Total | Passed | Failed | Warning | Not Implemented |
|-------|-------|--------|--------|---------|-----------------|
| Critical | 26 | 3 | 2 | 0 | 21 |
| High | 11 | 0 | 0 | 2 | 9 |
| Medium | 2 | 0 | 0 | 0 | 2 |

#### OWASP - 33% (Grade: F)

- Total Controls: 6
- Passed: 2
- Failed: 1
- Warnings: 0
- Not Applicable: 0
- Not Implemented: 3
- Critical Failures: 1

**Severity Breakdown:**
| Level | Total | Passed | Failed | Warning | Not Implemented |
|-------|-------|--------|--------|---------|-----------------|
| Critical | 6 | 2 | 1 | 0 | 3 |

#### CIS - 0% (Grade: F)

- Total Controls: 5
- Passed: 0
- Failed: 0
- Warnings: 0
- Not Applicable: 0
- Not Implemented: 5
- Critical Failures: 0

**Severity Breakdown:**
| Level | Total | Passed | Failed | Warning | Not Implemented |
|-------|-------|--------|--------|---------|-----------------|
| Critical | 3 | 0 | 0 | 0 | 3 |
| High | 2 | 0 | 0 | 0 | 2 |

#### NIST - 0% (Grade: F)

- Total Controls: 23
- Passed: 0
- Failed: 0
- Warnings: 0
- Not Applicable: 0
- Not Implemented: 23
- Critical Failures: 0

**Severity Breakdown:**
| Level | Total | Passed | Failed | Warning | Not Implemented |
|-------|-------|--------|--------|---------|-----------------|
| Critical | 8 | 0 | 0 | 0 | 8 |
| High | 8 | 0 | 0 | 0 | 8 |
| Medium | 7 | 0 | 0 | 0 | 7 |

#### NIST-800-53 - 13% (Grade: F)

- Total Controls: 76
- Passed: 8
- Failed: 0
- Warnings: 0
- Not Applicable: 0
- Not Implemented: 68
- Critical Failures: 0

**Severity Breakdown:**
| Level | Total | Passed | Failed | Warning | Not Implemented |
|-------|-------|--------|--------|---------|-----------------|
| Critical | 16 | 4 | 0 | 0 | 12 |
| High | 37 | 3 | 0 | 0 | 34 |
| Medium | 21 | 1 | 0 | 0 | 20 |
| Low | 2 | 0 | 0 | 0 | 2 |

#### ISO27001 - 67% (Grade: C)

- Total Controls: 10
- Passed: 7
- Failed: 0
- Warnings: 0
- Not Applicable: 0
- Not Implemented: 3
- Critical Failures: 0

**Severity Breakdown:**
| Level | Total | Passed | Failed | Warning | Not Implemented |
|-------|-------|--------|--------|---------|-----------------|
| Critical | 4 | 2 | 0 | 0 | 2 |
| High | 6 | 5 | 0 | 0 | 1 |

#### ISO27701 - 0% (Grade: F)

- Total Controls: 11
- Passed: 0
- Failed: 0
- Warnings: 0
- Not Applicable: 0
- Not Implemented: 11
- Critical Failures: 0

**Severity Breakdown:**
| Level | Total | Passed | Failed | Warning | Not Implemented |
|-------|-------|--------|--------|---------|-----------------|
| Critical | 5 | 0 | 0 | 0 | 5 |
| High | 6 | 0 | 0 | 0 | 6 |

#### PRIVACY-CORE - 0% (Grade: F)

- Total Controls: 40
- Passed: 0
- Failed: 0
- Warnings: 0
- Not Applicable: 0
- Not Implemented: 40
- Critical Failures: 0

**Severity Breakdown:**
| Level | Total | Passed | Failed | Warning | Not Implemented |
|-------|-------|--------|--------|---------|-----------------|
| Critical | 13 | 0 | 0 | 0 | 13 |
| High | 20 | 0 | 0 | 0 | 20 |
| Medium | 6 | 0 | 0 | 0 | 6 |
| Low | 1 | 0 | 0 | 0 | 1 |

#### DPA-PH - 0% (Grade: F)

- Total Controls: 10
- Passed: 0
- Failed: 0
- Warnings: 0
- Not Applicable: 0
- Not Implemented: 10
- Critical Failures: 0

**Severity Breakdown:**
| Level | Total | Passed | Failed | Warning | Not Implemented |
|-------|-------|--------|--------|---------|-----------------|
| Critical | 4 | 0 | 0 | 0 | 4 |
| High | 6 | 0 | 0 | 0 | 6 |


## Risk Assessment

**Critical Issues**: 0
**High Issues**: 0
**Total Failed Controls**: 0
**Critical Findings**: 1


## Security Controls

| ID | Name | Status | Severity |
|----|------|--------|----------|
| GDPR-ART32-002 | Encryption at Rest | not-implemented | critical |
| GDPR-ART32-003 | Encryption in Transit | not-implemented | critical |
| GDPR-ART32-004 | Unique User Identification | not-implemented | critical |
| GDPR-ART32-005 | Automatic Session Timeout | not-implemented | high |
| GDPR-ART32-006 | Audit Logging | not-implemented | critical |
| GDPR-ART32-009 | Regular Security Testing | not-implemented | critical |
| OWASP-ASVS-003 | Authentication Security | not-implemented | critical |
| OWASP-ASVS-004 | Access Control | not-implemented | critical |
| OWASP-ASVS-005 | Secrets Management | not-implemented | critical |
| OWASP-ASVS-006 | Secure Communications | not-implemented | critical |
| NIST-800-53-AU-2 | Event Logging | not-implemented | critical |
| NIST-800-53-AU-3 | Content of Audit Records | not-implemented | high |
| NIST-800-53-AU-6 | Audit Record Review, Analysis, and Reporting | not-implemented | high |
| NIST-800-53-AU-9 | Protection of Audit Information | not-implemented | high |
| NIST-800-53-AU-12 | Audit Record Generation | not-implemented | critical |
| NIST-800-53-IA-2 | Identification and Authentication | not-implemented | critical |
| NIST-800-53-IA-5 | Authenticator Management | not-implemented | critical |
| NIST-800-53-IA-8 | Service Provider Identification and Authentication | not-implemented | medium |
| ISO27001-A9 | Access Control | not-implemented | critical |
| ISO27001-A10 | Cryptography | not-implemented | critical |
| ISO27001-A18 | Compliance | not-implemented | high |
| HIPAA-164.312-a | Access Control | not-implemented | critical |
| HIPAA-164.312-b | Audit Controls | not-implemented | critical |
| HIPAA-164.312-d | Person or Entity Authentication | not-implemented | critical |
| HIPAA-164.312-e | Transmission Security | not-implemented | critical |

### Security Findings (5)

- [CRITICAL] Hardcoded secret/token (docs/security-review.md)
- [MEDIUM] No session timeout configuration detected (project)
- [HIGH] Missing audit timestamps in schema (uacs/uacs_codes.sql)
- [MEDIUM] Missing soft delete pattern (uacs/uacs_codes.sql)
- [MEDIUM] Missing user audit columns (uacs/uacs_codes.sql)

## Compliance Recommendations

### Immediate Security Fixes

- **[CRITICAL] Hardcoded secret/token** (docs/security-review.md): Move this secret to a secure vault (Vault, AWS KMS, etc.) or environment variable. Never commit secrets to source control.

### Not Yet Implemented

364 controls have not been implemented yet. Start with:

- **GDPR-ART5-001** (critical): Lawfulness, Fairness, and Transparency
- **GDPR-ART5-002** (critical): Purpose Limitation
- **GDPR-ART5-003** (high): Data Minimisation
- **GDPR-ART5-004** (high): Accuracy
- **GDPR-ART5-005** (critical): Storage Limitation
- ... and 359 more

**Compliance posture is critically low.** Resolve all critical findings before any deployment.
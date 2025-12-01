# Hosting Services Quote Request
## Managed Hosting Services for Events CRM Platform

> **Document Version:** 1.0  
> **Date:** 2024-12-XX  
> **Confidentiality:** This document contains proprietary information

---

## 1. Executive Summary

### 1.1 Purpose

We are seeking a Saudi Arabia-based managed hosting services provider to host the Events CRM platform—a modern, scalable system for managing high-profile events with complex guest logistics. We require fully managed services that eliminate the need for virtual machine management, patching, and server administration. This document outlines our requirements for a quick quote.

### 1.2 Project Overview

**Application Name:** Events CRM

**Application Type:** Multi-tenant SaaS platform for event management

**Technology Stack:**
- **Framework:** Next.js 15.3 (React with App Router)
- **Runtime:** Node.js 18+
- **Database:** PostgreSQL 16
- **Cache/Queue:** Redis 7
- **Background Jobs:** BullMQ
- **Language:** TypeScript 5.x
- **Authentication:** Better-Auth (OAuth + Magic Link)

**Current Scale:** Medium (1,000-10,000 guests per event)  
**Future Scale:** Large (50,000+ guests for events like AFC Asian Cup 2027)

**Deployment Model:** Multi-tenant SaaS with workspace-based architecture

### 1.3 Key Objectives

1. **Eliminate Infrastructure Management:** No VM patching, server administration, or manual maintenance
2. **KSA Data Residency Compliance:** All data must be stored and processed within Saudi Arabia
3. **High Availability:** 99.9% uptime SLA minimum
4. **Scalability:** Support growth from medium to large-scale events
5. **Security:** Full compliance with Saudi cybersecurity regulations
6. **Ease of Use:** Simple deployment and management interface

---

## 2. Mandatory Requirements

### 2.1 Saudi Arabia Data Residency

**REQUIRED:** All data must be stored and processed within Saudi Arabia.

| Requirement | Specification |
|-------------|---------------|
| **Data Center Location** | Physically located within Kingdom of Saudi Arabia |
| **Data Processing** | All compute resources must operate within KSA |
| **Data Replication** | No data replication or backup to locations outside Saudi Arabia without explicit written consent |
| **Provider Ownership** | Provider must be a Saudi-owned or Saudi-operated company |
| **Compliance Documentation** | Must provide certification of KSA data residency compliance |

**Verification:** Provider must provide documentation certifying that all services meet KSA data residency requirements.

---

### 2.2 Managed PostgreSQL Database Service

**REQUIRED:** Fully managed PostgreSQL database service with no manual administration required.

#### 2.2.1 Version and Configuration

| Requirement | Specification |
|-------------|---------------|
| **PostgreSQL Version** | 16 or higher |
| **Connection Pooling** | Minimum 20 concurrent connections |
| **SSL/TLS Encryption** | Required for all connections (TLS 1.2+) |
| **Database Size** | Initial 20GB, scalable to 100GB+ |
| **Performance** | Support for 100,000+ records per table with indexed queries |

#### 2.2.2 High Availability and Backup

| Requirement | Specification |
|-------------|---------------|
| **High Availability** | Primary-replica setup preferred (automatic failover) |
| **Automatic Backups** | Daily automated backups |
| **Backup Retention** | Minimum 7 days, preferred 30 days |
| **Point-in-Time Recovery** | Required capability |
| **Backup Testing** | Regular backup restoration testing |

#### 2.2.3 Monitoring and Management

**Required Monitoring:**
- CPU usage metrics
- Memory usage metrics
- Disk usage and I/O metrics
- Query performance metrics
- Connection pool utilization
- Slow query logging
- Alerting for resource thresholds

**Management Interface:**
- Web-based console for database management
- CLI tools for automation
- API access for programmatic management
- No SSH or direct server access required

#### 2.2.4 Maintenance

- **Automatic Patching:** Security and minor version updates applied automatically
- **Maintenance Windows:** Scheduled with advance notice (minimum 48 hours)
- **Zero-Downtime Updates:** Preferred for non-critical updates
- **Version Upgrades:** Managed upgrade path for major versions

---

### 2.3 Managed Redis Service

**REQUIRED:** Fully managed Redis service for caching and job queue operations.

#### 2.3.1 Version and Configuration

| Requirement | Specification |
|-------------|---------------|
| **Redis Version** | 7 or higher |
| **Memory** | Minimum 2GB, scalable to 8GB+ |
| **SSL/TLS Encryption** | Required for all connections |
| **Persistence** | RDB and/or AOF persistence options |

#### 2.3.2 Use Cases

The Redis service will be used for:
1. **Application Caching:** Session data, frequently accessed data
2. **Rate Limiting:** API rate limiting storage
3. **Background Job Queue:** BullMQ job queue operations
4. **Session Storage:** Optional session storage

#### 2.3.3 High Availability

| Requirement | Specification |
|-------------|---------------|
| **Replication** | Master-replica setup with automatic failover |
| **Data Durability** | Persistence options to prevent data loss |
| **Backup** | Automatic backup capability |

#### 2.3.4 Monitoring and Management

**Required Monitoring:**
- Memory usage and eviction metrics
- Hit/miss rates
- Connection counts
- Command latency
- Key count and expiration metrics
- Alerting for memory thresholds

**Management Interface:**
- Web-based console
- CLI tools for automation
- API access for programmatic management

#### 2.3.5 Maintenance

- Automatic security patches
- Scheduled maintenance windows with advance notice
- Zero-downtime updates preferred

---

### 2.4 Platform-as-a-Service (PaaS) for Next.js Application

**REQUIRED:** Fully managed PaaS platform for hosting Next.js application without VM management.

#### 2.4.1 Runtime Requirements

| Requirement | Specification |
|-------------|---------------|
| **Node.js Version** | 18 or higher (LTS preferred) |
| **Package Manager** | Support for npm and pnpm |
| **Build Process** | Support for Next.js build process (Turbopack) |
| **TypeScript** | Native TypeScript support |

#### 2.4.2 Application Deployment

**Deployment Methods (at least one required):**
- Git-based deployment (push to deploy)
- Container-based deployment (Docker)
- CLI-based deployment

**Environment Management:**
- Environment variable management via console/CLI
- Support for multiple environments (staging, production)
- Secrets management
- Configuration management

#### 2.4.3 Application Architecture

The application consists of two components that must be deployable separately:

1. **Web Application (Next.js)**
   - Port: 3000
   - Type: Next.js server with API routes
   - Resource Requirements: Minimum 2GB RAM, 2 CPU cores

2. **Background Worker (BullMQ)**
   - Type: Node.js worker process
   - Purpose: Process background jobs (email sending, data processing)
   - Resource Requirements: Minimum 1GB RAM, 1 CPU core
   - Must run separately from web application

#### 2.4.4 Scaling and Performance

| Requirement | Specification |
|-------------|---------------|
| **Automatic Scaling** | Horizontal and/or vertical scaling based on load |
| **Manual Scaling** | Ability to manually adjust resources |
| **Resource Limits** | Configurable CPU and memory limits |
| **Performance** | Support for 100+ concurrent users |

#### 2.4.5 Deployment Features

**Required Features:**
- Zero-downtime deployments
- Rollback capability (quick rollback to previous version)
- Health check endpoints
- Custom domain support
- SSL certificate management (automatic Let's Encrypt or manual)
- Log aggregation and viewing
- Real-time log streaming

#### 2.4.6 Monitoring and Observability

**Required Monitoring:**
- Application performance metrics (response time, throughput)
- Resource usage (CPU, memory, disk)
- Error rates and exception tracking
- Request/response logging
- Custom metrics support
- Alerting and notifications

#### 2.4.7 Maintenance

- Automatic runtime updates
- No server patching required
- Managed infrastructure updates
- Scheduled maintenance with advance notice

---

### 2.5 Object Storage Service

**REQUIRED:** Object storage service with KSA data residency.

#### 2.5.1 Storage Requirements

| Requirement | Specification |
|-------------|---------------|
| **Initial Storage** | 50GB |
| **Scalability** | Scale to 1TB+ as needed |
| **API Access** | RESTful API for programmatic access |
| **Data Location** | Stored in Saudi Arabia data centers |

#### 2.5.2 Features

**Required Features:**
- Bucket creation and management
- Access control (bucket policies, IAM)
- Versioning support
- Lifecycle policies (automatic archival/deletion)
- Encryption at rest
- HTTPS access only (no HTTP)
- CORS support

**Optional but Preferred:**
- CDN integration for content delivery
- Image optimization/resizing
- Static website hosting

#### 2.5.3 Use Cases

The object storage will be used for:
- User-uploaded images (avatars, workspace logos, event images)
- Email template assets
- Event-related files and documents
- Application backups
- Static assets

#### 2.5.4 Security

- Encryption at rest (AES-256 or equivalent)
- Encryption in transit (HTTPS/TLS)
- Access logging and audit trails
- IP whitelisting/blacklisting (optional)

---

### 2.6 Security and Compliance Requirements

**REQUIRED:** Full compliance with Saudi Arabia cybersecurity and data protection regulations.

#### 2.6.1 Mandatory Compliance Standards

| Standard | Requirement |
|----------|-------------|
| **NCA Essential Cybersecurity Controls** | Full compliance with National Cybersecurity Authority Essential Cybersecurity Controls |
| **SAMA Cybersecurity Framework** | Compliance with Saudi Arabian Monetary Authority Cybersecurity Framework (if applicable to our use case) |
| **CITC Guidelines** | Compliance with Communications and Information Technology Commission guidelines |
| **Saudi Data Protection Law** | Compliance with Saudi Personal Data Protection Law |

**Documentation Required:**
- Compliance certifications
- Security audit reports
- Penetration testing reports (annual)
- Third-party security assessments

#### 2.6.2 Data Protection

| Requirement | Specification |
|-------------|---------------|
| **Encryption at Rest** | All data encrypted at rest (databases, object storage, backups) |
| **Encryption in Transit** | TLS 1.2+ for all connections |
| **Key Management** | Secure key management and rotation |
| **Data Isolation** | Network isolation/VPC support |

#### 2.6.3 Network Security

| Requirement | Specification |
|-------------|---------------|
| **DDoS Protection** | Distributed Denial of Service protection |
| **Firewall** | Network firewall and security groups |
| **Intrusion Detection** | Intrusion detection and prevention systems |
| **Vulnerability Scanning** | Regular automated vulnerability scanning |
| **Security Updates** | Automatic security patches and updates |

#### 2.6.4 Access Control and Identity Management

- Role-based access control (RBAC)
- Multi-factor authentication (MFA) support
- Single Sign-On (SSO) support (optional but preferred)
- Audit logging for all administrative actions
- Session management and timeout policies

#### 2.6.5 Security Monitoring and Incident Response

- Security event monitoring
- Incident detection and alerting
- Security incident response procedures
- Regular security assessments
- Compliance reporting

---

## 3. Support and Operations

### 3.1 Service Level Agreement (SLA)

| Metric | Requirement |
|--------|-------------|
| **Uptime SLA** | 99.9% availability (maximum 43.2 minutes downtime per month) |
| **Scheduled Maintenance** | Maximum 4 hours per month with 48+ hours advance notice |
| **Incident Response Time** | Critical: < 1 hour, High: < 4 hours, Normal: < 24 hours |
| **Service Credits** | SLA credits for downtime exceeding thresholds |

### 3.2 Support Channels

**Required Support Channels:**
- Email support (24/7)
- Phone support (24/7)
- Ticketing system
- Online chat (preferred)

**Support Languages:**
- Arabic (required)
- English (required)

### 3.3 Account Management

- Dedicated account manager (preferred)
- Monthly service review meetings
- Quarterly business reviews
- Proactive monitoring and recommendations

### 3.4 Status and Communication

- Public status page for service health
- Incident notification system (email, SMS, or push notifications)
- Maintenance notification system
- Service health dashboards

### 3.5 Documentation and Training

- Comprehensive documentation (Arabic and English)
- API documentation
- Deployment guides
- Best practices documentation
- Training sessions for team (optional)

---

## 4. Backup and Disaster Recovery

### 4.1 Backup Requirements

| Service | Backup Frequency | Retention Period | Recovery Options |
|---------|-------------------|------------------|-------------------|
| **PostgreSQL** | Daily automated backups | Minimum 7 days, preferred 30 days | Point-in-time recovery, full restore |
| **Redis** | Daily automated backups | Minimum 7 days | Full restore |
| **Object Storage** | Versioning enabled | Configurable | Version restore |
| **Application** | Deployment snapshots | 30 days | Rollback to previous version |

### 4.2 Disaster Recovery

| Requirement | Specification |
|-------------|---------------|
| **Recovery Time Objective (RTO)** | < 4 hours |
| **Recovery Point Objective (RPO)** | < 1 hour |
| **Disaster Recovery Plan** | Documented DR procedures |
| **Backup Testing** | Regular backup restoration testing (quarterly) |
| **Cross-Region Backup** | Backup replication within KSA (optional but preferred) |

### 4.3 Business Continuity

- High availability architecture
- Automatic failover capabilities
- Geographic redundancy (within KSA)
- Data replication strategies

---

## 5. Pricing and Commercial Requirements

### 5.1 Budget Range

**Target Budget:** $500 - $1,000 per month (medium scale deployment)

**Future Scaling:** Pricing should scale predictably for large-scale deployments (50,000+ guests)

### 5.2 Pricing Tiers

Please provide pricing for the following scenarios:

1. **Small Scale:** 1,000 guests, 1 workspace, 10GB database, 2GB Redis
2. **Medium Scale:** 10,000 guests, 5 workspaces, 20GB database, 4GB Redis (target)
3. **Large Scale:** 50,000+ guests, 20+ workspaces, 100GB database, 8GB Redis

### 5.3 Commercial Terms

| Requirement | Specification |
|-------------|---------------|
| **Contract Term** | Monthly, quarterly, or annual options |
| **Payment Terms** | Net 30 days preferred |
| **Payment Methods** | Bank transfer, credit card |
| **Setup Fees** | One-time setup fees (if any) |
| **Early Termination** | Termination policies and fees |
| **Price Lock** | Price guarantee period |
| **Volume Discounts** | Discounts for annual commitments or large scale |

---

## 6. Quick Quote Response

Please provide a concise quote that includes:

1. **Service Availability**
   - Which required services do you offer? (PostgreSQL, Redis, PaaS, Object Storage)
   - Any limitations or alternatives?

2. **Pricing**
   - Monthly pricing for medium scale deployment (10,000 guests, 5 workspaces, 20GB database, 4GB Redis)
   - Pricing for small scale (1,000 guests) and large scale (50,000+ guests)
   - Any setup fees or additional costs?

3. **Key Specifications**
   - PostgreSQL version and connection limits
   - Redis version and memory options
   - Node.js versions supported on PaaS
   - Object storage API type

4. **Compliance**
   - KSA data residency guarantee
   - Compliance certifications (NCA, SAMA, CITC)

5. **Support**
   - Support hours and languages
   - Response time commitments

### 6.1 Response Questions

Please address the following questions in your response:

1. **PostgreSQL Service:**
   - What PostgreSQL version do you offer?
   - Do you support connection pooling? What is the maximum?
   - What backup and recovery options are available?
   - What is your high availability solution?

2. **Redis Service:**
   - What Redis version do you offer?
   - Is Redis suitable for job queue operations (BullMQ)?
   - What persistence options are available?
   - What is your high availability solution?

3. **PaaS Platform:**
   - What Node.js versions are supported?
   - Can we deploy separate web application and background workers?
   - What deployment methods are supported?
   - What scaling options are available?

4. **Object Storage:**
   - What type of API do you provide?
   - Where is data physically stored?
   - What encryption is used?
   - Is CDN integration available?

5. **Data Residency:**
   - Can you guarantee all data stays within Saudi Arabia?
   - Where are your data centers located?
   - Do you have KSA compliance certifications?

6. **Security:**
   - What compliance certifications do you hold?
   - When was your last security audit?
   - What encryption standards do you use?
   - How do you handle security incidents?

7. **Support:**
   - What are your support hours and languages?
   - What is your average response time?
   - Do you provide a dedicated account manager?
   - What documentation is available?

8. **Pricing:**
   - What is your pricing model?
   - Are there any hidden costs?
   - What discounts are available?
   - How does pricing scale?

---

## 7. Submission Details

### 7.1 Response Format

**Response Format:** Email with quote details (PDF or document attachment)

**Response Length:** Concise - 2-5 pages preferred

### 7.2 Contact Information

**Primary Contact:**
- Name: [Your Name]
- Email: [Your Email]
- Phone: [Your Phone]

**Questions:**
Please submit any questions via email with subject line: **"Events CRM Hosting Quote - Question"**

---

## 8. Additional Information

### 8.1 Architecture Documentation

Full technical architecture documentation is available upon request. The architecture document includes:
- Detailed technology stack
- Database schema and design
- API architecture
- Security architecture
- Scalability considerations

### 8.2 Current Deployment

Currently, the application is deployed on self-hosted infrastructure:
- Self-hosted PostgreSQL 16
- Self-hosted Redis 7
- Manual deployment with PM2
- Self-managed servers

**Migration Requirement:** We seek to migrate from self-hosted to fully managed services to eliminate infrastructure management overhead.

### 8.3 Expected Growth

The platform is designed to scale from:
- **Current:** 1,000 guests per event
- **Near-term:** 10,000 guests per event
- **Long-term:** 50,000+ guests per event (AFC Asian Cup 2027 scale)

### 8.4 Integration Requirements

The platform may require integration with:
- SMTP email services (KSA-compliant)
- WhatsApp Business API (future)
- Payment gateways (future)
- Third-party APIs

---

## 10. Appendices

### Appendix A: Glossary

- **KSA:** Kingdom of Saudi Arabia
- **NCA:** National Cybersecurity Authority
- **SAMA:** Saudi Arabian Monetary Authority
- **CITC:** Communications and Information Technology Commission
- **PaaS:** Platform as a Service
- **SLA:** Service Level Agreement
- **RTO:** Recovery Time Objective
- **RPO:** Recovery Point Objective
- **RBAC:** Role-Based Access Control
- **VPC:** Virtual Private Cloud

### Appendix B: Reference Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 Managed Services Architecture                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   PaaS       │    │  Managed     │    │  Managed     │  │
│  │   Next.js    │◀──▶│  PostgreSQL  │    │  Redis       │  │
│  │   App        │    │  Database    │    │  Cache/Queue │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                                       │          │
│         │            ┌──────────────┐          │          │
│         └───────────▶│  PaaS        │◀─────────┘          │
│                      │  Worker      │                      │
│                      │  (BullMQ)    │                      │
│                      └──────────────┘                      │
│                             │                              │
│                      ┌──────────────┐                      │
│                      │  Object      │                      │
│                      │  Storage     │                      │
│                      └──────────────┘                      │
│                                                             │
│  All services hosted in Saudi Arabia data centers          │
└─────────────────────────────────────────────────────────────┘
```

---

## Document Control

**Version History:**
- v1.0 - Initial RFP document

**Next Review Date:** [Date]

**Document Owner:** [Your Name/Organization]

---

**END OF QUOTE REQUEST**


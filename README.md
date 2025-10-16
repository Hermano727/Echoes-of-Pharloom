# Echoes of Pharloom

Echoes of Pharloom is a focused study companion that combines session tracking, ambient feedback, and motivational tools to help users stay engaged and consistent with their learning routines. The platform is designed with modularity, offline resilience, and future scalability in mind — combining a React-based frontend, serverless backend services, and cloud-native infrastructure as code.

---

### Documentation

Full internal documentation, including a complete technical overview, architectural diagrams, and component references, is available here:  
[Echoes of Pharloom Technical Overview](https://docs.google.com/document/d/1-PFfj60IWHIwPLEwis_iFzIdUSUc_xD6zW_ymEm-iLw/edit?usp=sharing)

---

### Tech Stack Overview

**Frontend:**  
- React + TypeScript  
- AWS Cognito for authentication (PKCE flow)  
- Amplify hosting  
- RESTful API communication with backend Lambdas  
- Local caching, MSW for dev mocks, audio/video ambience

**Backend Services:**  
- Node.js AWS Lambda functions  
- HTTP API Gateway  
- DynamoDB single-table design  
- S3 for user profile photos  
- Resend for feedback email delivery

**Infrastructure:**  
- AWS CDK (TypeScript)  
- Automated provisioning of Cognito, API Gateway, S3, and DynamoDB  
- Environment-based configuration and outputs  
- Pay-per-request and dev-friendly removal policies

---

### Repository Structure
.github/
└─ workflows/ # CI/CD and build automation
cdk.out/ # CDK output artifacts (generated)
frontend/
└─ public/ # Static assets
└─ src/ # React application source
infra/
└─ bin/ # CDK app entrypoint
└─ lib/ # Infrastructure stack definitions
services/
└─ api/ # Lambda handlers for API endpoints
└─ lib/ # Shared backend utilities


---

### Overview

Echoes of Pharloom connects a user’s study sessions with structured feedback loops.  
- The **frontend** manages user sessions, audio ambience, streaks, and UI flows.  
- The **backend** handles persistence, authentication, and feedback routing.  
- The **infrastructure** provisions all cloud resources declaratively.

This architecture enables modular iteration across each layer while keeping deployment and data flow transparent for both developers and contributors.

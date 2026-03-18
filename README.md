# DIS Information Hub

A centralized, AI-powered information portal designed specifically for the DIS community. This platform serves as a "single source of truth," helping students and staff find instant, accurate answers to questions about school policies, handbooks, and administrative procedures.

## 🚀 Key Features

### 🔍 Intelligent Semantic Search
Unlike a standard keyword search, the Hub uses **Retrieval-Augmented Generation (RAG)** to understand the context of your questions. It searches through uploaded school documents (PDFs, policies, guides) and provides a synthesized answer with direct references to the source material.

### 📚 Managed Resource Library
A dedicated section to browse and download school documents. All resources are organized by category and are instantly searchable, ensuring you never have to "dig through emails" to find a handbook again.

### 🛡️ Secure Admin Dashboard
A workspace for school administrators to:
- **Upload & Index:** Easily add new school documents to the AI's knowledge base.
- **Manage Knowledge:** Review and update existing resources to ensure information remains current.
- **Analytics:** View common questions being asked to identify information gaps in the community.

### 🔐 Staff Access Workflows
A formal, secure system for staff members to request administrative privileges.
- **Request Portal:** Professional application form for staff justification.
- **Super-Admin Approval:** Direct oversight by the system owner (`osongfivestar@gmail.com`) to manage the admin team.
- **Automated Notifications:** Professional email alerts for request submissions and status updates.

### ⚖️ Built for Privacy & Transparency
Integrated with comprehensive legal documentation, including a Privacy Policy, Terms of Service, and a dedicated Privacy Rights Request system. The platform is designed with data transparency at its core.

## 🛠️ Tech Stack

- **Frontend & API:** [Next.js](https://nextjs.org/) (React)
- **Database & Auth:** [Supabase](https://supabase.com/) (PostgreSQL with `pgvector`)
- **AI/Embeddings:** [Hugging Face](https://huggingface.co/) (MiniLM-L6-v2)
- **Mail Service:** [Resend](https://resend.com/)
- **Compute:** [Puter.js](https://puter.com/)

---

## 🚀 Deployment

The DIS Information Hub is optimized for deployment on **Vercel**. Connect your GitHub repository to Vercel to enable automated CI/CD and production hosting.

### Configuration
Ensure the following environment variables are configured in your Vercel project settings:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SECRET_KEY`
- `HF_ACCESS_TOKEN`
- `RESEND_API_KEY`

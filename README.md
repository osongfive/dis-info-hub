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

## 🛠️ Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/osongfive/dis-info-hub.git
   cd dis-info-hub
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   Create a `.env.local` file with your Supabase, Hugging Face, and Resend credentials (refer to `.gitignore` to ensure these stay private).

4. **Run the development server:**
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

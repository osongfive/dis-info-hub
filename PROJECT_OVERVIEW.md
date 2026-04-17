# DIS Information Hub: Project Overview & Mission

## 🌟 Mission Statement
The **DIS Information Hub** is the definitive, AI-powered central intelligence portal for **Daegu International School (DIS)**. Its mission is to transform static school documents (handbooks, policies, schedules) into a dynamic, "living" knowledge base that provides the community with instant, accurate, and verifiable answers.

---

## 🎯 Core Purpose
In a complex educational environment, important information is often buried in lengthy PDFs or disparate emails. The Hub solves this by:
- **Centralizing Knowledge:** Aggregating Handbook, Academic Policies, and Conduct Rules into one interface.
- **Providing Instant Clarity:** Using AI to skip the "digging" and get straight to the answer.
- **Ensuring Accountability:** Every answer is sourced directly from an official document, with a path and preview provided for verification.

---

## 🚀 Key Features

### 1. AI-Powered "Ask a Question" (RAG)
Utilizing **Retrieval-Augmented Generation**, the platform understands natural language questions in both **English and Korean**.
- **Vector Search:** Queries are mapped to the school's knowledge base using high-dimensional embeddings.
- **Synthesized Answers:** The AI reads the relevant document passages and writes a clear, authoritative summary.
- **Multi-Session Tracking:** Users can manage multiple separate chat threads for different topics.

### 2. Managed Resource Library
A curated repository of all school documents, categorized and accessible for direct download.
- **Instant Previews:** Quick look at document metadata before opening.
- **Global Search:** Find documents by title or category.

### 3. Professional Admin Suite
A secure workspace where staff maintain the school's "Single Source of Truth."
- **One-Click Indexing:** Upload a PDF, and the AI automatically chunks, embeds, and learns its content.
- **Analytics:** Admins can monitor search trends to see what information the community is looking for most.
- **Access Control:** A tiered permission system (Users vs. Admins).

### 4. Staff Access Workflow
A formal application system for staff members to request administrative privileges, complete with:
- **Justification Form:** Staff provide their role and purpose.
- **Email Notifications:** Instant alerts to the system owner for new request reviews via Resend.

---

## 🛠️ Technical Architecture

### **The "Brain" (AI Layer)**
- **Embeddings:** HuggingFace `all-MiniLM-L6-v2` (384 dimensions) for semantic understanding.
- **LLM:** OpenAI `gpt-4o-mini` for response generation and synthesis.
- **Vector Storage:** Supabase `pgvector` for lightning-fast similarity searches.

### **The "Backbone" (Infrastructure)**
- **Framework:** [Next.js 16](https://nextjs.org/) (App Router) for a high-performance web experience.
- **Database/Auth:** [Supabase](https://supabase.com/) for secure user management and relational data.
- **File Storage:** Supabase Storage for hosting official PDFs.
- **Compute:** Localized and optimized Node.js API routes.

---

## 🛡️ Security & Privacy Standards

### **Hardened Security**
The platform's security architecture focuses on:
- **SSRF Mitigation:** Application-level validation on document processing URLs.
- **Rate Limiting:** Request throttling limits applied to API routes.
- **RBAC:** Middleware-enforced Role-Based Access Control on admin routes.
- **Security Headers:** Strict frame-ancestors and content type options.
- **Server-Side AI (Groq Smart Router):** The platform utilizes a triple-level guard model routing system on the server-side to guarantee zero third-party script vulnerabilities while preserving high-speed search completion.

### **Legal Compliance**
- **PIPA (Korea):** Built to comply with the Personal Information Protection Act.
- **COPPA:** Guidelines followed for the protection of student privacy within the US/International school context.
- **Transparency:** Integrated Privacy Policy and automated Privacy Rights Request system.

---

## 📈 Future Roadmap
- **Real-time Calendar Sync:** Automated integration with school events.
- **Voice Querying:** Accessibility features for hands-free information retrieval.
- **Parent Portal Integration:** Deep links into school management systems.

---
*Created with focus on speed, precision, and community trust. &copy; 2026 Daegu International School Information Hub.*

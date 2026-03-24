"use client";

import { Navbar } from "@/components/navbar";
import { PrivacyRightsForm } from "@/components/privacy-rights-form";

export default function PrivacyPage() {
  return (
    <div className="flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-16 max-w-4xl">
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Last Updated: March 2026</p>

          <div className="bg-muted/50 border border-border rounded-xl p-6 mb-12">
            <p className="text-sm leading-relaxed mb-0">
              <strong>Legal Notice:</strong> This document constitutes a comprehensive legal framework for the DIS Information Hub. It is drafted in compliance with Korea&apos;s Personal Information Protection Act (PIPA), the AI Basic Act, the Network Act, and COPPA.
            </p>
          </div>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-primary">1. Introduction, Identity of the Data Controller, and Scope</h2>
            <p>This Privacy Policy (&quot;Policy&quot;) is published by <strong>Daegu International School (&quot;DIS&quot;)</strong>, acting as the Data Controller for the DIS Information Hub (&quot;the Service&quot;). The Service is an AI-assisted search tool that enables students, parents, and staff to query official DIS documents using natural language and receive sourced answers.</p>
            <p>This Policy applies to all personal information processed in connection with the Service, regardless of access method. It is published in compliance with PIPA, the AI Basic Act, the Network Act, and COPPA.</p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-primary">2. Definitions</h2>
            <ul className="space-y-4">
              <li><strong>Personal Information:</strong> Any information that relates to an identified or identifiable natural person, including name, IP address, device identifiers, and query content.</li>
              <li><strong>Data Controller:</strong> Daegu International School — the entity that determines the purposes and means of processing.</li>
              <li><strong>Data Processor:</strong> Third-party entities that process data on behalf of DIS, including Supabase Inc. and HuggingFace Inc.</li>
              <li><strong>User:</strong> Any individual who accesses or uses the Service.</li>
              <li><strong>Minor Under 14:</strong> A user under 14 years of age, for whom parental or legal guardian consent is mandatory under Korean law.</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-primary">3. Legal Basis for Processing</h2>
            <p>The Service processes personal information on the following bases:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Consent (PIPA Art. 15(1)(1)):</strong> Explicit consent for identifiable information. For users under 14, guardian consent is required.</li>
              <li><strong>Legitimate Interests (PIPA Art. 15(1)(6)):</strong> Necessary for secure operation (server logs, IP recording).</li>
              <li><strong>Contract Performance:</strong> For DIS staff accessing administrative features.</li>
              <li><strong>Legal Obligation:</strong> Compliance with applicable laws or lawful requests from authorities.</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-primary">4. Personal Information We Collect</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border p-2 text-left">Category</th>
                    <th className="border border-border p-2 text-left">Data</th>
                    <th className="border border-border p-2 text-left">Purpose</th>
                    <th className="border border-border p-2 text-left">Retention</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-border p-2">Query Text</td>
                    <td className="border border-border p-2">Natural-language questions</td>
                    <td className="border border-border p-2">Generate AI response</td>
                    <td className="border border-border p-2">Up to 12 months</td>
                  </tr>
                  <tr>
                    <td className="border border-border p-2">IP Address</td>
                    <td className="border border-border p-2">Internet protocol address</td>
                    <td className="border border-border p-2">Security, abuse prevention</td>
                    <td className="border border-border p-2">90 days</td>
                  </tr>
                  <tr>
                    <td className="border border-border p-2">Session Data</td>
                    <td className="border border-border p-2">Timestamps, response times</td>
                    <td className="border border-border p-2">System performance</td>
                    <td className="border border-border p-2">30 days</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-primary">5. How We Use Personal Information</h2>
            <p>Information collected is used solely for:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Providing the Service:</strong> Processing queries to retrieve relevant document passages.</li>
              <li><strong>Anonymised Analytics:</strong> Identifying common questions to improve school documentation.</li>
              <li><strong>Security:</strong> Detecting abuse, prompt injection, and unauthorised access.</li>
              <li><strong>AI Transparency:</strong> Notifying users that AI is being used as required by the AI Basic Act.</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-primary">6. Overseas Data Transfers</h2>
            <p>DIS utilizes the following third-party processors located outside Korea:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Supabase Inc. (USA):</strong> Database, vector search, and file storage.</li>
              <li><strong>HuggingFace Inc. (USA):</strong> AI model inference.</li>
              <li><strong>Puter.js (USA/Cloud):</strong> Client-side AI processing.</li>
            </ul>
            <p className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg italic">
              Users are notified at the point of first use that query data may be processed by servers located in the United States.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-primary">7. Data Storage and Retention</h2>
            <p>Personal information is destroyed without delay once the purpose is fulfilled or the retention period expires:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Query records:</strong> Up to 12 months, then anonymised.</li>
              <li><strong>IP logs:</strong> 90 days.</li>
              <li><strong>Admin logs:</strong> 24 months for audit purposes.</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-primary">8. Children&apos;s Privacy</h2>
            <p>The DIS Information Hub is operated within a school environment and complies with PIPA Art. 22(6) and COPPA.</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Under 14:</strong> No personal information is collected without verifiable guardian consent.</li>
              <li><strong>Under 13 (COPPA):</strong> Principles are observed given DIS&apos;s affiliation with Lee Academy (USA).</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-primary">9. AI Transparency</h2>
            <p>As required by the AI Basic Act, users are notified that this service uses semantic search and natural language processing models. Labelled AI-generated responses enable independent verification.</p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-primary">10. Your Rights</h2>
            <p>Under PIPA, you have the right to access, rectify, erase, or suspend processing of your personal information. These rights may be exercised by contacting the Chief Privacy Officer.</p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-primary">11. Chief Privacy Officer and Contact</h2>
            <p>DIS has designated a Chief Privacy Officer (CPO) to oversee compliance:</p>
            <div className="bg-muted p-4 rounded-lg">
              <p className="mb-1"><strong>Email:</strong> info@dis.sc.kr</p>
              <p className="mb-1"><strong>Technical Support:</strong> 2029jalee@dis.sc.kr</p>
              <p className="mb-1"><strong>Phone:</strong> +82-53-980-2100</p>
              <p><strong>Address:</strong> 22, Palgong-ro 50-gil, Dong-gu, Daegu, 41021, Republic of Korea</p>
            </div>
          </section>

          <hr className="my-16 border-border" />

          <section id="rights-request" className="mb-24 scroll-mt-24">
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-bold mb-4">Privacy Rights Request</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Use the form below to exercise your rights under PIPA (Personal Information Protection Act). 
                Requests are processed by the DIS Chief Privacy Officer.
              </p>
            </div>
            
            <PrivacyRightsForm />
          </section>
        </div>
      </main>
    </div>
  );
}

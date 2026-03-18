import { Navbar } from "@/components/navbar";

export default function TermsPage() {
  return (
    <div className="flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-16 max-w-4xl">
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">Last Updated: March 2026</p>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-primary">1. Acceptance of Terms</h2>
            <p>These Terms of Service (&quot;Terms&quot;) constitute a legally binding agreement between you (&quot;User&quot;) and <strong>Daegu International School (&quot;DIS&quot;)</strong>. By accessing or using the Service, you agree to be bound by these Terms and the Privacy Policy.</p>
            <p>If you are a minor, these Terms must be read and accepted by a parent or legal guardian on your behalf.</p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-primary">2. Description of Service</h2>
            <p>The DIS Knowledge Hub is an AI-assisted document retrieval tool. It enables users to submit natural-language questions and receive answers sourced exclusively from official DIS documents.</p>
            <div className="bg-muted border-l-4 border-primary p-4 my-6">
              <p className="text-sm italic mb-0"><strong>Not a substitute for official communication:</strong> The Service is a convenience tool only. In any conflict between a Service response and official DIS communications, the official communication prevails.</p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-primary">3. Permitted Use</h2>
            <p>The Service is provided exclusively for:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Searching for information in official DIS school documents.</li>
              <li>Verifying DIS policies, rules, and schedules.</li>
              <li>Accessing source documents linked from search results.</li>
              <li>Authorized administrative management of the library.</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-primary">4. Prohibited Use</h2>
            <p>Users must not use the Service in any of the following ways:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Attempting to manipulate, bypass, or exploit the AI system (prompt injection).</li>
              <li>Unauthorized access to the administrator dashboard.</li>
              <li>Using automated scripts, bots, or scrapers to submit queries in bulk.</li>
              <li>Reverse engineering or attempting to extract the Service&apos;s source code.</li>
              <li>Using the Service for any form of academic dishonesty.</li>
              <li>Harassment, defamation, or threatening behavior through the interface.</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-primary">5. Intellectual Property Rights</h2>
            <p>All documents available through the Service are the intellectual property of DIS and/or Lee Academy. Access does not transfer any property rights. Users may access and print documents for personal, non-commercial use only.</p>
            <p>The software, design, and architecture of the DIS Knowledge Hub are the proprietary intellectual property of the Service operator.</p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-primary">6. AI Disclaimer and Reliance</h2>
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-6 my-6">
              <h3 className="text-amber-800 dark:text-amber-400 text-lg font-semibold mb-2">Read Carefully</h3>
              <p className="text-sm leading-relaxed mb-4">Reliance on Service outputs without independent verification is at the User&apos;s own risk.</p>
              <ul className="text-sm space-y-2">
                <li><strong>AI Limitations:</strong> AI systems can occasionally misinterpret questions or retrieve non-responsive passages.</li>
                <li><strong>Source Dependency:</strong> Outdated or missing documents will result in incomplete responses.</li>
                <li><strong>Not Professional Advice:</strong> Service outputs do not constitute legal, medical, or professional advice.</li>
              </ul>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-primary">7. Disclaimer of Warranties</h2>
            <p className="uppercase text-sm font-medium">The service is provided on an &quot;as is&quot; and &quot;as available&quot; basis without any warranties, express or implied.</p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-primary">8. Limitation of Liability</h2>
            <p>DIS, its officers, and agents shall not be liable for any indirect, incidental, or consequential damages arising from the use of or inability to use the Service, including AI inaccuracies or third-party service failures.</p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-primary">9. Governing Law</h2>
            <p>These Terms are governed by the laws of the Republic of Korea. Any disputes shall be referred to the competent courts of Daegu, Republic of Korea.</p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-primary">10. Contact Information</h2>
            <p>For questions regarding these Terms, please contact:</p>
            <p className="font-medium">Email: info@dis.sc.kr (attn: CPO)</p>
            <p className="font-medium italic text-primary/80">Technical Support: 2029jalee@dis.sc.kr</p>
          </section>
        </div>
      </main>
    </div>
  );
}

import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Users,
  FileText,
  Search,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";

const features = [
  {
    icon: Search,
    title: "AI-Powered Search",
    description:
      "Our advanced AI technology searches through all official school documents to find accurate answers to your questions instantly.",
  },
  {
    icon: FileText,
    title: "Verified Sources",
    description:
      "Every answer is backed by official school documents. We show you exactly which document and page the information came from.",
  },
  {
    icon: Shield,
    title: "Privacy First",
    description:
      "Your questions and searches are private. We prioritize the security and privacy of all students, parents, and staff.",
  },
  {
    icon: Users,
    title: "For Everyone",
    description:
      "Designed for students, parents, teachers, and administrators to quickly find the information they need about school policies.",
  },
];

const forStudents = [
  "Find graduation requirements quickly",
  "Learn about club activities and how to join",
  "Check exam schedules and academic policies",
  "Understand the dress code and conduct rules",
];

const forAdmins = [
  "Simple drag-and-drop document uploads",
  "Automatic document indexing",
  "Test questions to verify accuracy",
  "Analytics on most asked questions",
];

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-secondary/50 to-background px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              About School Knowledge Search
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground">
              We make it easy for students, parents, and staff to find accurate
              information from official school documents using AI-powered
              search.
            </p>
          </div>
        </section>

        {/* Features Grid */}
        <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                How It Works
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                Our platform combines official school documents with AI
                technology to provide fast, accurate answers.
              </p>
            </div>

            <div className="mt-12 grid gap-8 md:grid-cols-2">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="flex gap-4 rounded-xl border border-border bg-card p-6 shadow-sm"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="mb-2 text-lg font-semibold text-foreground">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* For Students & Admins */}
        <section className="bg-muted/30 px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-12 lg:grid-cols-2">
              {/* For Students */}
              <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
                <h3 className="mb-2 text-2xl font-bold text-foreground">
                  For Students & Parents
                </h3>
                <p className="mb-6 text-muted-foreground">
                  Get instant answers to your questions about school policies,
                  schedules, and requirements.
                </p>
                <ul className="mb-8 space-y-3">
                  {forStudents.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <span className="text-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/search">
                  <Button className="gap-2">
                    Start Searching
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>

              {/* For Admins */}
              <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
                <h3 className="mb-2 text-2xl font-bold text-foreground">
                  For Administrators
                </h3>
                <p className="mb-6 text-muted-foreground">
                  Easily manage school documents and keep information accessible
                  to your community.
                </p>
                <ul className="mb-8 space-y-3">
                  {forAdmins.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <span className="text-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/admin">
                  <Button variant="outline" className="gap-2">
                    Access Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Ready to get started?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Start searching through official school documents and get the
              information you need in seconds.
            </p>
            <div className="mt-8">
              <Link href="/search">
                <Button size="lg" className="gap-2">
                  Ask a Question
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

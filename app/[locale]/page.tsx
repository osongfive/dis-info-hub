import { Navbar } from "@/components/navbar";
import { SearchBar } from "@/components/search-bar";
import { Button } from "@/components/ui/button";
import {
  Zap,
  FileCheck,
  FolderSearch,
  ArrowRight,
  BookOpen,
  Calendar,
  Users,
  Award,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const exampleQuestions = [
  "When are final exams?",
  "How do I join a club?",
  "What are the graduation requirements?",
  "What is the late assignment policy?",
];

const features = [
  {
    icon: Zap,
    title: "Instant Answers",
    description:
      "AI searches official school documents and provides fast, accurate answers in seconds.",
  },
  {
    icon: FileCheck,
    title: "Verified Sources",
    description:
      "Every answer includes links to the document and page where the information was found.",
  },
  {
    icon: FolderSearch,
    title: "Organized Information",
    description:
      "Find policies, rules, and schedules faster than browsing through PDFs manually.",
  },
];

const commonQuestions = [
  {
    icon: BookOpen,
    question: "What books are required for AP History?",
    category: "Academics",
  },
  {
    icon: Calendar,
    question: "When is the next parent-teacher conference?",
    category: "Calendar",
  },
  {
    icon: Users,
    question: "How do I sign up for the robotics club?",
    category: "Clubs & Activities",
  },
  {
    icon: Award,
    question: "What GPA do I need for honor roll?",
    category: "Academics",
  },
  {
    icon: Calendar,
    question: "What time does school start and end?",
    category: "Schedule",
  },
  {
    icon: FileCheck,
    question: "What is the dress code policy?",
    category: "Policies",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section with School Image */}
        <section className="relative overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0 -z-10">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-TH2mD7vKTNapMxqdlTiQ68uglRp9g8.png"
              alt="Daegu International School Campus"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/85 to-background" />
          </div>

          <div className="px-4 pb-16 pt-20 sm:px-6 lg:px-8 lg:pb-24 lg:pt-28">
            <div className="mx-auto max-w-4xl text-center">
              <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Ask{" "}
                <span
                  className="relative inline-block font-[var(--font-accent)] text-primary"
                  style={{ fontFamily: 'var(--font-accent)' }}
                >
                  <span className="relative z-10">Anything</span>
                  <span className="absolute bottom-1 left-0 right-0 h-3 bg-primary/20 -rotate-1 rounded" />
                  <span className="absolute -bottom-1 left-1 right-1 h-0.5 bg-primary rounded-full" />
                </span>{" "}
                About DIS
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground sm:text-xl">
                Get instant, accurate answers from official school documents,
                handbooks, and policies. Powered by AI that searches through
                verified sources.
              </p>

              <div className="mx-auto mt-10 max-w-2xl">
                <SearchBar size="large" />
              </div>

              {/* Example Questions */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
                <span className="text-sm text-muted-foreground">Try asking:</span>
                {exampleQuestions.map((question) => (
                  <Link
                    key={question}
                    href={`/search?q=${encodeURIComponent(question)}`}
                    className="rounded-full border border-border bg-card/80 backdrop-blur-sm px-4 py-1.5 text-sm text-muted-foreground transition-all duration-300 ease-out hover:border-primary hover:bg-primary/10 hover:text-foreground hover:scale-105 hover:shadow-md"
                  >
                    {question}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 md:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="group relative rounded-2xl border border-border bg-card p-8 shadow-sm transition-all duration-300 ease-out hover:shadow-lg hover:scale-[1.02] hover:border-primary/50 hover:-translate-y-1"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-all duration-300 group-hover:bg-primary/20 group-hover:scale-110">
                    <feature.icon className="h-6 w-6 text-primary transition-transform duration-300 group-hover:scale-110" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground transition-colors duration-300 group-hover:text-primary">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Common Questions Section */}
        <section className="bg-muted/30 px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Common Questions Students Ask
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                Browse popular questions or ask your own. Every answer comes
                with source citations.
              </p>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {commonQuestions.map((item) => (
                <Link
                  key={item.question}
                  href={`/search?q=${encodeURIComponent(item.question)}`}
                  className="group flex items-start gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-300 ease-out hover:border-primary hover:shadow-lg hover:scale-[1.02] hover:-translate-y-1"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary transition-all duration-300 group-hover:bg-primary/20 group-hover:scale-110">
                    <item.icon className="h-5 w-5 text-muted-foreground transition-colors duration-300 group-hover:text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground transition-colors duration-300 group-hover:text-primary">
                      {item.question}
                    </p>
                    <span className="mt-1 inline-block text-sm text-muted-foreground">
                      {item.category}
                    </span>
                  </div>
                  <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-1" />
                </Link>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Link href="/search">
                <Button size="lg" className="gap-2 transition-all duration-300 hover:scale-105 hover:shadow-lg">
                  Ask Your Question
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Ready to find answers?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Start searching through official school documents and get the
              information you need in seconds.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link href="/search">
                <Button size="lg" className="gap-2 transition-all duration-300 hover:scale-105 hover:shadow-lg">
                  Start Searching
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/documents">
                <Button variant="outline" size="lg" className="transition-all duration-300 hover:scale-105 hover:shadow-md hover:border-primary hover:bg-primary/5">
                  Browse Documents
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

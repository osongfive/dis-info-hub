'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { User, Mail, FileText, ArrowLeft, CheckCircle2, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'

export default function RequestAdminPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [reason, setReason] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, reason }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to submit request')

      setIsSuccess(true)
      toast.success("Request submitted successfully!")
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="flex min-h-svh w-full flex-col items-center justify-center bg-muted/30 p-6 md:p-10">
        <div className="w-full max-w-md text-center">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-primary/10 p-4">
              <CheckCircle2 className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Request Received</h1>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Your application for admin access has been sent to the system administrator. 
            You will receive an email once your request has been reviewed.
          </p>
          <Link href="/auth/login" className="mt-8 inline-block">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center bg-muted/30 p-6 md:p-10">
      <Link
        href="/auth/login"
        className="absolute left-6 top-6 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Login
      </Link>
      
      <div className="w-full max-w-lg">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-TOKsutbVosrZUWb3zKaGAcLVX6jufQ.png"
            alt="Daegu International School"
            width={70}
            height={70}
            className="mb-4"
          />
          <h1 className="text-2xl font-bold text-foreground">Request Admin Access</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
            Apply for administrative privileges to manage school documents and AI search settings.
          </p>
        </div>

        <Card className="border-border shadow-xl overflow-hidden">
          <div className="bg-primary/5 border-b border-border p-4 flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-primary" />
            <p className="text-xs font-medium text-primary-foreground/80 dark:text-primary/90">
              Only authorized staff members should request access.
            </p>
          </div>
          <CardHeader>
            <CardTitle className="text-xl">Identification & Justification</CardTitle>
            <CardDescription>
              Please provide your full name and the reason for your request.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="name"
                      placeholder="Jane Doe"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Work Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="jdoe@dis.sc.kr"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Request</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Textarea
                    id="reason"
                    placeholder="E.g., I am the new department head and need to upload policy updates..."
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="pl-10 min-h-[120px] pt-2"
                  />
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full font-semibold h-11 transition-all hover:shadow-md" 
                disabled={isLoading}
              >
                {isLoading ? 'Submitting Application...' : 'Submit Application'}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <p className="mt-8 text-center text-[11px] text-muted-foreground leading-relaxed uppercase tracking-widest px-8">
          Requests are typically reviewed within 24-48 business hours by the system administrator.
        </p>
      </div>
    </div>
  )
}

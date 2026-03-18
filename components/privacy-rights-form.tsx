"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export function PrivacyRightsForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate sending to info@dis.sc.kr
    // In a real app, this would call an API route that uses Resend/Nodemailer/SendGrid
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setIsSubmitted(true);
      toast.success("Privacy request submitted successfully.");
    } catch (error) {
      toast.error("Failed to submit request. Please try again or email info@dis.sc.kr directly.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center dark:border-green-900/30 dark:bg-green-900/10">
        <h3 className="mb-2 text-xl font-bold text-green-800 dark:text-green-400">Request Received</h3>
        <p className="text-green-700 dark:text-green-500">
          Your request has been received. DIS will respond within 10 business days as per PIPA. For tech support: 2029jalee@dis.sc.kr.
        </p>
        <Button 
          variant="outline" 
          className="mt-6 border-green-200 text-green-700 hover:bg-green-100 dark:border-green-900/50 dark:text-green-400"
          onClick={() => setIsSubmitted(false)}
        >
          Submit Another Request
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input id="name" name="name" placeholder="John Doe" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input id="email" name="email" type="email" placeholder="john@example.com" required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="requestType">Request Type</Label>
        <Select name="requestType" required>
          <SelectTrigger>
            <SelectValue placeholder="Select a request type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="access">Access my data</SelectItem>
            <SelectItem value="correct">Correct my data</SelectItem>
            <SelectItem value="delete">Delete my data</SelectItem>
            <SelectItem value="suspend">Suspend processing of my data</SelectItem>
            <SelectItem value="withdraw">Withdraw consent</SelectItem>
            <SelectItem value="explanation">Request explanation of automated decision</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="details">Additional Details (Optional)</Label>
        <Textarea 
          id="details" 
          name="details" 
          placeholder="Please provide any additional information that may help us process your request..."
          className="min-h-[120px]"
        />
      </div>

      <div className="flex items-start space-x-3 space-y-0">
        <Checkbox id="confirm" required className="mt-1" />
        <Label htmlFor="confirm" className="text-sm font-normal leading-relaxed text-muted-foreground">
          I confirm I am the data subject or a legal guardian of the data subject making this request.
        </Label>
      </div>

      <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : "Submit Privacy Request"}
      </Button>
      
      <div className="mt-8 border-t border-border pt-6 text-[12px] text-muted-foreground leading-relaxed">
        <p>
          You may also contact the PIPC directly at <a href="https://www.pipc.go.kr" target="_blank" className="text-primary hover:underline">www.pipc.go.kr</a> 
          or the KISA Infringement Report Centre at <a href="https://privacy.kisa.or.kr" target="_blank" className="text-primary hover:underline">privacy.kisa.or.kr</a> 
          (Tel: 118).
        </p>
      </div>
    </form>
  );
}

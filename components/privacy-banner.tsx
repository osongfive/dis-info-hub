"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Shield } from "lucide-react";

export function PrivacyBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check sessionStorage to show once per session
    const hasSeenNotice = sessionStorage.getItem("dis-privacy-notice-seen");
    if (!hasSeenNotice) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem("dis-privacy-notice-seen", "true");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 z-[100] w-full border-t border-border bg-background/95 p-5 backdrop-blur-md shadow-[0_-10px_40px_rgba(0,0,0,0.1)] animate-in fade-in slide-in-from-bottom-full duration-700">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-3">
            <p className="text-[13px] leading-relaxed text-foreground">
              <span className="font-semibold text-primary/80 mr-1">[EN]</span>
              This service collects your search queries and IP address to generate responses and improve the service. 
              Your data may be processed on servers in the United States (Supabase, HuggingFace). 
              Queries are retained for up to 12 months. 
            </p>
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              <span className="font-semibold text-primary/60 mr-1">[KR]</span>
              본 서비스는 답변 생성 및 서비스 개선을 위해 검색 쿼리 및 IP 주소를 수집합니다. 
              귀하의 데이터는 미국의 서버(Supabase, HuggingFace)에서 처리될 수 있습니다. 
              쿼리는 최대 12개월 동안 보관됩니다. 
            </p>
          </div>
        </div>
        
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <Link href="/privacy" target="_blank">
            <Button variant="outline" size="sm" className="h-9 px-4 text-xs">
              Privacy Policy / 개인정보 처리방침
            </Button>
          </Link>
          <Button size="sm" onClick={handleDismiss} className="h-9 px-6 text-xs font-bold shadow-sm transition-all hover:scale-105 active:scale-95">
            Got it / 알겠습니다
          </Button>
        </div>
      </div>
    </div>
  );
}

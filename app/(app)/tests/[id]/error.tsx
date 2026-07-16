"use client";
import Link from "next/link";
import { WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
export default function TestError({ reset }: { reset(): void }) { return <main className="center-page"><Card className="setup-card"><CardHeader><WarningCircle size={24} /><h1>Results unavailable</h1><CardDescription>This test does not exist, you do not have access, or the result service is unavailable.</CardDescription></CardHeader><CardFooter className="gap-2"><Button variant="ghost" nativeButton={false} render={<Link href="/dashboard" />}>Dashboard</Button><Button variant="outline" onClick={reset}>Try again</Button></CardFooter></Card></main>; }

"use client";
import { WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
export default function DashboardError({ reset }: { reset(): void }) { return <main className="center-page"><Card className="setup-card"><CardHeader><WarningCircle size={24} /><h1>Dashboard unavailable</h1><CardDescription>We could not load your tests. Your data was not changed.</CardDescription></CardHeader><CardFooter><Button variant="outline" onClick={reset}>Try again</Button></CardFooter></Card></main>; }

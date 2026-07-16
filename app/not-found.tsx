import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
export default function NotFound() { return <main className="center-page"><Card className="setup-card"><CardHeader><p className="eyebrow">404</p><h1>Page not found</h1><CardDescription>The page may have moved or you may not have access.</CardDescription></CardHeader><CardContent /><CardFooter><Button variant="outline" nativeButton={false} render={<Link href="/dashboard" />}>Return to dashboard</Button></CardFooter></Card></main>; }

import Link from "next/link";
export default function AccessDenied() {
  return <main className="p-12 space-y-4"><h1 className="text-xl font-bold">Access denied</h1><p>Your account does not have permission to open this workspace.</p><Link href="/login">Return to sign in</Link></main>;
}

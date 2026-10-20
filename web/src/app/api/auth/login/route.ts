import { passwordAuth } from "@/lib/server/password-auth";
export async function POST(request: Request) { return passwordAuth(request); }

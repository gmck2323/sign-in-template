import { auth, currentUser } from '@clerk/nextjs/server';

export interface SignedInIdentity {
  userId?: string;
  email?: string;
}

// Attempts to extract the signed-in user's email from Clerk session claims.
// Falls back to fetching the current user if the claim isn't present.
export async function getSignedInEmail(): Promise<SignedInIdentity> {
  const { userId, sessionClaims } = await auth();

  // Try common claim names first
  let email: string | undefined = (sessionClaims?.email as string) 
    || ((sessionClaims as any)?.email_address as string)
    || (Array.isArray((sessionClaims as any)?.email_addresses)
      ? (sessionClaims as any).email_addresses[0]
      : undefined);

  // Fallback: fetch the current user to get their primary email address
  if (!email && userId) {
    try {
      const user = await currentUser();
      email = user?.primaryEmailAddress?.emailAddress 
        || user?.emailAddresses?.[0]?.emailAddress;
    } catch {
      // Ignore; we'll return without email if fetch fails
    }
  }

  return { userId: userId ?? undefined, email };
}

export default getSignedInEmail;



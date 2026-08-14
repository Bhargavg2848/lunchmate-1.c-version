import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';

export default function Auth() {
  return (
    <div className="auth-container">
      <SignedOut>
        <SignInButton mode="modal" />
      </SignedOut>
      <SignedIn>
        <UserButton />
      </SignedIn>
    </div>
  );
}

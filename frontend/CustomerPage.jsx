import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';

export default function CustomerPage() {
  return (
    <div style={{ padding: '20px' }}>
      <h2>Customer Portal</h2>
      <SignedOut>
        <p>Please sign in to view the menu and order lunch.</p>
        <SignInButton mode="modal" />
      </SignedOut>
      <SignedIn>
        <UserButton />
        <p>Welcome! Your lunch options are loading...</p>
      </SignedIn>
    </div>
  );
}

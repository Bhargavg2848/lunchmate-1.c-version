import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';

export default function CustomerPage() {
  return (
    <div style={{ padding: '20px' }}>
      <h2>Customer Portal</h2>
      <SignedOut>
        <p>Please sign in to view the menu and order lunch.</p>
        <SignInButton mode="modal">
          <button style={{ padding: '10px 20px', cursor: 'pointer', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px' }}>
            Sign In / Sign Up
          </button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <UserButton afterSignOutUrl="/" />
          <p>Welcome! Your lunch options are loading...</p>
        </div>
      </SignedIn>
    </div>
  );
}

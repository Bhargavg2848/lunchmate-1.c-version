import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';

export default function DeliveryPage() {
  return (
    <div style={{ padding: '20px' }}>
      <h2>Delivery Portal</h2>
      <SignedOut>
        <p>Delivery partners, please sign in.</p>
        <SignInButton mode="modal">
          <button style={{ padding: '10px 20px', cursor: 'pointer', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px' }}>
            Driver Sign In
          </button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
         <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <UserButton afterSignOutUrl="/" />
          <p>Active routes and pending deliveries will appear here.</p>
        </div>
      </SignedIn>
    </div>
  );
}

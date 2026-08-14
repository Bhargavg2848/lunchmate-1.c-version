import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';

export default function DeliveryPage() {
  return (
    <div style={{ padding: '20px' }}>
      <h2>Delivery Portal</h2>
      <SignedOut>
        <p>Delivery partners, please sign in.</p>
        <SignInButton mode="modal" />
      </SignedOut>
      <SignedIn>
        <UserButton />
        <p>Active routes and pending deliveries will appear here.</p>
      </SignedIn>
    </div>
  );
}

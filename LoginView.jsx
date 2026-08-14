import { SignedIn, SignedOut, SignIn, UserButton } from '@clerk/clerk-react';

export default function LoginView() {
  return (
    <div className="login-view-container">
      <SignedOut>
        <SignIn routing="path" path="/sign-in" />
      </SignedOut>
      <SignedIn>
        <p>Welcome back to the Customer Portal!</p>
        <UserButton />
      </SignedIn>
    </div>
  );
}

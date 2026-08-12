import { SignUp } from "@clerk/clerk-react";

const Signup = () => {
  return (
    <div className="min-h-screen flex justify-center items-center">
      <SignUp path="/sign-up" signInUrl="/sign-in"   redirectUrl='/dashboard'/>
    </div>
  );
};

export default Signup;

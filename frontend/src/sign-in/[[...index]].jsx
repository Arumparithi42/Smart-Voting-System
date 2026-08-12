import { SignIn } from "@clerk/clerk-react";
import { useTheme } from "../components/ui/theme-provider";
import { dark } from '@clerk/themes';

const Signin = () => {
  const { theme } = useTheme();

  return (
    <div className="min-h-screen flex justify-center items-center">
      <SignIn 
        path="/sign-in" 
        signUpUrl="/sign-up"
        forceRedirectUrl="/dashboard"
        signInUrl="/sign-in"
        appearance={{
          baseTheme: theme === 'dark' ? dark : undefined,
          variables: { colorPrimary: theme === 'dark' ? 'white' : 'black' }
        }}
      />
    </div>
  );
};

export default Signin;
'use client';

import React from 'react';
import Login from './Login';

const LoginDemo: React.FC = () => {
  const handleLogin = (email: string, password: string) => {
    console.log('Login attempt:', { email, password });
    // Handle login logic here
  };

  const handleGoogleLogin = () => {
    console.log('Google login clicked');
    // Handle Google login logic here
  };

  const handleSignUp = () => {
    console.log('Sign up clicked');
    // Navigate to sign up page
  };

  const handleForgotPassword = () => {
    console.log('Forgot password clicked');
    // Navigate to forgot password page
  };

  return (
    <div style={{ margin: 0, padding: 0, height: '100vh' }}>
      <Login
        onLogin={handleLogin}
        onGoogleLogin={handleGoogleLogin}
        onSignUp={handleSignUp}
        onForgotPassword={handleForgotPassword}
      />
    </div>
  );
};

export default LoginDemo;

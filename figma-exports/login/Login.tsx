'use client';

import React, { useState } from 'react';
import styles from './Login.module.css';

export interface LoginProps {
  className?: string;
  onLogin?: (email: string, password: string) => void;
  onGoogleLogin?: () => void;
  onSignUp?: () => void;
  onForgotPassword?: () => void;
}

const Login: React.FC<LoginProps> = ({ 
  className,
  onLogin,
  onGoogleLogin,
  onSignUp,
  onForgotPassword
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onLogin) {
      onLogin(email, password);
    }
  };

  return (
    <div className={`${styles.loginContainer} ${className || ''}`}>
      {/* Background */}
      <div className={styles.background}>
        {/* Logo Section */}
        <div className={styles.logoSection}>
          <div className={styles.logo}>
            {/* SVG Logo placeholder - replace with actual logo */}
            <div className={styles.logoPlaceholder}>
              <span className={styles.logoText}>Happy Dreamers</span>
            </div>
          </div>
        </div>
      </div>

      {/* Login Form Container */}
      <div className={styles.formContainer}>
        <div className={styles.formCard}>
          {/* Header */}
          <div className={styles.formHeader}>
            <h1 className={styles.welcomeTitle}>Welcome Back!</h1>
            <p className={styles.welcomeSubtitle}>We missed you! Please enter your details.</p>
          </div>

          {/* Form */}
          <form className={styles.form} onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="email">
                Email
              </label>
              <div className={styles.inputContainer}>
                <input
                  type="email"
                  id="email"
                  className={styles.input}
                  placeholder="Enter your Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="off"
                  data-form-type="other"
                  data-lpignore="true"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className={styles.fieldGroup}>
              <div className={styles.passwordLabelContainer}>
                <label className={styles.label} htmlFor="password">
                  Password
                </label>
              </div>
              <div className={styles.passwordInputContainer}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  className={styles.input}
                  placeholder="Enter Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  data-form-type="other"
                  data-lpignore="true"
                  required
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <svg 
                    width="20" 
                    height="16" 
                    viewBox="0 0 20 16" 
                    fill="none"
                    className={styles.eyeIcon}
                  >
                    {showPassword ? (
                      // Eye open icon
                      <path 
                        d="M10 3C5.5 3 1.73 5.61 0 9.5C1.73 13.39 5.5 16 10 16C14.5 16 18.27 13.39 20 9.5C18.27 5.61 14.5 3 10 3ZM10 14C7.24 14 5 11.76 5 9.5C5 7.24 7.24 5 10 5C12.76 5 15 7.24 15 9.5C15 11.76 12.76 14 10 14ZM10 7C8.34 7 7 8.34 7 9.5C7 10.66 8.34 12 10 12C11.66 12 13 10.66 13 9.5C13 8.34 11.66 7 10 7Z" 
                        fill="#9CA3AF"
                      />
                    ) : (
                      // Eye closed icon
                      <path 
                        d="M10 7C8.34 7 7 8.34 7 9.5C7 10.66 8.34 12 10 12C11.66 12 13 10.66 13 9.5M10 3C14.5 3 18.27 5.61 20 9.5C18.73 11.39 16.5 13.04 13.75 14M10 3C5.5 3 1.73 5.61 0 9.5C1.27 11.39 3.5 13.04 6.25 14M3 3L17 17" 
                        stroke="#9CA3AF" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      />
                    )}
                  </svg>
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className={styles.optionsRow}>
              <div className={styles.rememberMe}>
                <input
                  type="checkbox"
                  id="remember"
                  className={styles.checkbox}
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label htmlFor="remember" className={styles.checkboxLabel}>
                  Remember me
                </label>
              </div>
              <button
                type="button"
                className={styles.forgotPassword}
                onClick={onForgotPassword}
              >
                Forgot password?
              </button>
            </div>

            {/* Submit Buttons */}
            <div className={styles.buttonGroup}>
              <button type="submit" className={styles.signInButton}>
                Sign in
              </button>
              <button
                type="button"
                className={styles.googleButton}
                onClick={onGoogleLogin}
              >
                Sign in with Google
              </button>
            </div>
          </form>

          {/* Sign Up Link */}
          <div className={styles.signUpPrompt}>
            <span className={styles.signUpText}>Don't have an account?</span>
            <button
              type="button"
              className={styles.signUpLink}
              onClick={onSignUp}
            >
              Sign up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

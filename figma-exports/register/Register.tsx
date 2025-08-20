"use client"

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Eye, EyeOff, User, Mail, Lock, ArrowLeft } from 'lucide-react'

interface RegisterProps {
  className?: string
}

export function Register({ className = "" }: RegisterProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission
    console.log('Form submitted:', formData)
  }

  return (
    <div className={`min-h-screen flex ${className}`} style={{
      background: 'linear-gradient(135deg, #68A1C8 50%, #3993D1 100%)'
    }}>
      {/* Left side - Logo and decorative elements */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Happy Dreamers Logo */}
          <div className="text-center">
            <div className="mb-8">
              {/* Logo placeholder - you can replace with actual logo */}
              <div className="w-64 h-32 mx-auto bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-white text-2xl font-bold">HAPPY DREAMERS</span>
              </div>
            </div>
            {/* Decorative circles and shapes could go here */}
          </div>
        </div>
      </div>

      {/* Right side - Registration form */}
      <div className="flex-1 lg:max-w-md xl:max-w-lg flex items-center justify-center p-6 lg:p-8">
        <div className="w-full max-w-md">
          {/* Back button */}
          <div className="mb-6 lg:hidden">
            <Button variant="ghost" className="text-white/90 hover:text-white p-0">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Home page
            </Button>
          </div>

          {/* Registration Card */}
          <div className="bg-[#EFFFFF] rounded-[20px] p-6 lg:p-8 shadow-lg">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-[#68A1C8] mb-2" style={{ fontFamily: 'Ludicrous, sans-serif' }}>
                Create Your Account
              </h1>
              <p className="text-[#6B7280] text-sm" style={{ fontFamily: 'Century Gothic, sans-serif' }}>
                Join us and tracking your sleep better!
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-[#374151] mb-2" style={{ fontFamily: 'Century Gothic, sans-serif' }}>
                  Full Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    className="w-full bg-[#DEF1F1] border-0 rounded-xl px-10 py-3 text-sm placeholder-[#ADAEBC] focus:outline-none focus:ring-2 focus:ring-[#68A1C8]"
                    style={{ fontFamily: 'Century Gothic, sans-serif' }}
                    required
                  />
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#374151] mb-2" style={{ fontFamily: 'Century Gothic, sans-serif' }}>
                  Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email"
                    className="w-full bg-[#DEF1F1] border-0 rounded-xl px-10 py-3 text-sm placeholder-[#ADAEBC] focus:outline-none focus:ring-2 focus:ring-[#68A1C8]"
                    style={{ fontFamily: 'Century Gothic, sans-serif' }}
                    required
                  />
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[#374151] mb-2" style={{ fontFamily: 'Century Gothic, sans-serif' }}>
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Create a password"
                    className="w-full bg-[#DEF1F1] border-0 rounded-xl px-10 py-3 text-sm placeholder-[#ADAEBC] focus:outline-none focus:ring-2 focus:ring-[#68A1C8]"
                    style={{ fontFamily: 'Century Gothic, sans-serif' }}
                    required
                  />
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#9CA3AF] hover:text-[#68A1C8]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#374151] mb-2" style={{ fontFamily: 'Century Gothic, sans-serif' }}>
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirm your password"
                    className="w-full bg-[#DEF1F1] border-0 rounded-xl px-10 py-3 text-sm placeholder-[#ADAEBC] focus:outline-none focus:ring-2 focus:ring-[#68A1C8]"
                    style={{ fontFamily: 'Century Gothic, sans-serif' }}
                    required
                  />
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#9CA3AF] hover:text-[#68A1C8]"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Terms checkbox */}
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="acceptTerms"
                  name="acceptTerms"
                  checked={formData.acceptTerms}
                  onChange={handleInputChange}
                  className="mt-1 w-4 h-4 border border-gray-300 rounded focus:ring-[#68A1C8] focus:ring-2"
                  required
                />
                <label htmlFor="acceptTerms" className="text-xs text-[#4B5563] leading-relaxed" style={{ fontFamily: 'Century Gothic, sans-serif' }}>
                  I agree to the{' '}
                  <a href="#" className="text-[#68A1C8] hover:underline">Terms of Service</a>
                  {' '}and{' '}
                  <a href="#" className="text-[#68A1C8] hover:underline">Privacy Policy</a>
                </label>
              </div>

              {/* Submit buttons */}
              <div className="space-y-3">
                <Button
                  type="submit"
                  disabled={!formData.acceptTerms}
                  className="w-full bg-[#68A1C8] hover:bg-[#5a91b8] text-white font-medium py-3 rounded-xl transition-colors"
                  style={{ fontFamily: 'Century Gothic, sans-serif' }}
                >
                  Create Account
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-[#A0D8D0] hover:bg-[#90c8c0] text-[#EBFFFC] border-0 font-medium py-3 rounded-xl transition-colors"
                  style={{ fontFamily: 'Century Gothic, sans-serif' }}
                >
                  Sign up with Google
                </Button>
              </div>
            </form>

            {/* Footer */}
            <div className="text-center mt-6">
              <p className="text-sm text-[#6B7280]" style={{ fontFamily: 'Century Gothic, sans-serif' }}>
                Already have an account?{' '}
                <a href="#" className="text-[#68A1C8] hover:underline font-medium">
                  Sign in
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register

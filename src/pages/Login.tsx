import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

const demoAccounts = [
  {
    label: 'Administrator',
    email: 'admin@vitacare.com',
    password: 'admin123',
    role: 'admin' as UserRole,
  },
  {
    label: 'Doctor',
    email: 'doctor@vitacare.com',
    password: 'doctor123',
    role: 'doctor' as UserRole,
  },
  {
    label: 'Staff',
    email: 'staff@vitacare.com',
    password: 'staff123',
    role: 'staff' as UserRole,
  },
  {
    label: 'Lab Technician',
    email: 'lab@vitacare.com',
    password: 'lab123',
    role: 'lab' as UserRole,
  },
  {
    label: 'Pharmacist',
    email: 'pharmacist@vitacare.com',
    password: 'pharma123',
    role: 'pharmacist' as UserRole,
  },
];

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('staff');
  const [isLoading, setIsLoading] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [autoLoginTriggered, setAutoLoginTriggered] = useState(false);

  const { login, resetPassword, authState } = useAuth();
  const { error } = authState;

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password, role);
    } finally {
      setIsLoading(false);
      setAutoLoginTriggered(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const success = await resetPassword(resetEmail);
      if (success) setResetSuccess(true);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleResetForm = () => {
    setShowResetForm(!showResetForm);
    setResetSuccess(false);
  };

  // When demo credentials are filled and autoLoginTriggered is true, call login automatically
  useEffect(() => {
    if (autoLoginTriggered) {
      handleLogin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoginTriggered]);

  const handleDemoLoginClick = (demo: typeof demoAccounts[0]) => {
    setEmail(demo.email);
    setPassword(demo.password);
    setRole(demo.role);
    setAutoLoginTriggered(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-medical-blue p-4">
      <div className="w-full max-w-md">
        {!showResetForm ? (
          <Card className="w-full">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center">
                Hospital Management System
              </CardTitle>
              <CardDescription className="text-center">
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin}>
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={role}
                      onValueChange={(value) => setRole(value as UserRole)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrator</SelectItem>
                        <SelectItem value="doctor">Doctor</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="lab">Lab Technician</SelectItem>
                        <SelectItem value="pharmacist">Pharmacist</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <button
                        type="button"
                        onClick={toggleResetForm}
                        className="text-sm text-medical-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </div>
              </form>

              {/* Demo accounts buttons */}
              <div className="mt-8">
                <p className="mb-2 font-semibold text-center">Demo Accounts (click to login):</p>
                <div className="grid grid-cols-1 gap-2">
                  {demoAccounts.map((demo) => (
                    <Button
                      key={demo.email}
                      variant="outline"
                      className="w-full"
                      onClick={() => handleDemoLoginClick(demo)}
                      disabled={isLoading}
                    >
                      {demo.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <p className="text-xs text-gray-500 text-center w-full">
                By signing in, you agree to our Terms of Service and Privacy Policy.
              </p>
            </CardFooter>
          </Card>
        ) : (
          <Card className="w-full">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Reset Password</CardTitle>
              <CardDescription>
                Enter your email address and we'll send you a link to reset your password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {resetSuccess ? (
                <div className="space-y-4">
                  <Alert className="bg-green-50 border-green-200">
                    <AlertDescription className="text-green-800">
                      If an account exists with this email, you will receive password reset
                      instructions.
                    </AlertDescription>
                  </Alert>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={toggleResetForm}
                  >
                    Back to Login
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  {error && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="name@example.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex flex-col space-y-2">
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? 'Sending...' : 'Send Reset Link'}
                    </Button>
                    <Button type="button" variant="outline" onClick={toggleResetForm}>
                      Back to Login
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Login;

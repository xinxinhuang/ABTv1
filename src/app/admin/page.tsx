'use client';

import { useState, useEffect } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';

export default function AdminPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get the current user's ID
    fetch('/api/admin/get-user-id')
      .then(res => res.json())
      .then(data => {
        if (data.userId) {
          setUserId(data.userId);
          setEmail(data.email);
        }
      })
      .catch(err => {
        console.error('Error fetching user ID:', err);
        setError('Failed to fetch user ID. Please make sure you are logged in.');
      });
  }, []);

  const emptyCollection = async () => {
    if (!userId) return;
    
    setLoading(true);
    setMessage(null);
    setError(null);
    
    try {
      const response = await fetch(`/api/admin/empty-collection?userId=${userId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage(data.message || 'Card collection emptied successfully.');
      } else {
        setError(data.error || 'Failed to empty card collection.');
      }
    } catch (err) {
      console.error('Error emptying collection:', err);
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content-height">
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Admin Tools</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>User Information</CardTitle>
          <CardDescription>Current logged in user details</CardDescription>
        </CardHeader>
        <CardContent>
          <p><strong>User ID:</strong> {userId || 'Loading...'}</p>
          <p><strong>Email:</strong> {email || 'Loading...'}</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Card Collection Management</CardTitle>
          <CardDescription>Empty the card collection for the current user</CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={emptyCollection} 
            disabled={loading || !userId}
            variant="destructive"
          >
            {loading ? 'Processing...' : 'Empty Card Collection'}
          </Button>
          
          {message && (
            <Alert className="mt-4 bg-green-50 border-green-500">
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
          
          {error && (
            <Alert className="mt-4 bg-red-50 border-red-500">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

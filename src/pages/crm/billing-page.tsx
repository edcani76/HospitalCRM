import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Plus, Eye, FileText, X, Loader2 } from 'lucide-react';
import { fetchInvoices, fetchPets, fetchUsers } from '../../lib/firestore-helpers';
import { collection, addDoc, serverTimestamp, db } from '../../firebase';

export default function BillingPage() {
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [pets, setPets] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    petId: '',
    clientUid: '',
    description: '',
    amount: 0,
    status: 'active',
    dueDate: '',
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [invoicesData, petsData] = await Promise.all([
          fetchInvoices(),
          fetchPets()
        ]);
        setBills(invoicesData);
        setPets(petsData);
      } catch (error) {
        console.error('Error loading billing data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSubmit = async () => {
    try {
      const pet = pets.find(p => p.id === formData.petId);
      const newInvoice = {
        petId: formData.petId,
        petName: pet ? pet.name : 'Unknown',
        clientUid: formData.clientUid,
        amount: parseFloat(formData.amount.toString()) || 0,
        status: formData.status,
        date: new Date().toISOString().split('T')[0],
        dueDate: formData.dueDate,
        description: formData.description,
        createdAt: serverTimestamp(),
      };
      
      const docRef = await addDoc(collection(db, 'invoices'), newInvoice);
      setBills(prev => [...prev, { ...newInvoice, id: docRef.id }]);
      setIsAddDialogOpen(false);
      setFormData({ petId: '', clientUid: '', description: '', amount: 0, status: 'active', dueDate: '' });
    } catch (error) {
      console.error('Error creating invoice:', error);
    }
  };

  const handleView = (bill: any) => {
    setSelectedBill(bill);
    setIsViewDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const paidCount = bills.filter(b => b.status === 'paid').length;
  const pendingCount = bills.filter(b => b.status === 'active').length;
  const totalRevenue = bills.reduce((sum, b) => sum + (b.amount || 0), 0);

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Billing</h1>
          <p className="text-muted-foreground">Manage invoices and payments</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Invoice</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Pet</Label>
                <Select value={formData.petId} onValueChange={(value) => {
                  const pet = pets.find(p => p.id === value);
                  setFormData({ ...formData, petId: value, clientUid: pet?.ownerUid || '' });
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select pet" />
                  </SelectTrigger>
                  <SelectContent>
                    {pets.map(pet => (
                      <SelectItem key={pet.id} value={pet.id}>{pet.name} ({pet.species})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea 
                  value={formData.description} 
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Invoice description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Amount (₱)</Label>
                  <Input 
                    type="number" 
                    value={formData.amount} 
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Due Date</Label>
                  <Input 
                    type="date" 
                    value={formData.dueDate} 
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSubmit} className="w-full">Create Invoice</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-5 h-5 text-blue-600" />
              Total Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{bills.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-5 h-5 text-green-600" />
              Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{paidCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-5 h-5 text-yellow-600" />
              Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-3">
            {bills.map((bill) => (
              <div key={bill.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-4">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{bill.petName || 'Unknown Pet'}</p>
                    <p className="text-sm text-muted-foreground">{bill.description || 'No description'}</p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-4">
                  <div>
                    <p className="font-bold">₱{bill.amount?.toFixed(2) || '0.00'}</p>
                    <p className="text-sm text-muted-foreground">{bill.date}</p>
                  </div>
                  <Badge variant={bill.status === 'paid' ? 'success' : 'warning'}>
                    {bill.status}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => handleView(bill)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
          </DialogHeader>
          {selectedBill && (
            <div className="space-y-4 py-4">
              <div>
                <p className="text-sm text-muted-foreground">Pet</p>
                <p className="font-medium">{selectedBill.petName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="font-medium">{selectedBill.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-bold text-lg">₱{selectedBill.amount?.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={selectedBill.status === 'paid' ? 'success' : 'warning'}>
                    {selectedBill.status}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-medium">{selectedBill.date}</p>
              </div>
              {selectedBill.dueDate && (
                <div>
                  <p className="text-sm text-muted-foreground">Due Date</p>
                  <p className="font-medium">{selectedBill.dueDate}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

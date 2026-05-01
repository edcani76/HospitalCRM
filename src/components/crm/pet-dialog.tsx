import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { Input } from '../../components/ui/input'

interface PetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'add' | 'edit';
  pet?: any | null;
  users?: { [uid: string]: any };
  onSubmit: (formData: any) => void;
  onCancel: () => void;
}

export default function PetDialog({ open, onOpenChange, mode, pet, users = {}, onSubmit, onCancel }: PetDialogProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onSubmit({
      name: formData.get('name'),
      species: formData.get('species'),
      breed: formData.get('breed'),
      weight: parseFloat(formData.get('weight') as string) || 0,
      dateOfBirth: formData.get('dob'),
      gender: formData.get('gender'),
      bloodType: formData.get('bloodType'),
      color: formData.get('color'),
      ownerUid: mode === 'edit' ? pet?.ownerUid : formData.get('ownerUid'),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {mode === 'add' ? 'Register New Patient' : 'Edit Patient Record'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'add' 
              ? 'Fill out the profile for a new animal and its primary owner.' 
              : `Update the clinical profile for ${pet?.name}.`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Pet Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Activity className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="font-bold text-gray-900">Pet Information</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="font-bold text-gray-700">Pet Name</Label>
                <Input 
                  id="name" 
                  name="name" 
                  defaultValue={mode === 'edit' ? pet?.name : ''} 
                  className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white h-12" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="species" className="font-bold text-gray-700">Species</Label>
                <Input 
                  id="species" 
                  name="species" 
                  defaultValue={mode === 'edit' ? pet?.species : ''} 
                  className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white h-12" 
                  required 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="breed" className="font-bold text-gray-700">Breed</Label>
                <Input 
                  id="breed" 
                  name="breed" 
                  defaultValue={mode === 'edit' ? pet?.breed : ''} 
                  className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white h-12" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gender" className="font-bold text-gray-700">Gender</Label>
                  <select 
                    id="gender" 
                    name="gender" 
                    defaultValue={mode === 'edit' ? pet?.gender : ''}
                    className="rounded-xl border border-gray-100 bg-gray-50 focus:bg-white h-10 px-3 w-full"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bloodType" className="font-bold text-gray-700">Blood Type</Label>
                  <Input 
                    id="bloodType" 
                    name="bloodType" 
                    defaultValue={mode === 'edit' ? pet?.bloodType : ''} 
                    className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white h-12" 
                    placeholder="DEA 1.1+"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dob" className="font-bold text-gray-700">Date of Birth</Label>
                <Input 
                  id="dob" 
                  name="dob" 
                  type="date"
                  defaultValue={mode === 'edit' ? pet?.dateOfBirth : ''} 
                  className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white h-12" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color" className="font-bold text-gray-700">Coat Color</Label>
                <Input 
                  id="color" 
                  name="color" 
                  defaultValue={mode === 'edit' ? pet?.color : ''} 
                  className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white h-12" 
                  placeholder="e.g., Golden, Black"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weight" className="font-bold text-gray-700">Weight (kg)</Label>
                <Input 
                  id="weight" 
                  name="weight" 
                  type="number" 
                  step="0.1" 
                  min="0"
                  defaultValue={mode === 'edit' ? pet?.weight : ''} 
                  className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white h-12" 
                  placeholder="0.0" 
                />
              </div>
            </div>
          </div>

          {/* Owner Information (Add mode only) */}
          {mode === 'add' && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                  <User className="w-4 h-4 text-orange-600" />
                </div>
                <h3 className="font-bold text-gray-900">Owner & Contact Details</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="owner" className="font-bold text-gray-700">Owner Name</Label>
                  <Input 
                    id="owner" 
                    name="owner" 
                    className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white h-12" 
                    placeholder="John Smith" 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact" className="font-bold text-gray-700">Phone Number</Label>
                  <Input 
                    id="contact" 
                    name="contact" 
                    className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white h-12" 
                    placeholder="(555) 000-0000" 
                    required 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="font-bold text-gray-700">Email Address</Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white h-12" 
                  placeholder="owner@example.com" 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="font-bold text-gray-700">Home Address</Label>
                <Input 
                  id="address" 
                  name="address" 
                  className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white h-12" 
                  placeholder="123 Main St, City, State" 
                />
              </div>
            </div>
          )}

          <DialogFooter className="pt-4 flex gap-3 border-t border-gray-50">
            <Button type="button" variant="ghost" onClick={onCancel} className="rounded-xl h-12 px-6 font-bold">Cancel</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-12 px-8 font-bold shadow-lg shadow-blue-100">
              {mode === 'add' ? 'Create Record' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import React, { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { Input } from '../../components/ui/input'
import { Activity, User, ChevronDown, X, Search } from 'lucide-react'

// Common species list
const SPECIES_OPTIONS = [
  'Canine (Dog)',
  'Feline (Cat)',
  'Avian (Bird)',
  'Reptile',
  'Rabbit',
  'Hamster',
  'Guinea Pig',
  'Ferret',
  'Fish',
  'Other'
]

// Common breeds by species
const BREEDS_BY_SPECIES: { [key: string]: string[] } = {
  'Canine (Dog)': [
    'Golden Retriever', 'Labrador Retriever', 'German Shepherd', 'Bulldog', 'Beagle',
    'Poodle', 'Rottweiler', 'Yorkshire Terrier', 'Boxer', 'Dachshund',
    'Siberian Husky', 'Great Dane', 'Doberman', 'Shih Tzu', 'Chihuahua',
    'Pug', 'Border Collie', 'Australian Shepherd', 'Corgi', 'Other'
  ],
  'Feline (Cat)': [
    'Siamese', 'Persian', 'Maine Coon', 'Ragdoll', 'Bengal',
    'British Shorthair', 'Abyssinian', 'Birman', 'Oriental', 'Sphynx',
    'Scottish Fold', 'American Shorthair', 'Exotic Shorthair', 'Norwegian Forest', 'Other'
  ],
  'Avian (Bird)': [
    'Parrot', 'Canary', 'Finch', 'Cockatiel', 'Lovebird',
    'Budgerigar', 'African Grey', 'Macaw', 'Cockatoo', 'Other'
  ],
  'Reptile': [
    'Bearded Dragon', 'Leopard Gecko', 'Iguana', 'Ball Python', 'Corn Snake',
    'Turtle', 'Tortoise', 'Chameleon', 'Other'
  ],
  'Rabbit': [
    'Holland Lop', 'Netherland Dwarf', 'Mini Rex', 'Lionhead', 'Flemish Giant',
    'English Lop', 'Dutch', 'Other'
  ],
  'Hamster': [
    'Syrian', 'Dwarf Campbell', 'Winter White', 'Roborovski', 'Chinese', 'Other'
  ],
  'Guinea Pig': [
    'American', 'Abyssinian', 'Peruvian', 'Silkie', 'Teddy', 'Other'
  ],
  'Ferret': [
    'Standard', 'Angora', 'Other'
  ],
  'Fish': [
    'Goldfish', 'Betta', 'Guppy', 'Angelfish', 'Neon Tetra', 'Other'
  ]
}

interface SearchableSelectProps {
  label: string;
  options: string[];
  value: string;
  customValue: string;
  placeholder?: string;
  onSelect: (value: string) => void;
  onCustomChange: (value: string) => void;
  required?: boolean;
}

function SearchableSelect({ label, options, value, customValue, placeholder = "Type or select...", onSelect, onCustomChange, required = false }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isOther, setIsOther] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Check if current value is "Other" or custom
  useEffect(() => {
    if (value === 'Other') {
      setIsOther(true)
    } else if (value && !options.includes(value)) {
      setIsOther(true)
      onCustomChange(value)
    }
  }, [value])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSelect = (option: string) => {
    if (option === 'Other') {
      setIsOther(true)
      onSelect('Other')
    } else {
      setIsOther(false)
      onCustomChange('')
      onSelect(option)
    }
    setSearchTerm('')
    setIsOpen(false)
  }

  const displayValue = isOther ? customValue : value

  return (
    <div className="space-y-2">
      <Label className="font-bold text-gray-700">{label}</Label>
      <div className="relative" ref={wrapperRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={isOpen ? searchTerm : displayValue}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              if (!isOpen) setIsOpen(true)
              if (isOther) {
                onCustomChange(e.target.value)
              } else {
                onSelect(e.target.value)
              }
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className="w-full pl-10 pr-10 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white h-12 text-sm"
            required={required}
          />
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <div
                  key={option}
                  onClick={() => handleSelect(option)}
                  className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer text-sm transition-colors"
                >
                  {option}
                </div>
              ))
            ) : (
              <div className="px-4 py-2.5 text-sm text-gray-400">
                No matches found
              </div>
            )}
          </div>
        )}

        {isOther && (
          <div className="mt-2">
            <Input
              placeholder={`Enter ${label.toLowerCase()}`}
              value={customValue}
              onChange={(e) => onCustomChange(e.target.value)}
              className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white h-12"
              required={required}
            />
          </div>
        )}
      </div>
    </div>
  )
}

interface PetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'add' | 'edit';
  pet?: any | null;
  users?: { [uid: string]: any };
  onSubmit: (formData: any) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function PetDialog({ open, onOpenChange, mode, pet, users = {}, onSubmit, onCancel, isSubmitting = false }: PetDialogProps) {
  const [selectedSpecies, setSelectedSpecies] = useState('')
  const [customSpecies, setCustomSpecies] = useState('')
  const [selectedBreed, setSelectedBreed] = useState('')
  const [customBreed, setCustomBreed] = useState('')
  const [weightValue, setWeightValue] = useState('')

  // Initialize form values when dialog opens or pet changes
  useEffect(() => {
    if (open) {
      const species = mode === 'edit' && pet?.species ? pet.species : ''
      const breed = mode === 'edit' && pet?.breed ? pet.breed : ''
      const weight = mode === 'edit' && pet?.weight ? String(pet.weight) : ''

      setSelectedSpecies(species)
      setCustomSpecies(SPECIES_OPTIONS.includes(species) ? '' : species)
      setSelectedBreed(breed)
      setCustomBreed('')
      setWeightValue(weight)

      // Check if breed needs custom handling
      const breedList = species ? (BREEDS_BY_SPECIES[species] || []) : []
      if (breed && !breedList.includes(breed)) {
        setCustomBreed(breed)
      }
    }
  }, [open, mode, pet])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const species = selectedSpecies === 'Other' ? customSpecies : selectedSpecies
    const breed = selectedBreed === 'Other' ? customBreed : selectedBreed

    onSubmit({
      name: formData.get('name'),
      species: species,
      breed: breed,
      weight: parseFloat(weightValue) || 0,
      dateOfBirth: formData.get('dob'),
      gender: formData.get('gender'),
      bloodType: formData.get('bloodType'),
      color: formData.get('color'),
      ownerUid: mode === 'edit' ? pet?.ownerUid : formData.get('ownerUid'),
    })
  }

  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value

    // Allow only numbers and decimal point
    value = value.replace(/[^\d.]/g, '')

    // Ensure only one decimal point
    const parts = value.split('.')
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('')
    }

    // Limit to 2 decimal places
    if (parts.length === 2 && parts[1].length > 2) {
      value = parts[0] + '.' + parts[1].slice(0, 2)
    }

    setWeightValue(value)
  }

  const currentBreeds = selectedSpecies ? (BREEDS_BY_SPECIES[selectedSpecies] || []) : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl rounded-3xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-2xl font-bold">
            {mode === 'add' ? 'Register New Patient' : 'Edit Patient Record'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'add'
              ? 'Fill out the profile for a new animal and its primary owner.'
              : `Update the clinical profile for ${pet?.name}.`}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-2">
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
                <SearchableSelect
                  label="Species"
                  options={SPECIES_OPTIONS}
                  value={selectedSpecies}
                  customValue={customSpecies}
                  placeholder="Search or select species..."
                  onSelect={setSelectedSpecies}
                  onCustomChange={setCustomSpecies}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <SearchableSelect
                    label="Breed"
                    options={currentBreeds}
                    value={selectedBreed}
                    customValue={customBreed}
                    placeholder={selectedSpecies ? "Search or select breed..." : "Select species first"}
                    onSelect={setSelectedBreed}
                    onCustomChange={setCustomBreed}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gender" className="font-bold text-gray-700">Gender</Label>
                    <select
                      name="gender"
                      defaultValue={mode === 'edit' ? pet?.gender : ''}
                      className="w-full rounded-xl border border-gray-100 bg-gray-50 focus:bg-white h-12 px-3 text-sm"
                      required
                    >
                      <option value="">Select gender</option>
                      <option value="Male">♂ Male</option>
                      <option value="Female">♀ Female</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bloodType" className="font-bold text-gray-700">Blood Type</Label>
                    <Input
                      id="bloodType"
                      name="bloodType"
                      defaultValue={mode === 'edit' ? pet?.bloodType : ''}
                      className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white h-12"
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
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color" className="font-bold text-gray-700">Color</Label>
                  <Input
                    id="color"
                    name="color"
                    defaultValue={mode === 'edit' ? pet?.color : ''}
                    className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white h-12"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weight" className="font-bold text-gray-700">Weight (kg)</Label>
                  <Input
                    id="weight"
                    name="weight"
                    type="text"
                    inputMode="decimal"
                    value={weightValue}
                    onChange={handleWeightChange}
                    className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white h-12"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Owner Information */}
            {mode === 'add' && (
              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                    <User className="w-4 h-4 text-orange-600" />
                  </div>
                  <h3 className="font-bold text-gray-900">Owner Information</h3>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ownerUid" className="font-bold text-gray-700">Select Owner</Label>
                  <select
                    id="ownerUid"
                    name="ownerUid"
                    defaultValue={mode === 'edit' ? pet?.ownerUid : ''}
                    className="w-full rounded-xl border border-gray-100 bg-gray-50 focus:bg-white h-12 px-3"
                    required
                  >
                    <option value="">Select an owner...</option>
                    {Object.entries(users || {})
                      .filter(([uid, userData]: [string, any]) => userData?.role === 'client')
                      .map(([uid, userData]: [string, any]) => (
                        <option key={uid} value={uid}>
                          {userData?.displayName || userData?.email || uid}
                        </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <DialogFooter className="pt-6 flex gap-3 border-t border-gray-50">
              <Button type="button" variant="ghost" onClick={onCancel} className="rounded-xl h-12 px-6 font-bold" disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-12 px-8 font-bold shadow-lg shadow-blue-100" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {mode === 'add' ? 'Registering...' : 'Saving...'}
                  </span>
                ) : (
                  mode === 'add' ? 'Register Patient' : 'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

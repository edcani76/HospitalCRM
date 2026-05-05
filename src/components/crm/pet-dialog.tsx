import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { Input } from '../../components/ui/input'
import { useAuth } from '../../contexts/AuthContext'
import { Search, ChevronDown, User, Activity, Camera, Upload, X, Loader2 } from 'lucide-react'
import imageCompression from 'browser-image-compression'

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
  const { user } = useAuth();
  const [selectedSpecies, setSelectedSpecies] = useState('')
  const [customSpecies, setCustomSpecies] = useState('')
  const [selectedBreed, setSelectedBreed] = useState('')
  const [customBreed, setCustomBreed] = useState('')
  const [weightValue, setWeightValue] = useState('')
  const [photoPreview, setPhotoPreview] = useState<string>('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [cameraError, setCameraError] = useState<string>('')
  const [isCompressing, setIsCompressing] = useState(false)

  const compressImage = useCallback(async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1280,
      useWebWorker: true,
      fileType: 'image/jpeg',
    }
    const compressed = await imageCompression(file, options)
    return new File([compressed], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
  }, [])

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    if (file.size > 10 * 1024 * 1024) return

    setIsCompressing(true)
    try {
      const compressed = await compressImage(file)
      setPhotoFile(compressed)
      const reader = new FileReader()
      reader.onloadend = () => setPhotoPreview(reader.result as string)
      reader.readAsDataURL(compressed)
    } catch (err) {
      console.error('Compression failed:', err)
    } finally {
      setIsCompressing(false)
    }
  }

  const clearPhoto = () => {
    setPhotoPreview('')
    setPhotoFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const startCamera = useCallback(async () => {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
      })
      streamRef.current = stream
      setShowCamera(true)
    } catch (err) {
      setCameraError('Unable to access camera. Please grant permission and try again.')
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setShowCamera(false)
    setCameraError('')
  }, [])

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = Math.min(videoRef.current.videoWidth, 1280)
    canvas.height = Math.min(videoRef.current.videoHeight, 1280)
    const scale = Math.min(1280 / videoRef.current.videoWidth, 1280 / videoRef.current.videoHeight)
    if (scale < 1) {
      canvas.width = videoRef.current.videoWidth * scale
      canvas.height = videoRef.current.videoHeight * scale
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)

    setIsCompressing(true)
    canvas.toBlob(async (blob) => {
      if (!blob) return
      const file = new File([blob], 'pet-photo.jpg', { type: 'image/jpeg' })

      try {
        const compressed = await compressImage(file)
        setPhotoFile(compressed)
        const reader = new FileReader()
        reader.onloadend = () => setPhotoPreview(reader.result as string)
        reader.readAsDataURL(compressed)
      } catch (err) {
        console.error('Compression failed:', err)
        setPhotoFile(file)
        const reader = new FileReader()
        reader.onloadend = () => setPhotoPreview(reader.result as string)
        reader.readAsDataURL(file)
      } finally {
        setIsCompressing(false)
      }
      stopCamera()
    }, 'image/jpeg', 0.85)
  }, [stopCamera, compressImage])

  useEffect(() => {
    if (showCamera) {
      setCameraError('')
    }
    if (showCamera && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [showCamera])

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

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
      photoFile,
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
        {showCamera ? (
          <div className="py-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <DialogTitle className="text-xl font-bold">Take Photo</DialogTitle>
                <DialogDescription className="text-sm">Position your pet in the frame and tap capture</DialogDescription>
              </div>
              <button
                type="button"
                onClick={stopCamera}
                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative rounded-2xl overflow-hidden bg-gray-900 aspect-video mb-6">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>

            {cameraError && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold text-center mb-6">
                {cameraError}
              </div>
            )}

            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={capturePhoto}
                className="w-20 h-20 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-transform"
              >
                <Camera className="w-8 h-8 text-white" />
              </button>
            </div>
            <p className="text-gray-400 text-xs text-center mt-3 font-bold uppercase tracking-widest">Tap to capture</p>
          </div>
        ) : (
          <>
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

              {/* Photo Upload */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-gray-900 text-sm">Pet Photo</p>
                  {photoPreview && (
                    <button
                      type="button"
                      onClick={clearPhoto}
                      className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1 transition-colors"
                    >
                      <X className="w-3 h-3" />
                      Remove
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  {/* Photo Preview */}
                  <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-gray-100 border-2 border-gray-100 flex-shrink-0">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Pet" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Camera className="w-8 h-8 text-gray-200" />
                      </div>
                    )}
                    {isCompressing && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 flex-1">
                    <button
                      type="button"
                      onClick={startCamera}
                      disabled={isCompressing}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left disabled:opacity-50 ${
                        cameraError
                          ? 'bg-red-50 text-red-700'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      <Camera className="w-5 h-5" />
                      <div>
                        <p className="text-sm font-bold">Take Photo</p>
                        <p className={`text-[10px] font-bold ${cameraError ? 'text-red-500' : 'text-emerald-500/70'}`}>
                          {cameraError || 'Use device camera'}
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isCompressing}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors text-left disabled:opacity-50"
                    >
                      <Upload className="w-5 h-5" />
                      <div>
                        <p className="text-sm font-bold">Upload Photo</p>
                        <p className="text-[10px] font-bold text-blue-500/70">Choose from device (max 5MB)</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Hidden input for file upload */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
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

                {Object.keys(users).length > 0 ? (
                  <div className="space-y-2">
                    <Label htmlFor="ownerUid" className="font-bold text-gray-700">Select Owner</Label>
                    <select
                      id="ownerUid"
                      name="ownerUid"
                       defaultValue={user?.uid || ''}
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
                ) : (
                  <input type="hidden" name="ownerUid" value={user?.uid || ''} />
                )}
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
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

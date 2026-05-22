import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '../../components/ui/drawer'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { Input } from '../../components/ui/input'
import { useAuth } from '../../contexts/AuthContext'
import { Search, ChevronDown, User, Activity, Camera, Upload, X, Loader2, ShieldAlert } from 'lucide-react'
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
  const [consentPrivacy, setConsentPrivacy] = useState(false)
  const [consentTerms, setConsentTerms] = useState(false)

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
    if (mode === 'edit' && pet) {
      const species = pet.species || ''
      const breed = pet.breed || ''
      const isSpeciesOther = !SPECIES_OPTIONS.includes(species)
      const isBreedOther = breed && !((BREEDS_BY_SPECIES[species] || []).includes(breed))
      
      setSelectedSpecies(isSpeciesOther ? 'Other' : species)
      if (isSpeciesOther && species) setCustomSpecies(species)
      else if (!isSpeciesOther) setCustomSpecies('')
      
      setSelectedBreed(isBreedOther ? 'Other' : breed)
      if (isBreedOther && breed) setCustomBreed(breed)
      else if (!isBreedOther) setCustomBreed('')
      
      setWeightValue(pet.weight ? String(pet.weight) : '')
      
      if (pet.imageUrl && !pet.imageUrl.startsWith('data:')) {
        setPhotoPreview(pet.imageUrl)
      }
    } else if (mode === 'add') {
      setSelectedSpecies('')
      setCustomSpecies('')
      setSelectedBreed('')
      setCustomBreed('')
      setWeightValue('')
      setPhotoPreview('')
      setPhotoFile(null)
      setConsentPrivacy(false)
      setConsentTerms(false)
    }
  }, [mode, pet, open])

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

    // Parse comma-separated text fields into arrays
    const parseCommaList = (value: string | null): string[] | null => {
      if (!value) return null
      const list = value.split(',').map(s => s.trim()).filter(Boolean)
      return list.length > 0 ? list : null
    }

    onSubmit({
      name: formData.get('name') as string,
      species: species,
      breed: breed,
      weight: parseFloat(weightValue) || 0,
      dateOfBirth: formData.get('dob') as string || null,
      gender: (formData.get('gender') as string) || null,
      bloodType: (formData.get('bloodType') as string) || null,
      color: (formData.get('color') as string) || null,
      microchipId: (formData.get('microchipId') as string) || null,
      medicalHistory: (formData.get('medicalHistory') as string) || null,
      // Alerts & Warnings
      allergies: parseCommaList(formData.get('allergies') as string),
      chronicConditions: parseCommaList(formData.get('chronicConditions') as string),
      medicationReactions: parseCommaList(formData.get('medicationReactions') as string),
      aggressionWarning: formData.has('aggressionWarning') ? true : (mode === 'edit' ? pet?.aggressionWarning : false),
      aggressionNotes: (formData.get('aggressionNotes') as string) || null,
      specialHandlingNotes: (formData.get('specialHandlingNotes') as string) || null,
      contagiousDiseaseFlag: formData.has('contagiousDiseaseFlag') ? true : (mode === 'edit' ? pet?.contagiousDiseaseFlag : false),
      contagiousDiseaseNotes: (formData.get('contagiousDiseaseNotes') as string) || null,
      ownerUid: mode === 'edit' ? pet?.ownerUid : (formData.get('ownerUid') as string) || null,
      photoFile,
      consentPrivacy: mode === 'add' ? consentPrivacy : undefined,
      consentTerms: mode === 'add' ? consentTerms : undefined,
      consentPrivacyTimestamp: mode === 'add' && consentPrivacy ? new Date().toISOString() : null,
      consentTermsTimestamp: mode === 'add' && consentTerms ? new Date().toISOString() : null,
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
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="">
        {showCamera ? (
          <div className="py-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <DrawerTitle className="text-xl font-bold">Take Photo</DrawerTitle>
                <DrawerDescription className="text-sm">Position your pet in the frame and tap capture</DrawerDescription>
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
        <DrawerHeader className="flex-shrink-0">
          <DrawerTitle className="text-2xl font-bold">
            {mode === 'edit' ? 'Edit Patient Record' : 'Register New Patient'}
          </DrawerTitle>
          <DrawerDescription>
            {mode === 'edit' ? 'Update pet information and health records' : 'Register a new pet patient in the system'}
          </DrawerDescription>
        </DrawerHeader>
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
                <div className="space-y-2">
                  <Label htmlFor="microchipId" className="font-bold text-gray-700">Microchip ID</Label>
                  <Input
                    id="microchipId"
                    name="microchipId"
                    defaultValue={mode === 'edit' ? pet?.microchipId : ''}
                    className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white h-12 font-mono"
                    placeholder="e.g., 985112345678901"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="medicalHistory" className="font-bold text-gray-700">Medical History / Notes</Label>
                <textarea
                  id="medicalHistory"
                  name="medicalHistory"
                  defaultValue={mode === 'edit' ? pet?.medicalHistory : ''}
                  className="w-full rounded-xl border border-gray-100 bg-gray-50 focus:bg-white p-3 text-sm min-h-[80px] resize-none"
                  placeholder="Any pre-existing conditions, allergies, or relevant medical history..."
                />
              </div>

              {/* Alerts & Warnings Section */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 pb-2">
                  <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                  </div>
                  <h3 className="font-bold text-gray-900">Alerts & Warnings</h3>
                </div>

                {/* Allergies */}
                <div className="space-y-2">
                  <Label htmlFor="allergies" className="font-bold text-gray-700">Allergies</Label>
                  <input
                    id="allergies"
                    name="allergies"
                    type="text"
                    defaultValue={mode === 'edit' ? (pet?.allergies?.join(', ') || '') : ''}
                    className="w-full rounded-xl border border-gray-100 bg-gray-50 focus:bg-white h-11 px-3 text-sm"
                    placeholder="e.g., Penicillin, Beef, Chicken (comma-separated)"
                  />
                </div>

                {/* Chronic Conditions */}
                <div className="space-y-2">
                  <Label htmlFor="chronicConditions" className="font-bold text-gray-700">Chronic Conditions</Label>
                  <input
                    id="chronicConditions"
                    name="chronicConditions"
                    type="text"
                    defaultValue={mode === 'edit' ? (pet?.chronicConditions?.join(', ') || '') : ''}
                    className="w-full rounded-xl border border-gray-100 bg-gray-50 focus:bg-white h-11 px-3 text-sm"
                    placeholder="e.g., Diabetes, Heart Disease, Arthritis (comma-separated)"
                  />
                </div>

                {/* Medication Reactions */}
                <div className="space-y-2">
                  <Label htmlFor="medicationReactions" className="font-bold text-gray-700">Medication Reactions</Label>
                  <input
                    id="medicationReactions"
                    name="medicationReactions"
                    type="text"
                    defaultValue={mode === 'edit' ? (pet?.medicationReactions?.join(', ') || '') : ''}
                    className="w-full rounded-xl border border-gray-100 bg-gray-50 focus:bg-white h-11 px-3 text-sm"
                    placeholder="e.g., Ibuprofen causes vomiting (comma-separated)"
                  />
                </div>

                {/* Special Handling Notes */}
                <div className="space-y-2">
                  <Label htmlFor="specialHandlingNotes" className="font-bold text-gray-700">Special Handling Notes</Label>
                  <textarea
                    id="specialHandlingNotes"
                    name="specialHandlingNotes"
                    defaultValue={mode === 'edit' ? pet?.specialHandlingNotes : ''}
                    className="w-full rounded-xl border border-gray-100 bg-gray-50 focus:bg-white p-3 text-sm min-h-[60px] resize-none"
                    placeholder="Notes for handling during examination (e.g., anxious without owner, prefers gentle approach)"
                  />
                </div>

                {/* Aggression Warning */}
                <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl">
                  <input
                    id="aggressionWarning"
                    name="aggressionWarning"
                    type="checkbox"
                    defaultChecked={mode === 'edit' ? pet?.aggressionWarning : false}
                    className="w-5 h-5 rounded border-red-300 text-red-600 focus:ring-red-500"
                  />
                  <div className="flex-1">
                    <Label htmlFor="aggressionWarning" className="font-bold text-red-800 cursor-pointer">Aggression Warning</Label>
                    <p className="text-xs text-red-600">Check if pet has shown aggressive behavior</p>
                  </div>
                </div>

                {/* Aggression Notes */}
                <div className="space-y-2">
                  <Label htmlFor="aggressionNotes" className="font-bold text-gray-700">Aggression Notes</Label>
                  <textarea
                    id="aggressionNotes"
                    name="aggressionNotes"
                    defaultValue={mode === 'edit' ? pet?.aggressionNotes : ''}
                    className="w-full rounded-xl border border-gray-100 bg-gray-50 focus:bg-white p-3 text-sm min-h-[60px] resize-none"
                    placeholder="Describe triggers and behavior patterns"
                  />
                </div>

                {/* Contagious Disease Flag */}
                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
                  <input
                    id="contagiousDiseaseFlag"
                    name="contagiousDiseaseFlag"
                    type="checkbox"
                    defaultChecked={mode === 'edit' ? pet?.contagiousDiseaseFlag : false}
                    className="w-5 h-5 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                  />
                  <div className="flex-1">
                    <Label htmlFor="contagiousDiseaseFlag" className="font-bold text-purple-800 cursor-pointer">Contagious Disease Flag</Label>
                    <p className="text-xs text-purple-600">Check if pet has or may have a contagious condition</p>
                  </div>
                </div>

                {/* Contagious Disease Notes */}
                <div className="space-y-2">
                  <Label htmlFor="contagiousDiseaseNotes" className="font-bold text-gray-700">Contagious Disease Notes</Label>
                  <textarea
                    id="contagiousDiseaseNotes"
                    name="contagiousDiseaseNotes"
                    defaultValue={mode === 'edit' ? pet?.contagiousDiseaseNotes : ''}
                    className="w-full rounded-xl border border-gray-100 bg-gray-50 focus:bg-white p-3 text-sm min-h-[60px] resize-none"
                    placeholder="Describe condition and precautions needed"
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

            <div className="pt-6 flex flex-col gap-4 border-t border-gray-50">
              {mode === 'add' && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Consent Required</p>
                  
                  <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50/50 cursor-pointer hover:bg-gray-50 transition-all">
                    <input
                      type="checkbox"
                      checked={consentPrivacy}
                      onChange={(e) => setConsentPrivacy(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500/20 focus:ring-2"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Data Privacy Consent</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                        I consent to the collection and processing of my pet's health data and my personal information in accordance with the Data Privacy Act. This information will be used solely for veterinary services and patient care.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50/50 cursor-pointer hover:bg-gray-50 transition-all">
                    <input
                      type="checkbox"
                      checked={consentTerms}
                      onChange={(e) => setConsentTerms(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500/20 focus:ring-2"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Terms & Conditions</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                        I agree that all information provided is accurate and understand that I am responsible for the care and treatment decisions for this animal. I agree to the clinic's policies regarding appointments, payments, and medical procedures.
                      </p>
                    </div>
                  </label>
                </div>
              )}

              <div className="flex gap-3">
                <Button type="button" variant="ghost" onClick={onCancel} className="flex-1 rounded-xl h-12 px-6 font-bold" disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-12 px-8 font-bold shadow-lg shadow-blue-100" disabled={isSubmitting || (mode === 'add' && (!consentPrivacy || !consentTerms))}>
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {mode === 'add' ? 'Registering...' : 'Saving...'}
                    </span>
                  ) : (
                    mode === 'add' ? 'Register Patient' : 'Save Changes'
                  )}
                </Button>
              </div>
            </div>
          </form>
          </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  )
}

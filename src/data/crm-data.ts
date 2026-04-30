import { User, Calendar, CreditCard, Pill, BarChart3 } from 'lucide-react'

export const dashboardStats = {
  totalPatients: 1248,
  appointmentsToday: 42,
  pendingLabReports: 18,
  revenue: {
    monthly: 184500,
    yearly: 2214000,
  },
  appointmentsTrend: [
    { date: '2026-04-21', count: 38 },
    { date: '2026-04-22', count: 45 },
    { date: '2026-04-23', count: 52 },
    { date: '2026-04-24', count: 41 },
    { date: '2026-04-25', count: 48 },
    { date: '2026-04-26', count: 55 },
    { date: '2026-04-27', count: 42 },
  ],
  patientsByDepartment: [
    { department: 'General', count: 450 },
    { department: 'Cardiology', count: 280 },
    { department: 'Orthopedics', count: 195 },
    { department: 'Pediatrics', count: 165 },
    { department: 'Dermatology', count: 158 },
  ],
}

export const patients = [
  {
    id: '1',
    patientId: 'P-1001',
    name: 'Buddy (Golden Retriever)',
    owner: 'John Smith',
    ownerId: 'owner-1001',
    dateOfBirth: '2020-05-15',
    species: 'Dog',
    breed: 'Golden Retriever',
    color: 'Golden',
    gender: 'Male',
    microchipId: 'MC-9988776655',
    size: 'Large',
    weight: 32,
    weightHistory: [
      { date: '2026-01-15', weight: 30, notes: 'Initial record' },
      { date: '2026-04-15', weight: 32, notes: 'Annual checkup' }
    ],
    photo: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=200&h=200',
    status: 'Active',
    bloodType: 'DEA 1.1+',
    contact: '(555) 123-4567',
    email: 'john.smith@email.com',
    address: '123 Maple Ave, Springfield, IL 62704',
    auditTrail: [
      { id: '1', event: 'Record Created', staff: 'Admin User', timestamp: '2026-01-15 09:30 AM' },
      { id: '2', event: 'Contact Info Updated', staff: 'Sarah Johnson', timestamp: '2026-03-10 02:15 PM' },
      { id: '3', event: 'Profile Photo Uploaded', staff: 'Admin User', timestamp: '2026-04-20 11:00 AM' }
    ],
    emergencyContact: '(555) 987-6543',
    medicalHistory: 'Hip dysplasia, regular checkups',
    recentVisits: [
      {
        doctor: "Dr. Sarah Johnson",
        date: "2026-04-15",
        diagnosis: "Annual checkup with vaccinations",
        notes: "Patient is healthy, all core vaccines updated. No signs of discomfort in hips during examination.",
        department: "General",
      }
    ],
  },
  {
    id: '2',
    patientId: 'P-1002',
    name: 'Whiskers (Siamese Cat)',
    owner: 'Jane Doe',
    ownerId: 'owner-1002',
    dateOfBirth: '2019-08-22',
    species: 'Cat',
    breed: 'Siamese',
    color: 'Cream',
    gender: 'Female',
    microchipId: 'MC-8877665544',
    size: 'Small', // 4.5kg - Cat Small (5-10 kg)
    weight: 4.5,
    weightHistory: [
      { date: '2026-02-01', weight: 4.2, notes: 'Initial record' },
      { date: '2026-04-10', weight: 4.5, notes: 'Dental visit' }
    ],
    photo: 'https://images.unsplash.com/photo-1513245543132-31f507417b26?auto=format&fit=crop&q=80&w=200&h=200',
    status: 'Active',
    bloodType: 'Type A',
    contact: '(555) 234-5678',
    email: 'jane.doe@email.com',
    address: '456 Oak St, Metropolis, NY 10001',
    auditTrail: [
      { id: '1', event: 'Record Created', staff: 'Admin User', timestamp: '2026-02-01 10:00 AM' },
      { id: '2', event: 'Status Changed to Active', staff: 'Dr. Michael Chen', timestamp: '2026-02-15 03:45 PM' }
    ],
    emergencyContact: '(555) 876-5432',
    medicalHistory: 'Dental issues, resolved',
    recentVisits: [
      {
        doctor: "Dr. Michael Chen",
        date: "2026-04-10",
        diagnosis: "Grade 2 Periodontal Disease",
        notes: "Full dental prophylaxis performed. One premolar extraction required due to root exposure. Antibiotics prescribed.",
        department: "Dentistry",
      }
    ],
  },
  {
    id: '3',
    patientId: 'P-1003',
    name: 'Max (German Shepherd)',
    owner: 'Robert Johnson',
    ownerId: 'owner-1003',
    dateOfBirth: '2018-12-10',
    species: 'Dog',
    breed: 'German Shepherd',
    color: 'Black/Tan',
    gender: 'Male',
    microchipId: 'MC-7766554433',
    size: 'Large', // 34kg - Dog Large (26-44 kg)
    weight: 34,
    weightHistory: [
      { date: '2026-01-20', weight: 32, notes: 'Initial record' },
      { date: '2026-04-18', weight: 34, notes: 'Allergy visit - weight gain noted' }
    ],
    photo: 'https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?auto=format&fit=crop&q=80&w=200&h=200',
    status: 'Active',
    bloodType: 'DEA 1.1-',
    contact: '(555) 345-6789',
    email: 'robert.j@email.com',
    address: '789 Pine Rd, Gotham, NJ 07001',
    auditTrail: [
      { id: '1', event: 'Record Created', staff: 'Admin User', timestamp: '2026-01-20 08:30 AM' },
      { id: '2', event: 'Emergency Contact Added', staff: 'Sarah Johnson', timestamp: '2026-03-05 01:20 PM' },
      { id: '3', event: 'Address Updated', staff: 'Admin User', timestamp: '2026-04-12 10:10 AM' }
    ],
    emergencyContact: '(555) 765-4321',
    medicalHistory: 'Allergies, managed with medication',
    recentVisits: [
      {
        doctor: "Dr. Sarah Johnson",
        date: "2026-04-18",
        diagnosis: "Atopic Dermatitis Flare-up",
        notes: "Seasonal allergy flare-up noted. Switched to Apoquel for better control. Advised medicated baths twice weekly.",
        department: "General",
      }
    ],
  },
  {
    id: '4',
    patientId: 'P-1004',
    name: 'Luna (Persian Cat)',
    owner: 'Emily Wilson',
    ownerId: 'owner-1004',
    dateOfBirth: '2021-03-05',
    species: 'Cat',
    breed: 'Persian',
    color: 'White',
    gender: 'Female',
    microchipId: 'MC-6655443322',
    size: 'Toy', // 3.8kg - Cat Toy (< 5 kg)
    weight: 3.8,
    weightHistory: [
      { date: '2025-12-10', weight: 3.5, notes: 'Initial record' },
      { date: '2026-03-25', weight: 3.8, notes: 'Wellness exam' }
    ],
    photo: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=200&h=200',
    status: 'Inactive',
    bloodType: 'Type B',
    contact: '(555) 456-7890',
    email: 'emily.w@email.com',
    address: '321 Elm St, Star City, WA 98001',
    auditTrail: [
      { id: '1', event: 'Record Created', staff: 'Admin User', timestamp: '2025-12-10 11:00 AM' },
      { id: '2', event: 'Status Marked as Inactive', staff: 'Dr. Emily Wilson', timestamp: '2026-02-28 04:30 PM' }
    ],
    emergencyContact: '(555) 654-3210',
    medicalHistory: 'None',
    recentVisits: [
      {
        doctor: "Dr. Emily Rodriguez",
        date: "2026-03-25",
        diagnosis: "Routine Wellness Exam",
        notes: "Healthy weight maintained. No concerns noted by owner. Heartworm and flea prevention refilled.",
        department: "Nutrition",
      }
    ],
  },
  {
    id: '5',
    patientId: 'P-1005',
    name: 'Charlie (Labrador)',
    owner: 'Michael Brown',
    ownerId: 'owner-1005',
    dateOfBirth: '2019-11-28',
    species: 'Dog',
    breed: 'Labrador Retriever',
    color: 'Yellow',
    gender: 'Male',
    microchipId: 'MC-5544332211',
    size: 'Large', // 30kg - Dog Large (26-44 kg)
    weight: 30,
    weightHistory: [
      { date: '2026-02-10', weight: 35, notes: 'Initial record - obese' },
      { date: '2026-03-22', weight: 32, notes: 'Diet progress check' },
      { date: '2026-04-20', weight: 30, notes: '2kg weight loss achieved' }
    ],
    photo: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=200&h=200',
    status: 'Active',
    bloodType: 'DEA 1.1+',
    contact: '(555) 567-8901',
    email: 'michael.b@email.com',
    address: '654 Birch Ln, Central City, MO 64101',
    auditTrail: [
      { id: '1', event: 'Record Created', staff: 'Admin User', timestamp: '2026-02-10 09:15 AM' },
      { id: '2', event: 'Blood Type Verified', staff: 'Dr. Sarah Johnson', timestamp: '2026-03-22 10:50 AM' }
    ],
    emergencyContact: '(555) 543-2109',
    medicalHistory: 'Obesity, on diet plan',
    recentVisits: [
      {
        doctor: "Dr. Emily Rodriguez",
        date: "2026-04-20",
        diagnosis: "Obesity Management - Follow up",
        notes: "2kg weight loss achieved since last month. Continue strictly with the prescribed metabolic diet. Increase daily activity.",
        department: "Nutrition",
      }
    ],
  },
  {
    id: '6',
    patientId: 'P-1006',
    name: 'Bella (Beagle)',
    owner: 'Sarah Miller',
    ownerId: 'owner-1006',
    dateOfBirth: '2021-06-12',
    species: 'Dog',
    breed: 'Beagle',
    color: 'Tri-color',
    gender: 'Female',
    microchipId: 'MC-4433221100',
    size: 'Medium', // 11kg - Dog Medium (11-25 kg)
    weight: 11,
    weightHistory: [
      { date: '2026-03-05', weight: 10.5, notes: 'Initial record' },
      { date: '2026-04-10', weight: 11, notes: 'Annual vaccination' }
    ],
    photo: 'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&q=80&w=200&h=200',
    status: 'Active',
    bloodType: 'DEA 1.1+',
    contact: '(555) 678-9012',
    email: 'sarah.miller@email.com',
    address: '789 Walnut St, Oak Ridge, TN 37830',
    auditTrail: [
      { id: '1', event: 'Record Created', staff: 'Admin User', timestamp: '2026-03-05 10:30 AM' }
    ],
    emergencyContact: '(555) 999-8888',
    medicalHistory: 'Regular vaccinations',
    recentVisits: [
      {
        doctor: "Dr. Sarah Johnson",
        date: "2026-04-10",
        diagnosis: "Annual Vaccination",
        notes: "Administered core vaccines. Patient reacted well.",
        department: "General",
      }
    ],
  },
  {
    id: '7',
    patientId: 'P-1007',
    name: 'Oliver (Tabby Cat)',
    owner: 'Sarah Miller',
    ownerId: 'owner-1006',
    dateOfBirth: '2022-02-20',
    species: 'Cat',
    breed: 'Tabby',
    color: 'Orange Tabby',
    gender: 'Male',
    microchipId: 'MC-3322110099',
    size: 'Toy', // 4.2kg - Cat Toy (< 5 kg)
    weight: 4.2,
    weightHistory: [
      { date: '2026-03-05', weight: 4.0, notes: 'Initial record' },
      { date: '2026-04-12', weight: 4.2, notes: 'Ear infection visit' }
    ],
    photo: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=200&h=200',
    status: 'Active',
    bloodType: 'Type A',
    contact: '(555) 678-9012',
    email: 'sarah.miller@email.com',
    address: '789 Walnut St, Oak Ridge, TN 37830',
    auditTrail: [
      { id: '1', event: 'Record Created', staff: 'Admin User', timestamp: '2026-03-05 10:45 AM' }
    ],
    emergencyContact: '(555) 999-8888',
    medicalHistory: 'None',
    recentVisits: [
      {
        doctor: "Dr. Michael Chen",
        date: "2026-04-12",
        diagnosis: "Ear Infection",
        notes: "Otitis externa in right ear. Prescribed topical drops for 7 days.",
        department: "General",
      }
    ],
  },
]

export const owners = [
  {
    id: 'owner-1001',
    name: 'John Smith',
    contact: '(555) 123-4567',
    email: 'john.smith@email.com',
    address: '123 Maple Ave, Springfield, IL 62704',
    patients: ['Buddy (Golden Retriever)'],
    status: 'Active',
    joinDate: '2026-01-15',
  },
  {
    id: 'owner-1002',
    name: 'Jane Doe',
    contact: '(555) 234-5678',
    email: 'jane.doe@email.com',
    address: '456 Oak St, Metropolis, NY 10001',
    patients: ['Whiskers (Siamese Cat)'],
    status: 'Active',
    joinDate: '2026-02-01',
  },
  {
    id: 'owner-1003',
    name: 'Robert Johnson',
    contact: '(555) 345-6789',
    email: 'robert.j@email.com',
    address: '789 Pine Rd, Gotham, NJ 07001',
    patients: ['Max (German Shepherd)'],
    status: 'Active',
    joinDate: '2026-01-20',
  },
  {
    id: 'owner-1004',
    name: 'Emily Wilson',
    contact: '(555) 456-7890',
    email: 'emily.w@email.com',
    address: '321 Elm St, Star City, WA 98001',
    patients: ['Luna (Persian Cat)'],
    status: 'Inactive',
    joinDate: '2025-12-10',
  },
  {
    id: 'owner-1005',
    name: 'Michael Brown',
    contact: '(555) 567-8901',
    email: 'michael.b@email.com',
    address: '654 Birch Ln, Central City, MO 64101',
    patients: ['Charlie (Labrador)'],
    status: 'Active',
    joinDate: '2026-02-10',
  },
  {
    id: 'owner-1006',
    name: 'Sarah Miller',
    contact: '(555) 678-9012',
    email: 'sarah.miller@email.com',
    address: '789 Walnut St, Oak Ridge, TN 37830',
    patients: ['Bella (Beagle)', 'Oliver (Tabby Cat)'],
    status: 'Active',
    joinDate: '2026-03-05',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200&h=200',
  },
]

export const bills = [
  {
    id: 'INV-2026-001',
    ownerId: 'owner-1006',
    patientName: 'Bella (Beagle)',
    date: '2026-04-10',
    amount: 150.00,
    status: 'Paid',
    description: 'Annual Vaccination',
  },
  {
    id: 'INV-2026-002',
    ownerId: 'owner-1006',
    patientName: 'Oliver (Tabby Cat)',
    date: '2026-04-12',
    amount: 85.50,
    status: 'Pending',
    description: 'Ear Infection Treatment',
  },
  {
    id: 'INV-2026-003',
    ownerId: 'owner-1001',
    patientName: 'Buddy (Golden Retriever)',
    date: '2026-04-15',
    amount: 210.00,
    status: 'Paid',
    description: 'General Consultation & Labs',
  }
]

export const appointments = [
  {
    id: '1',
    patientId: '1',
    doctorId: '1',
    date: '2026-04-28',
    time: '09:00 AM',
    reason: 'Annual checkup',
    status: 'Scheduled',
    notes: 'Regular annual examination',
  },
  {
    id: '2',
    patientId: '2',
    doctorId: '2',
    date: '2026-04-28',
    time: '10:30 AM',
    reason: 'Dental cleaning',
    status: 'Scheduled',
    notes: 'Follow-up on dental issues',
  },
  {
    id: '3',
    patientId: '3',
    doctorId: '1',
    date: '2026-04-28',
    time: '01:00 PM',
    reason: 'Allergy consultation',
    status: 'Scheduled',
    notes: 'Discuss allergy management',
  },
  {
    id: '4',
    patientId: '5',
    doctorId: '3',
    date: '2026-04-28',
    time: '03:30 PM',
    reason: 'Weight check',
    status: 'Scheduled',
    notes: 'Monitor weight loss progress',
  },
  {
    id: '5',
    patientId: '1',
    doctorId: '1',
    date: '2026-04-29',
    time: '11:00 AM',
    reason: 'Vaccination',
    status: 'Scheduled',
    notes: 'Annual vaccinations',
  },
]

export const doctors = [
  {
    id: '1',
    name: 'Dr. Sarah Johnson',
    speciality: 'General Veterinary Medicine',
    department: 'General',
    contact: '(555) 111-2222',
    email: 'sarah.j@vitacare.com',
  },
  {
    id: '2',
    name: 'Dr. Michael Chen',
    speciality: 'Dentistry',
    department: 'Dentistry',
    contact: '(555) 222-3333',
    email: 'michael.c@vitacare.com',
  },
  {
    id: '3',
    name: 'Dr. Emily Rodriguez',
    speciality: 'Nutrition',
    department: 'Nutrition',
    contact: '(555) 333-4444',
    email: 'emily.r@vitacare.com',
  },
]

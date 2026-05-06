import { db, collection, addDoc, getDocs, query, where, deleteDoc } from '../src/firebase'
import { ServiceCatalogItem } from '../src/types'

const services: Omit<ServiceCatalogItem, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // Consultations
  { code: 'CONS-001', name: 'General Consultation', category: 'consultation', description: 'Standard veterinary consultation', defaultPrice: 500, taxable: false, active: true, requiresClinicalRecord: true, durationMin: 30 },
  { code: 'CONS-002', name: 'Follow-up Consultation', category: 'consultation', description: 'Follow-up visit', defaultPrice: 400, taxable: false, active: true, requiresClinicalRecord: true, durationMin: 20 },
  { code: 'CONS-003', name: 'Emergency Consultation', category: 'consultation', description: 'Emergency veterinary consultation', defaultPrice: 1000, taxable: false, active: true, requiresClinicalRecord: true, durationMin: 45 },

  // Vaccinations
  { code: 'VACC-001', name: 'Rabies Vaccine', category: 'vaccination', description: 'Rabies vaccination', defaultPrice: 300, taxable: false, active: true, requiresClinicalRecord: true, durationMin: 15 },
  { code: 'VACC-002', name: '5-in-1 Vaccine', category: 'vaccination', description: 'DHPPiL vaccine for dogs', defaultPrice: 500, taxable: false, active: true, requiresClinicalRecord: true, durationMin: 15 },
  { code: 'VACC-003', name: '3-in-1 Vaccine', category: 'vaccination', description: 'FVRCP vaccine for cats', defaultPrice: 450, taxable: false, active: true, requiresClinicalRecord: true, durationMin: 15 },
  { code: 'VACC-004', name: 'Bordetella Vaccine', category: 'vaccination', description: 'Kennel cough vaccine', defaultPrice: 350, taxable: false, active: true, requiresClinicalRecord: true, durationMin: 15 },

  // Lab Tests
  { code: 'LAB-001', name: 'Complete Blood Count (CBC)', category: 'lab', description: 'Full blood workup', defaultPrice: 500, taxable: false, active: true, requiresClinicalRecord: true, durationMin: 30 },
  { code: 'LAB-002', name: 'Blood Chemistry Panel', category: 'lab', description: 'Comprehensive metabolic panel', defaultPrice: 800, taxable: false, active: true, requiresClinicalRecord: true, durationMin: 30 },
  { code: 'LAB-003', name: 'Urinalysis', category: 'lab', description: 'Urine analysis', defaultPrice: 300, taxable: false, active: true, requiresClinicalRecord: true, durationMin: 20 },
  { code: 'LAB-004', name: 'Fecal Exam', category: 'lab', description: 'Parasite screening', defaultPrice: 250, taxable: false, active: true, requiresClinicalRecord: true, durationMin: 20 },
  { code: 'LAB-005', name: 'Skin Scraping', category: 'lab', description: 'Dermatology test', defaultPrice: 400, taxable: false, active: true, requiresClinicalRecord: true, durationMin: 20 },

  // Diagnostics
  { code: 'DIAG-001', name: 'X-Ray (Single View)', category: 'diagnostic', description: 'Radiograph - one view', defaultPrice: 600, taxable: false, active: true, requiresClinicalRecord: true, durationMin: 30 },
  { code: 'DIAG-002', name: 'X-Ray (Multiple Views)', category: 'diagnostic', description: 'Radiograph - multiple views', defaultPrice: 1000, taxable: false, active: true, requiresClinicalRecord: true, durationMin: 45 },
  { code: 'DIAG-003', name: 'Ultrasound', category: 'diagnostic', description: 'Abdominal ultrasound', defaultPrice: 1200, taxable: false, active: true, requiresClinicalRecord: true, durationMin: 45 },
  { code: 'DIAG-004', name: 'ECG', category: 'diagnostic', description: 'Electrocardiogram', defaultPrice: 800, taxable: false, active: true, requiresClinicalRecord: true, durationMin: 30 },

  // Procedures
  { code: 'PROC-001', name: 'Spay (Ovariohysterectomy)', category: 'procedure', description: 'Female sterilization', defaultPrice: 3000, taxable: false, active: true, requiresClinicalRecord: true, durationMin: 120 },
  { code: 'PROC-002', name: 'Neuter (Orchiectomy)', category: 'procedure', description: 'Male sterilization', defaultPrice: 2500, taxable: false, active: true, requiresClinicalRecord: true, durationMin: 90 },
  { code: 'PROC-003', name: 'Dental Cleaning', category: 'procedure', description: 'Professional dental cleaning', defaultPrice: 1500, taxable: false, active: true, requiresClinicalRecord: true, durationMin: 60 },
  { code: 'PROC-004', name: 'Wound Repair', category: 'procedure', description: 'Laceration repair', defaultPrice: 800, taxable: false, active: true, requiresClinicalRecord: true, durationMin: 45 },
  { code: 'PROC-005', name: 'Mass Removal', category: 'procedure', description: 'Tumor/mass excision', defaultPrice: 2000, taxable: false, active: true, requiresClinicalRecord: true, durationMin: 90 },

  // Grooming
  { code: 'GROOM-001', name: 'Basic Grooming', category: 'grooming', description: 'Bath, brush, nail trim', defaultPrice: 800, taxable: false, active: true, requiresClinicalRecord: false, durationMin: 45 },
  { code: 'GROOM-002', name: 'Full Grooming', category: 'grooming', description: 'Bath, cut, style, nails', defaultPrice: 1200, taxable: false, active: true, requiresClinicalRecord: false, durationMin: 60 },
  { code: 'GROOM-003', name: 'Deshedding Treatment', category: 'grooming', description: 'Specialized deshedding', defaultPrice: 1500, taxable: false, active: true, requiresClinicalRecord: false, durationMin: 45 },

  // Medications
  { code: 'MED-001', name: 'Amoxicillin 250mg', category: 'medication', description: 'Antibiotic - 250mg tablets', defaultPrice: 25, taxable: true, active: true, requiresClinicalRecord: true, inventoryItemId: 'INV-AMOX-250' },
  { code: 'MED-002', name: 'Amoxicillin 500mg', category: 'medication', description: 'Antibiotic - 500mg tablets', defaultPrice: 40, taxable: true, active: true, requiresClinicalRecord: true, inventoryItemId: 'INV-AMOX-500' },
  { code: 'MED-003', name: 'Prednisone 5mg', category: 'medication', description: 'Anti-inflammatory - 5mg', defaultPrice: 30, taxable: true, active: true, requiresClinicalRecord: true, inventoryItemId: 'INV-PRED-5' },
  { code: 'MED-004', name: 'Metacam 1.5mg/ml', category: 'medication', description: 'NSAID oral suspension', defaultPrice: 350, taxable: true, active: true, requiresClinicalRecord: true, inventoryItemId: 'INV-MET-1.5' },
  { code: 'MED-005', name: 'Fluconazole 200mg', category: 'medication', description: 'Antifungal - 200mg', defaultPrice: 45, taxable: true, active: true, requiresClinicalRecord: true, inventoryItemId: 'INV-FLUC-200' },

  // Supplies/Consumables
  { code: 'SUPP-001', name: 'Syringe 3ml', category: 'supply', description: 'Disposable syringe', defaultPrice: 50, taxable: true, active: true, requiresClinicalRecord: false, inventoryItemId: 'INV-SYR-3ML' },
  { code: 'SUPP-002', name: 'Syringe 5ml', category: 'supply', description: 'Disposable syringe', defaultPrice: 60, taxable: true, active: true, requiresClinicalRecord: false, inventoryItemId: 'INV-SYR-5ML' },
  { code: 'SUPP-003', name: 'Needle 22G', category: 'supply', description: 'Disposable needle', defaultPrice: 10, taxable: true, active: true, requiresClinicalRecord: false, inventoryItemId: 'INV-NEED-22' },
  { code: 'SUPP-004', name: 'Gauze Pad', category: 'supply', description: 'Sterile gauze 5x5cm', defaultPrice: 15, taxable: true, active: true, requiresClinicalRecord: false, inventoryItemId: 'INV-GAUZ-5' },
  { code: 'SUPP-005', name: 'IV Catheter', category: 'supply', description: 'Intravenous catheter', defaultPrice: 120, taxable: true, active: true, requiresClinicalRecord: false, inventoryItemId: 'INV-IVCAT' },
  { code: 'SUPP-006', name: 'Bandage Roll', category: 'supply', description: 'Elastic bandage 5cm', defaultPrice: 80, taxable: true, active: true, requiresClinicalRecord: false, inventoryItemId: 'INV-BAND-5' },
]

async function seedServiceCatalog() {
  try {
    console.log('🌱 Starting service catalog seed...\n')
    
    // 1. Fetch existing doctors to map provider IDs
    const doctorsSnapshot = await getDocs(collection(db, 'doctors'))
    const doctors: Record<string, any> = {}
    doctorsSnapshot.forEach(doc => {
      doctors[doc.id] = { id: doc.id, ...doc.data() }
    })
    const allDoctorIds = Object.keys(doctors)
    console.log(`   Found ${allDoctorIds.length} doctors: ${allDoctorIds.join(', ')}`)

    // 2. Clear existing service_catalog
    const existingSnapshot = await getDocs(collection(db, 'service_catalog'))
    const deletes = existingSnapshot.docs.map(doc => deleteDoc(doc.ref))
    await Promise.all(deletes)
    console.log(`   Cleared ${deletes.length} existing services\n`)

    // 3. Create resources collection
    console.log('   Creating resources...')
    const resources = [
      { name: 'Exam Room 1', type: 'room', status: 'available', description: 'General consultation room' },
      { name: 'Exam Room 2', type: 'room', status: 'available', description: 'General consultation room' },
      { name: 'Surgical Suite', type: 'room', status: 'available', description: 'Operating room for procedures' },
      { name: 'Dental Room', type: 'room', status: 'available', description: 'Dental cleaning and procedures' },
      { name: 'Grooming Station', type: 'room', status: 'available', description: 'Pet grooming area' },
      { name: 'X-Ray Room', type: 'room', status: 'available', description: 'Radiology room' },
      { name: 'Ultrasound Machine', type: 'equipment', status: 'available', description: 'Portable ultrasound unit' },
      { name: 'ECG Machine', type: 'equipment', status: 'available', description: 'Electrocardiogram unit' },
      { name: 'Dental X-Ray', type: 'equipment', status: 'available', description: 'Intraoral radiography' },
      { name: 'Anesthesia Machine', type: 'equipment', status: 'available', description: 'Surgical anesthesia unit' },
      { name: 'Blood Analyzer', type: 'equipment', status: 'available', description: 'CBC and chemistry analyzer' },
      { name: 'Microscope', type: 'equipment', status: 'available', description: 'Lab microscopy unit' },
    ]
    
    for (const resource of resources) {
      await addDoc(collection(db, 'resources'), {
        ...resource,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      console.log(`   Created resource: ${resource.name} (${resource.type})`)
    }

    // Fetch resource IDs for mapping
    const resourcesSnapshot = await getDocs(collection(db, 'resources'))
    const resourcesByName: Record<string, string> = {}
    resourcesSnapshot.forEach(doc => {
      resourcesByName[doc.data().name] = doc.id
    })
    console.log('')

    // 4. Define service-provider mapping (based on doctor specializations)
    // Doctor IDs: '1'='Dr. Sarah Johnson (Cardiologist)', '2'='Dr. Michael Chen (Emergency)', 
    //             '3'='Dr. Emily Rodriguez (Preventive)', '4'='Dr. James Wilson (Surgeon)', 
    //             '5'='Dr. Lisa Park (Exotic)', '6'='Dr. David Miller (Rehabilitation)'
    
    const serviceProviders: Record<string, string[]> = {
      // Consultations - all doctors can do general/follow-up
      'CONS-001': allDoctorIds, // General Consultation - everyone
      'CONS-002': allDoctorIds, // Follow-up - everyone
      'CONS-003': ['2'],         // Emergency - only Dr. Michael Chen (Emergency)
      
      // Vaccinations - preventive care doctors
      'VACC-001': ['1', '3'], // Rabies
      'VACC-002': ['1', '3'], // 5-in-1
      'VACC-003': ['1', '3'], // 3-in-1
      'VACC-004': ['1', '3'], // Bordetella
      
      // Lab tests - general doctors
      'LAB-001': allDoctorIds, // CBC
      'LAB-002': allDoctorIds, // Blood Chemistry
      'LAB-003': ['1', '3'], // Urinalysis
      'LAB-004': ['1', '3'], // Fecal Exam
      'LAB-005': ['1', '3'], // Skin Scraping
      
      // Diagnostics
      'DIAG-001': ['1', '4'], // X-Ray - needs radiology
      'DIAG-002': ['1', '4'], // X-Ray multiple
      'DIAG-003': ['1'],       // Ultrasound - cardiologist
      'DIAG-004': ['1'],       // ECG - cardiologist
      
      // Procedures
      'PROC-001': ['4'],       // Spay - surgeon only
      'PROC-002': ['4'],       // Neuter - surgeon only
      'PROC-003': ['1', '4'], // Dental - general/surgeon
      'PROC-004': ['1', '4'], // Wound Repair
      'PROC-005': ['4'],       // Mass Removal - surgeon
      
      // Grooming - not doctors, but we'll allow general doctors to schedule
      'GROOM-001': allDoctorIds,
      'GROOM-002': allDoctorIds,
      'GROOM-003': allDoctorIds,
      
      // Medications - all doctors can prescribe
      'MED-001': allDoctorIds,
      'MED-002': allDoctorIds,
      'MED-003': allDoctorIds,
      'MED-004': allDoctorIds,
      'MED-005': allDoctorIds,
      
      // Supplies - all doctors
      'SUPP-001': allDoctorIds,
      'SUPP-002': allDoctorIds,
      'SUPP-003': allDoctorIds,
      'SUPP-004': allDoctorIds,
      'SUPP-005': allDoctorIds,
      'SUPP-006': allDoctorIds,
    }

    // 5. Define service-resource mapping
    const serviceResources: Record<string, string[]> = {
      'DIAG-001': [resourcesByName['X-Ray Room']], // X-Ray Single
      'DIAG-002': [resourcesByName['X-Ray Room']], // X-Ray Multiple
      'DIAG-003': [resourcesByName['Ultrasound Machine']], // Ultrasound
      'DIAG-004': [resourcesByName['ECG Machine']], // ECG
      'PROC-001': [resourcesByName['Surgical Suite'], resourcesByName['Anesthesia Machine']], // Spay
      'PROC-002': [resourcesByName['Surgical Suite'], resourcesByName['Anesthesia Machine']], // Neuter
      'PROC-003': [resourcesByName['Dental Room'], resourcesByName['Dental X-Ray']], // Dental
      'GROOM-001': [resourcesByName['Grooming Station']], // Basic Grooming
      'GROOM-002': [resourcesByName['Grooming Station']], // Full Grooming
      'GROOM-003': [resourcesByName['Grooming Station']], // Deshedding
      'LAB-001': [resourcesByName['Blood Analyzer']], // CBC
      'LAB-002': [resourcesByName['Blood Analyzer']], // Blood Chemistry
    }

    // 6. Seed services with provider/resource mapping
    let added = 0
    let skipped = 0
    
    console.log('   Seeding services with provider/resource mapping...\n')
    
    for (const service of services) {
      const allowedProviders = serviceProviders[service.code] || allDoctorIds
      const requiredResources = serviceResources[service.code] || []
      
      await addDoc(collection(db, 'service_catalog'), {
        ...service,
        allowedProviderIds: allowedProviders,
        requiredResourceIds: requiredResources,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      
      const providerNames = allowedProviders.map(id => doctors[id]?.name || id).join(', ')
      const resourceNames = requiredResources.map(id => {
        const res = resourcesSnapshot.docs.find(d => d.id === id)
        return res ? res.data().name : ''
      }).filter(Boolean).join(', ')
      
      console.log(`   ✓ ${service.code} - ${service.name}`)
      console.log(`     Providers: ${providerNames}`)
      if (resourceNames) console.log(`     Resources: ${resourceNames}`)
      console.log('')
      
      added++
    }
    
    console.log('🎉 Seed complete!')
    console.log(`   Added: ${added} services`)
    console.log(`   Resources: ${resources.length}`)
    console.log(`   Doctors: ${allDoctorIds.length}`)
    
  } catch (error) {
    console.error('Error seeding service catalog:', error)
  }
}

seedServiceCatalog()

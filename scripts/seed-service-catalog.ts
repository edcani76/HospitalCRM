import { db, collection, addDoc, getDocs, query, where } from '../src/firebase'
import { ServiceCatalogItem } from '../src/types'

const services: Omit<ServiceCatalogItem, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // Consultations
  { code: 'CONS-001', name: 'General Consultation', category: 'consultation', description: 'Standard veterinary consultation', defaultPrice: 500, taxable: false, active: true, requiresClinicalRecord: true },
  { code: 'CONS-002', name: 'Follow-up Consultation', category: 'consultation', description: 'Follow-up visit', defaultPrice: 400, taxable: false, active: true, requiresClinicalRecord: true },
  { code: 'CONS-003', name: 'Emergency Consultation', category: 'consultation', description: 'Emergency veterinary consultation', defaultPrice: 1000, taxable: false, active: true, requiresClinicalRecord: true },

  // Vaccinations
  { code: 'VACC-001', name: 'Rabies Vaccine', category: 'vaccination', description: 'Rabies vaccination', defaultPrice: 300, taxable: false, active: true, requiresClinicalRecord: true },
  { code: 'VACC-002', name: '5-in-1 Vaccine', category: 'vaccination', description: 'DHPPiL vaccine for dogs', defaultPrice: 500, taxable: false, active: true, requiresClinicalRecord: true },
  { code: 'VACC-003', name: '3-in-1 Vaccine', category: 'vaccination', description: 'FVRCP vaccine for cats', defaultPrice: 450, taxable: false, active: true, requiresClinicalRecord: true },
  { code: 'VACC-004', name: 'Bordetella Vaccine', category: 'vaccination', description: 'Kennel cough vaccine', defaultPrice: 350, taxable: false, active: true, requiresClinicalRecord: true },

  // Lab Tests
  { code: 'LAB-001', name: 'Complete Blood Count (CBC)', category: 'lab', description: 'Full blood workup', defaultPrice: 500, taxable: false, active: true, requiresClinicalRecord: true },
  { code: 'LAB-002', name: 'Blood Chemistry Panel', category: 'lab', description: 'Comprehensive metabolic panel', defaultPrice: 800, taxable: false, active: true, requiresClinicalRecord: true },
  { code: 'LAB-003', name: 'Urinalysis', category: 'lab', description: 'Urine analysis', defaultPrice: 300, taxable: false, active: true, requiresClinicalRecord: true },
  { code: 'LAB-004', name: 'Fecal Exam', category: 'lab', description: 'Parasite screening', defaultPrice: 250, taxable: false, active: true, requiresClinicalRecord: true },
  { code: 'LAB-005', name: 'Skin Scraping', category: 'lab', description: 'Dermatology test', defaultPrice: 400, taxable: false, active: true, requiresClinicalRecord: true },

  // Diagnostics
  { code: 'DIAG-001', name: 'X-Ray (Single View)', category: 'diagnostic', description: 'Radiograph - one view', defaultPrice: 600, taxable: false, active: true, requiresClinicalRecord: true },
  { code: 'DIAG-002', name: 'X-Ray (Multiple Views)', category: 'diagnostic', description: 'Radiograph - multiple views', defaultPrice: 1000, taxable: false, active: true, requiresClinicalRecord: true },
  { code: 'DIAG-003', name: 'Ultrasound', category: 'diagnostic', description: 'Abdominal ultrasound', defaultPrice: 1200, taxable: false, active: true, requiresClinicalRecord: true },
  { code: 'DIAG-004', name: 'ECG', category: 'diagnostic', description: 'Electrocardiogram', defaultPrice: 800, taxable: false, active: true, requiresClinicalRecord: true },

  // Procedures
  { code: 'PROC-001', name: 'Spay (Ovariohysterectomy)', category: 'procedure', description: 'Female sterilization', defaultPrice: 3000, taxable: false, active: true, requiresClinicalRecord: true },
  { code: 'PROC-002', name: 'Neuter (Orchiectomy)', category: 'procedure', description: 'Male sterilization', defaultPrice: 2500, taxable: false, active: true, requiresClinicalRecord: true },
  { code: 'PROC-003', name: 'Dental Cleaning', category: 'procedure', description: 'Professional dental cleaning', defaultPrice: 1500, taxable: false, active: true, requiresClinicalRecord: true },
  { code: 'PROC-004', name: 'Wound Repair', category: 'procedure', description: 'Laceration repair', defaultPrice: 800, taxable: false, active: true, requiresClinicalRecord: true },
  { code: 'PROC-005', name: 'Mass Removal', category: 'procedure', description: 'Tumor/mass excision', defaultPrice: 2000, taxable: false, active: true, requiresClinicalRecord: true },

  // Grooming
  { code: 'GROOM-001', name: 'Basic Grooming', category: 'grooming', description: 'Bath, brush, nail trim', defaultPrice: 800, taxable: false, active: true, requiresClinicalRecord: false },
  { code: 'GROOM-002', name: 'Full Grooming', category: 'grooming', description: 'Bath, cut, style, nails', defaultPrice: 1200, taxable: false, active: true, requiresClinicalRecord: false },
  { code: 'GROOM-003', name: 'Deshedding Treatment', category: 'grooming', description: 'Specialized deshedding', defaultPrice: 1500, taxable: false, active: true, requiresClinicalRecord: false },

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
    console.log('Starting service catalog seed...')
    
    const existingSnapshot = await getDocs(collection(db, 'service_catalog'))
    const existingCodes = new Set(existingSnapshot.docs.map(doc => doc.data().code))
    
    console.log(`Found ${existingSnapshot.size} existing services`)
    
    let added = 0
    let skipped = 0
    
    for (const service of services) {
      if (existingCodes.has(service.code)) {
        console.log(`Skipping ${service.code} - already exists`)
        skipped++
        continue
      }
      
      await addDoc(collection(db, 'service_catalog'), {
        ...service,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      
      console.log(`Added: ${service.code} - ${service.name} (₱${service.defaultPrice})`)
      added++
    }
    
    console.log(`\nSeed complete!`)
    console.log(`Added: ${added} services`)
    console.log(`Skipped: ${skipped} services (already exist)`)
    console.log(`Total: ${added + skipped} services`)
    
  } catch (error) {
    console.error('Error seeding service catalog:', error)
  }
}

seedServiceCatalog()

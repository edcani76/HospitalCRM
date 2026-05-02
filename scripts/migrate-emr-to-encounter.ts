import { db, collection, getDocs, addDoc, serverTimestamp, updateDoc, doc } from '../src/firebase'
import { query, where } from '../src/firebase'

interface OldEMRRecord {
  id: string
  petId: string
  petName: string
  clientUid?: string
  doctorId?: string
  doctorName?: string
  appointmentId?: string
  date?: string
  time?: string
  status?: string
  type?: string
  vitals?: any
  diagnosis?: string
  treatment?: string
  prescriptions?: any[]
  labResults?: any[]
  notes?: string
  services?: any[]
  createdAt?: any
  updatedAt?: any
}

interface NewEncounter {
  appointmentId: string
  petId: string
  patientId?: string // same as petId
  ownerId?: string
  doctorId?: string
  startedAt: Date | string
  completedAt?: Date | string | null
  status: string
  vitals: {
    weightKg: number
    temperatureC: number
    heartRateBpm: number
    respiratoryRateRpm: number
    mmColor: string
    crtSeconds: number
    notes: string
  }
  clinicalNotes: {
    subjective: string
    objective: string
    assessment: string
    plan: string
    diagnosis: string
    doctorNotes: string
    followUpInstructions: string
  }
  createdBy: string
  createdAt: any
  updatedAt: any
}

async function migrateEMRToEncounter() {
  try {
    console.log('Starting EMR to Encounter migration...')
    
    // 1. Fetch all existing EMR records
    const emrSnapshot = await getDocs(collection(db, 'emrRecords'))
    const emrRecords = emrSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }) as OldEMRRecord[])
    
    console.log(`Found ${emrRecords.length} EMR records to migrate`)
    
    if (emrRecords.length === 0) {
      console.log('No EMR records to migrate')
      return
    }
    
    let migrated = 0
    let skipped = 0
    
    for (const emr of emrRecords) {
      try {
        // Check if encounter already exists for this appointment
        if (emr.appointmentId) {
          const existingQuery = query(
            collection(db, 'encounters'),
            where('appointmentId', '==', emr.appointmentId)
          )
          const existingSnapshot = await getDocs(existingQuery)
          if (!existingSnapshot.empty) {
            console.log(`Skipping EMR ${emr.id} - encounter already exists for appointment ${emr.appointmentId}`)
            skipped++
            continue
          }
        }
        
        // Create new encounter from EMR record
        const encounterData: NewEncounter = {
          appointmentId: emr.appointmentId || '',
          petId: emr.petId,
          patientId: emr.petId, // same as petId
          ownerId: emr.clientUid || '',
          doctorId: emr.doctorId || '',
          startedAt: emr.createdAt?.toDate?.() || new Date(emr.date || Date.now()),
          completedAt: emr.status === 'completed' ? (emr.updatedAt?.toDate?.() || new Date()) : null,
          status: mapEMRStatusToEncounter(emr.status || 'in-progress'),
          
          // Map vitals
          vitals: {
            weightKg: emr.vitals?.weight || 0,
            temperatureC: emr.vitals?.temperature || 0,
            heartRateBpm: emr.vitals?.heartRate || 0,
            respiratoryRateRpm: emr.vitals?.respiratoryRate || 0,
            mmColor: emr.vitals?.mmColor || '',
            crtSeconds: emr.vitals?.crt || 0,
            notes: emr.vitals?.notes || ''
          },
          
          // Map clinical notes
          clinicalNotes: {
            subjective: '',
            objective: emr.vitals ? JSON.stringify(emr.vitals) : '',
            assessment: emr.diagnosis || '',
            plan: emr.treatment || '',
            diagnosis: emr.diagnosis || '',
            doctorNotes: emr.notes || '',
            followUpInstructions: ''
          },
          
          createdBy: emr.doctorId || 'unknown',
          createdAt: emr.createdAt || serverTimestamp(),
          updatedAt: emr.updatedAt || serverTimestamp()
        }
        
        const encounterRef = await addDoc(collection(db, 'encounters'), encounterData)
        console.log(`Migrated EMR ${emr.id} → Encounter ${encounterRef.id}`)
        
        // Migrate services if they exist
        if (emr.services && emr.services.length > 0) {
          for (const service of emr.services) {
            await addDoc(collection(db, 'appointment_services'), {
              appointmentId: emr.appointmentId || '',
              encounterId: encounterRef.id,
              petId: emr.petId,
              ownerId: emr.clientUid || '',
              serviceCatalogId: '',
              serviceCode: service.name?.substring(0, 3)?.toUpperCase() || 'CON',
              serviceName: service.name || 'Unknown Service',
              serviceType: mapServiceType(service.name || ''),
              status: service.status || 'completed',
              source: 'pre-booked',
              billable: true,
              quantity: service.quantity || 1,
              unitPrice: service.fee || 0,
              discountAmount: 0,
              taxRate: 0,
              performedBy: emr.doctorId || '',
              completedAt: service.endTime ? new Date(service.endTime) : null,
              createdBy: emr.doctorId || 'unknown',
              createdAt: service.startTime ? new Date(service.startTime) : new Date(),
              updatedAt: new Date()
            })
          }
          console.log(`  → Migrated ${emr.services.length} services`)
        }
        
        // Migrate prescriptions if they exist
        if (emr.prescriptions && emr.prescriptions.length > 0) {
          for (const rx of emr.prescriptions) {
            await addDoc(collection(db, 'prescriptions'), {
              encounterId: encounterRef.id,
              patientId: emr.petId,
              appointmentServiceId: '',
              medicationName: rx.medication || 'Unknown',
              medicationCatalogId: '',
              dosage: rx.dosage || '',
              frequency: rx.frequency || '',
              duration: rx.duration || '',
              quantityPrescribed: rx.quantity || 1,
              instructions: rx.instructions || '',
              status: 'prescribed',
              prescribedBy: emr.doctorId || '',
              prescribedAt: emr.createdAt?.toDate?.() || new Date()
            })
          }
          console.log(`  → Migrated ${emr.prescriptions.length} prescriptions`)
        }
        
        migrated++
        
      } catch (error) {
        console.error(`Error migrating EMR ${emr.id}:`, error)
        skipped++
      }
    }
    
    console.log(`\nMigration complete!`)
    console.log(`Migrated: ${migrated} records`)
    console.log(`Skipped: ${skipped} records`)
    
  } catch (error) {
    console.error('Migration failed:', error)
  }
}

function mapEMRStatusToEncounter(status: string): string {
  switch (status) {
    case 'in-progress': return 'in-progress'
    case 'completed': return 'completed'
    default: return 'draft'
  }
}

function mapServiceType(name: string): string {
  const lowerName = name.toLowerCase()
  if (lowerName.includes('consult')) return 'consultation'
  if (lowerName.includes('groom')) return 'grooming'
  if (lowerName.includes('vacc')) return 'vaccination'
  if (lowerName.includes('lab') || lowerName.includes('cbc')) return 'lab'
  if (lowerName.includes('x-ray') || lowerName.includes('xray') || lowerName.includes('ultrasound')) return 'diagnostic'
  if (lowerName.includes('spay') || lowerName.includes('neuter') || lowerName.includes('dental')) return 'procedure'
  if (lowerName.includes('med') || lowerName.includes('amox')) return 'medication'
  return 'consultation'
}

migrateEMRToEncounter()

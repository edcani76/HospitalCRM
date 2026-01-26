const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Initialize Gemini AI
const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

console.log("🔥 Hospital CRM Server starting...");
console.log(`🤖 Gemini AI: ${genAI ? 'Configured' : 'Not configured (add GEMINI_API_KEY to .env)'}`);

// =============================================================================
// MIDDLEWARE
// =============================================================================

app.use(cors({
  origin: process.env.CORS_ORIGIN || ['http://localhost:5173', 'http://localhost:5175'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Request logging (development only)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

// Root route - show server info
app.get('/', (req, res) => {
  res.json({
    success: true,
    name: 'VitaCare Hospital CRM API',
    version: '1.0.0',
    geminiAI: !!process.env.GEMINI_API_KEY,
    endpoints: {
      health: 'GET /api/health',
      patients: 'GET /api/patients',
      doctors: 'GET /api/doctors',
      aiChat: 'POST /api/ai/chat',
      aiSymptoms: 'POST /api/ai/symptoms',
      aiMedication: 'POST /api/ai/medication'
    }
  });
});

const generatePatientId = () => {
  return `PAT-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
};

// Healthcare system prompt for AI
const HEALTHCARE_SYSTEM_PROMPT = `You are a helpful medical assistant AI for VitaCare Hospital CRM. 
You provide information to help healthcare professionals with:
- General health information and medical terminology
- Symptom analysis suggestions (not diagnoses)
- Drug interaction awareness
- Patient care best practices

IMPORTANT DISCLAIMERS:
- Always remind users that AI suggestions are not replacements for professional medical judgment
- Recommend consulting with specialists for complex cases
- Never provide definitive diagnoses - only suggestions for consideration
- Encourage proper medical testing and examination

Be professional, concise, and helpful.`;

// =============================================================================
// PATIENT ROUTES
// =============================================================================

// Get all patients
app.get('/api/patients', async (req, res) => {
  try {
    const patients = await prisma.patient.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: patients });
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch patients' });
  }
});

// Get patient by ID
app.get('/api/patients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        activities: {
          include: { doctor: true },
          orderBy: { date: 'desc' }
        }
      }
    });

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    res.json({ success: true, data: patient });
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch patient' });
  }
});

// Create new patient
app.post('/api/patients', async (req, res) => {
  try {
    const { name, dateOfBirth, gender, bloodType, contact, email, address, emergencyContact, medicalHistory, status = 'Active' } = req.body;

    if (!name || !dateOfBirth || !gender || !bloodType || !contact) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, dateOfBirth, gender, bloodType, contact'
      });
    }

    const parsedDate = new Date(dateOfBirth);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date format for dateOfBirth' });
    }

    const patient = await prisma.patient.create({
      data: {
        patientId: generatePatientId(),
        name,
        dateOfBirth: parsedDate,
        gender,
        bloodType,
        contact,
        email: email || null,
        address: address || null,
        emergencyContact: emergencyContact || null,
        medicalHistory: medicalHistory || null,
        status
      }
    });

    res.status(201).json({ success: true, data: patient, message: 'Patient created successfully' });
  } catch (error) {
    console.error('Error creating patient:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Patient with this information already exists' });
    }
    res.status(500).json({ success: false, message: 'Failed to create patient' });
  }
});

// Update patient
app.put('/api/patients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (updateData.dateOfBirth) {
      updateData.dateOfBirth = new Date(updateData.dateOfBirth);
    }

    const patient = await prisma.patient.update({
      where: { id },
      data: updateData
    });

    res.json({ success: true, data: patient, message: 'Patient updated successfully' });
  } catch (error) {
    console.error('Error updating patient:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }
    res.status(500).json({ success: false, message: 'Failed to update patient' });
  }
});

// Delete patient
app.delete('/api/patients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.patient.delete({ where: { id } });
    res.json({ success: true, message: 'Patient deleted successfully' });
  } catch (error) {
    console.error('Error deleting patient:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }
    res.status(500).json({ success: false, message: 'Failed to delete patient' });
  }
});

// =============================================================================
// ACTIVITY ROUTES
// =============================================================================

// Get recent activities
app.get('/api/activities', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const activities = await prisma.activity.findMany({
      take: parseInt(limit),
      orderBy: { date: 'desc' },
      include: {
        patient: { select: { name: true } },
        doctor: { select: { name: true } }
      }
    });
    res.json({ success: true, data: activities });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch activities' });
  }
});

// Create new activity
app.post('/api/activities', async (req, res) => {
  try {
    const { patientId, doctorId, diagnosis, notes, department, date } = req.body;

    if (!patientId || !doctorId || !diagnosis || !department) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: patientId, doctorId, diagnosis, department'
      });
    }

    const activity = await prisma.activity.create({
      data: {
        patientId,
        doctorId,
        diagnosis,
        notes: notes || null,
        department,
        date: date ? new Date(date) : new Date()
      },
      include: {
        patient: { select: { name: true } },
        doctor: { select: { name: true } }
      }
    });

    res.status(201).json({ success: true, data: activity, message: 'Activity created successfully' });
  } catch (error) {
    console.error('Error creating activity:', error);
    res.status(500).json({ success: false, message: 'Failed to create activity' });
  }
});

// =============================================================================
// DOCTOR ROUTES
// =============================================================================

// Get all doctors
app.get('/api/doctors', async (req, res) => {
  try {
    const doctors = await prisma.doctor.findMany({
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: doctors });
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch doctors' });
  }
});

// Create doctor
app.post('/api/doctors', async (req, res) => {
  try {
    const { name, speciality, department } = req.body;

    if (!name || !department) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, department'
      });
    }

    const doctor = await prisma.doctor.create({
      data: {
        name,
        speciality: speciality || null,
        department
      }
    });

    res.status(201).json({ success: true, data: doctor, message: 'Doctor created successfully' });
  } catch (error) {
    console.error('Error creating doctor:', error);
    res.status(500).json({ success: false, message: 'Failed to create doctor' });
  }
});

// =============================================================================
// AI / GEMINI ROUTES
// =============================================================================

// General AI Chat
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    if (!genAI) {
      // Mock response when API key not configured
      return res.json({
        success: true,
        data: {
          response: `I understand you're asking about: "${message}". This is a demo response - please configure GEMINI_API_KEY in your .env file for real AI responses.`,
          isDemo: true
        }
      });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Build conversation context as a single prompt
    let contextPrompt = HEALTHCARE_SYSTEM_PROMPT + '\n\n';

    // Add conversation history if exists
    if (conversationHistory && conversationHistory.length > 0) {
      contextPrompt += 'Previous conversation:\n';
      conversationHistory.forEach(msg => {
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        contextPrompt += `${role}: ${msg.content}\n`;
      });
      contextPrompt += '\n';
    }

    contextPrompt += `User: ${message}\n\nAssistant:`;

    const result = await model.generateContent(contextPrompt);
    const response = result.response.text();

    res.json({ success: true, data: { response, isDemo: false } });
  } catch (error) {
    console.error('Error in AI chat:', error);
    res.status(500).json({ success: false, message: 'AI service temporarily unavailable' });
  }
});

// Symptom Analysis
app.post('/api/ai/symptoms', async (req, res) => {
  try {
    const { symptoms, patientInfo } = req.body;

    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
      return res.status(400).json({ success: false, message: 'Symptoms array is required' });
    }

    if (!genAI) {
      return res.json({
        success: true,
        data: {
          analysis: `Analysis requested for symptoms: ${symptoms.join(', ')}. Configure GEMINI_API_KEY for real analysis.`,
          suggestions: ['Configure API key for detailed analysis'],
          isDemo: true
        }
      });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `${HEALTHCARE_SYSTEM_PROMPT}

Analyze these symptoms for a healthcare professional:
Symptoms: ${symptoms.join(', ')}
${patientInfo ? `Patient Info: ${JSON.stringify(patientInfo)}` : ''}

Provide:
1. Possible conditions to consider (not diagnoses)
2. Recommended tests or examinations
3. Red flags to watch for
4. General care suggestions

Format your response in clear sections.`;

    const result = await model.generateContent(prompt);
    const analysis = result.response.text();

    res.json({ success: true, data: { analysis, symptoms, isDemo: false } });
  } catch (error) {
    console.error('Error in symptom analysis:', error);
    res.status(500).json({ success: false, message: 'AI service temporarily unavailable' });
  }
});

// Medication Info
app.post('/api/ai/medication', async (req, res) => {
  try {
    const { medications, query } = req.body;

    if (!medications && !query) {
      return res.status(400).json({ success: false, message: 'Medications or query is required' });
    }

    if (!genAI) {
      return res.json({
        success: true,
        data: {
          info: `Query about: ${medications?.join(', ') || query}. Configure GEMINI_API_KEY for real information.`,
          isDemo: true
        }
      });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `${HEALTHCARE_SYSTEM_PROMPT}

${medications ? `Check for interactions between: ${medications.join(', ')}` : ''}
${query ? `Medical query: ${query}` : ''}

Provide helpful information for healthcare professionals. Include relevant warnings and recommendations.`;

    const result = await model.generateContent(prompt);
    const info = result.response.text();

    res.json({ success: true, data: { info, isDemo: false } });
  } catch (error) {
    console.error('Error in medication query:', error);
    res.status(500).json({ success: false, message: 'AI service temporarily unavailable' });
  }
});

// =============================================================================
// UTILITY ROUTES
// =============================================================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    geminiConfigured: !!genAI,
    timestamp: new Date().toISOString()
  });
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

// 404 handler - must be last route handler (Express 5 doesn't support '*')
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Something went wrong!' });
});

// =============================================================================
// SERVER START
// =============================================================================

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down server...');
  await prisma.$disconnect();
  process.exit(0);
});
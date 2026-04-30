import type { ReactNode } from 'react';

type Service = {
  name: string;
  icon: ReactNode;
  desc: string;
  equipment?: string[];
};

const iconClassName = "w-10 h-10";

function ServiceIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={iconClassName}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const services: Service[] = [
  {
    name: "Preventive Care",
    icon: (
      <ServiceIcon>
        <path d="M14 17c0-5 4-9 10-9s10 4 10 9c0 8-10 15-10 15S14 25 14 17Z" />
        <path d="M20 17h8" />
        <path d="M24 13v8" />
        <path d="M14 35c6 4 14 4 20 0" />
      </ServiceIcon>
    ),
    desc: "Routine exams, vaccines, parasite prevention, and wellness planning that help keep pets healthier for longer.",
    equipment: ["Digital Wellness Scanning", "Automated Vaccine Dispensers", "Electronic Health Trackers"],
  },
  {
    name: "Diagnostic Medicine",
    icon: (
      <ServiceIcon>
        <path d="M18 35h16" />
        <path d="M26 11v8" />
        <path d="M20 11h12" />
        <path d="M22 35l4-16 8 4-8 12" />
        <path d="M13 31c2-4 6-6 11-5" />
      </ServiceIcon>
    ),
    desc: "Clear answers through physical exams, laboratory testing, imaging, and other tools tailored to your pet's symptoms.",
    equipment: ["High-Resolution MRI", "Multislice CT Scanner", "Automated Bio-Analyzers"],
  },
  {
    name: "Outpatient and Inpatient Hospital Care",
    icon: (
      <ServiceIcon>
        <path d="M11 35h26" />
        <path d="M14 35V17h20v18" />
        <path d="M20 17v-5h8v5" />
        <path d="M20 26h8" />
        <path d="M24 22v8" />
      </ServiceIcon>
    ),
    desc: "Supportive treatment for stable visits and monitored hospital care when a condition needs closer attention.",
    equipment: ["Continuous Vital Monitors", "Smart Infusion Pumps", "Oxygen Enrichment Cages"],
  },
  {
    name: "Surgery",
    icon: (
      <ServiceIcon>
        <path d="M15 33l18-18" />
        <path d="M15 15l18 18" />
        <circle cx="13" cy="13" r="4" />
        <circle cx="35" cy="13" r="4" />
        <path d="M22 26l-6 6" />
      </ServiceIcon>
    ),
    desc: "Planned and referral surgical care with careful preparation, anesthesia monitoring, and recovery support.",
    equipment: ["CO2 Laser Scalpels", "Laparoscopic Towers", "Advanced Anesthetic Stations"],
  },
  {
    name: "Avian and Exotic Pet Care",
    icon: (
      <ServiceIcon>
        <path d="M14 30c2-11 10-17 22-18-1 12-7 20-18 22" />
        <path d="M18 34c-4-2-6-5-6-9 0-6 5-11 11-11" />
        <path d="M28 16l4 4" />
        <path d="M19 34l-4 5" />
        <path d="M25 31l3 5" />
      </ServiceIcon>
    ),
    desc: "Thoughtful veterinary care for birds, reptiles, and other companion species beyond dogs and cats.",
    equipment: ["Exotic Incubation Systems", "Microsurgical Instruments", "Species-Specific Nebulizers"],
  },
  {
    name: "After-Hours Emergency Care",
    icon: (
      <ServiceIcon>
        <path d="M14 24h20" />
        <path d="M24 14v20" />
        <path d="M24 7a17 17 0 1 0 0 34 17 17 0 0 0 0-34Z" />
      </ServiceIcon>
    ),
    desc: "Evening emergency support for urgent cases that cannot wait until the next regular clinic day.",
    equipment: ["Rapid Point-of-Care Labs", "Emergency Ventilators", "Mobile Resuscitation Units"],
  },
  {
    name: "Therapy and Rehabilitation",
    icon: (
      <ServiceIcon>
        <path d="M12 34c7-10 17-10 24 0" />
        <path d="M17 27c4-4 10-4 14 0" />
        <path d="M20 18h8" />
        <path d="M24 14v8" />
        <circle cx="24" cy="24" r="15" />
      </ServiceIcon>
    ),
    desc: "Recovery programs that build strength, ease discomfort, and improve mobility after injury, surgery, or chronic illness.",
    equipment: ["Underwater Treadmills", "Cold Laser Therapy Units", "Shockwave Therapy Systems"],
  },
  {
    name: "Pet Export Assistance",
    icon: (
      <ServiceIcon>
        <path d="M10 30h28" />
        <path d="M15 30l7-14h10l7 14" />
        <path d="M20 38h16" />
        <path d="M24 16v-5h6v5" />
        <path d="M18 24h16" />
      </ServiceIcon>
    ),
    desc: "Guidance on travel paperwork, health requirements, and veterinary documentation for international pet relocation.",
    equipment: ["Global Compliance Database", "IATA-Certified Scanning", "Digital Certification Portal"],
  },
  {
    name: "Grooming, Boarding and Retail",
    icon: (
      <ServiceIcon>
        <path d="M14 12v24" />
        <path d="M10 16h8" />
        <path d="M10 24h8" />
        <path d="M10 32h8" />
        <path d="M27 15h9v21h-9z" />
        <path d="M29 15l2-5h2l2 5" />
        <path d="M29 25h5" />
      </ServiceIcon>
    ),
    desc: "Convenient grooming, comfortable boarding options, and essential pet care products in one familiar place.",
    equipment: ["Hydromassage Bath Systems", "Climate-Controlled Suites", "UV Sterilization Cabinets"],
  },
  {
    name: "Special Procedures",
    icon: (
      <ServiceIcon>
        <path d="M10 31h28" />
        <path d="M13 31V14h22v17" />
        <path d="M17 24h5l3-6 4 10 3-4h3" />
        <path d="M19 37h10" />
        <path d="M24 31v6" />
      </ServiceIcon>
    ),
    desc: "Advanced options such as specialty imaging, allergy testing, dental radiography, laser care, and regenerative therapies.",
    equipment: ["3D Dental Radiography", "Regenerative Stem-Cell Lab", "High-Power Therapy Lasers"],
  },
];

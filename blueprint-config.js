// ═══════════════════════════════════════════════════════════════
// BUILTSY BLUEPRINT CONFIG
// One entry per industry. blueprint-industry.html reads this
// via ?type=slug in the URL and self-configures.
//
// To add a new industry: copy any block, change the slug key,
// update the fields, done. Everything else is automatic.
// ═══════════════════════════════════════════════════════════════

var BUILTSY_CONFIGS = {

  // ─────────────────────────────────────────────
  'private-lessons': {
    // Nav + header
    label:          'Private Lessons',
    navLabel:       'Private Lessons',
    icon:           '🎵',
    storageKey:     'builtsy-bp-lessons-v1',

    // Step 1 — panel header
    step1Title:     'Tell us about your teaching',
    step1Sub:       'No jargon. Just what you do and who you do it for.',

    // Step 1 — subject selector
    subjectSectionLabel: 'What do you teach?',
    subjectOptions: [
      { icon:'🎵', name:'Music',    desc:'Guitar, piano, voice…' },
      { icon:'📚', name:'Academic', desc:'Math, SAT, reading…' },
      { icon:'⚽', name:'Sports',   desc:'Soccer, tennis…' },
      { icon:'💪', name:'Fitness',  desc:'Yoga, training, pilates…' },
      { icon:'🎨', name:'Arts',     desc:'Painting, dance…' },
      { icon:'🌎', name:'Language', desc:'Spanish, ESL…' },
      { icon:'✨', name:'Other',    desc:'Cooking, chess…' }
    ],

    // Step 1 — text fields
    namePlaceholder:     'e.g. Sarah Chen Music Studio',
    nameLabel:           'Your name or business name',
    specificLabel:       'What specifically do you teach?',
    specificPlaceholder: 'e.g. Piano & Music Theory',
    clientLabel:         'Who are your ideal students?',
    clientPlaceholder:   'e.g. Kids ages 5–15 and adult beginners',
    clientChips:         ['Ages 5–8','Ages 9–14','Teens','Adults','Seniors','All ages','Beginners','Intermediate','Advanced'],
    credentialLabel:     'Credentials',
    credentialPlaceholder: 'e.g. 10 years teaching, Berklee graduate',

    // Step 1 — location
    locationSectionLabel: 'Where do you teach?',
    locationOptions: [
      { icon:'🏠', name:'In-person', desc:'Studio, home, or local venue' },
      { icon:'💻', name:'Online',    desc:'Zoom or video platform' },
      { icon:'🌐', name:'Both',      desc:'Flexible — your call' }
    ],

    // Step 2 — pricing
    pricingLabel:    'Offer & Pricing',
    pricingTabLabel: 'Sessions',
    sessionRows: [
      { name:'30-Minute Lesson',  duration:'30 min', defaultPrice: 45 },
      { name:'60-Minute Lesson',  duration:'60 min', defaultPrice: 75 },
      { name:'90-Minute Lesson',  duration:'90 min', defaultPrice: 110 }
    ],
    packageRows: [
      { name:'Starter Pack',   sessions: 4,  defaultPrice: 160 },
      { name:'Monthly Bundle', sessions: 8,  defaultPrice: 280 },
      { name:'Intensive',      sessions: 12, defaultPrice: 380 }
    ],
    signatureNameLabel:   'Signature service name',
    signatureNamePlaceholder: 'e.g. "The Piano Journey"',
    taglinePlaceholder:  'e.g. From first note to performance',
    differentiatorLabel: 'What makes you different?',
    differentiatorPlaceholder: 'e.g. I specialize in nervous beginners and make lessons fun',

    // Step 3 — features
    featuresCallout: {
      tag:  '✨ Builtsy signature',
      body: 'The <strong>Interactive Pricing Builder</strong> lets visitors build their own package — price updates live.'
    },
    toggles: [
      { id:'t-interactive', label:'🎯 Interactive Pricing Builder', desc:'Live price calculator on your site', default: true },
      { id:'t-booking',     label:'📅 Online Booking',              desc:'Calendly booking integration — live on your site', default: true, hasField: 'calendly' },
      { id:'t-sms',         label:'💬 SMS Reminders',               desc:'Automated text reminders', default: false },
      { id:'t-testimonials',label:'⭐ Testimonials',                desc:'Paste real reviews from students or parents', default: true, hasField: 'testimonials' },
      { id:'t-faq',         label:'❓ FAQ Section',                 desc:'Answer questions before they ask', default: true },
      { id:'t-contact',     label:'📧 Intake Form',                 desc:'Capture student info before booking', default: true }
    ],
    calendlyLabel:   'Your Calendly URL',
    calendlyPlaceholder: 'e.g. calendly.com/sarahspiano',

    // Add-ons
    addonSuggestions: {
      Music:    ['Recital prep (+$20/session)','Music theory workbook (+$15)','Recording session (+$40)','Sheet music library (+$10/mo)','Travel fee (+$15)','Sibling discount (-$10/session)'],
      Academic: ['Practice test set (+$25)','Study guide (+$15)','Parent progress report (+$10)','Weekend session (+$20)','Rush booking (+$30)','Group session (-$15/student)'],
      Sports:   ['Video analysis (+$30)','Training gear rental (+$10)','Tournament prep (+$40/session)','Nutrition plan (+$50)','Travel to venue (+$20)','Sibling discount (-$10)'],
      Fitness:  ['Meal plan (+$40)','Progress photos (+$15)','Equipment rental (+$10/session)','Home visit (+$25)','Recorded workout (+$20)','Buddy session (-$10/person)'],
      Arts:     ['Art supply kit (+$30)','Portfolio review (+$25)','Framing consultation (+$20)','Take-home project (+$15)','Studio rental (+$35)','Group class (-$15/person)'],
      Language: ['Conversation recording (+$20)','Custom phrase guide (+$15)','Cultural immersion pack (+$40)','Travel prep session (+$30)','Exam prep (+$25)','Group session (-$10/student)'],
      Other:    ['Materials kit (+$25)','Take-home resources (+$15)','Progress assessment (+$20)','Rush booking (+$30)','Travel fee (+$15)','Group discount (-$10/person)']
    },

    // Prompt — industry context injected into Claude brief
    promptBusinessLabel: 'Subject / specialty',
    promptClientLabel:   'Ideal students',
    promptLocationLabel: 'Teaching format',
    promptPricingLabel:  'Lesson rates',
    promptIndustryNote:  'This is a private lessons / tutoring business. The site should feel personal, encouraging, and results-oriented. Emphasis on the teacher\'s story, credentials, and student outcomes. The pricing section should use an interactive lesson-builder pattern.',

    // Suggested palette (shown first in design step)
    suggestedPalette: 'Lavender Studio'
  },

  // ─────────────────────────────────────────────
  'caretaker': {
    label:      'Caretaker & Home Care',
    navLabel:   'Caretaker',
    icon:       '🤝',
    storageKey: 'builtsy-bp-caretaker-v1',

    step1Title: 'Tell us about your care services',
    step1Sub:   'Who you care for and how you show up for them.',

    subjectSectionLabel: 'What type of care do you provide?',
    subjectOptions: [
      { icon:'👴', name:'Senior Care',    desc:'In-home elderly care…' },
      { icon:'👶', name:'Child Care',     desc:'Babysitting, nanny…' },
      { icon:'♿', name:'Special Needs',  desc:'Disability support…' },
      { icon:'🏥', name:'Medical Support',desc:'Post-surgery, recovery…' },
      { icon:'🐾', name:'Pet Care',       desc:'Dog walking, pet sitting…' },
      { icon:'✨', name:'Other',          desc:'Companion care, errands…' }
    ],

    namePlaceholder:     'e.g. Gentle Hands Home Care',
    nameLabel:           'Your name or business name',
    specificLabel:       'What specific services do you offer?',
    specificPlaceholder: 'e.g. In-home senior care, light housekeeping',
    clientLabel:         'Who do you typically care for?',
    clientPlaceholder:   'e.g. Seniors 65+, families with young children',
    clientChips:         ['Seniors','Children','Adults','Special needs','Post-surgery','Overnight stays','Weekend availability','Flexible hours'],
    credentialLabel:     'Certifications & experience',
    credentialPlaceholder: 'e.g. CNA certified, 8 years experience, CPR trained',

    locationSectionLabel: 'Where do you provide care?',
    locationOptions: [
      { icon:'🏠', name:"Client's home", desc:'You travel to them' },
      { icon:'🏢', name:'Your facility',  desc:'Clients come to you' },
      { icon:'🌐', name:'Both',           desc:'Flexible arrangement' }
    ],

    pricingLabel:    'Offer & Pricing',
    pricingTabLabel: 'Services',
    sessionRows: [
      { name:'4-Hour Visit',    duration:'4 hrs',  defaultPrice: 80 },
      { name:'Full Day',        duration:'8 hrs',  defaultPrice: 150 },
      { name:'Overnight Stay',  duration:'12 hrs', defaultPrice: 200 }
    ],
    packageRows: [
      { name:'Weekly Package',   sessions: 3, defaultPrice: 380 },
      { name:'Monthly Package',  sessions: 12, defaultPrice: 1350 },
      { name:'Full-Time Care',   sessions: 20, defaultPrice: 2200 }
    ],
    signatureNameLabel:       'Your signature service name',
    signatureNamePlaceholder: 'e.g. "The Comfort Care Plan"',
    taglinePlaceholder:       'e.g. Compassionate care, right at home',
    differentiatorLabel:      'What makes your care different?',
    differentiatorPlaceholder:'e.g. I treat every client like family — consistent, reliable, and kind',

    featuresCallout: {
      tag:  '✨ Builtsy signature',
      body: 'The <strong>Interactive Care Estimator</strong> lets families build a care plan and see pricing live — no back and forth.'
    },
    toggles: [
      { id:'t-interactive', label:'🎯 Interactive Care Estimator', desc:'Live pricing calculator on your site', default: true },
      { id:'t-booking',     label:'📅 Consultation Booking',       desc:'Calendly scheduling — live on your site', default: true, hasField: 'calendly' },
      { id:'t-sms',         label:'💬 SMS Reminders',              desc:'Appointment reminders for families', default: false },
      { id:'t-testimonials',label:'⭐ Family Testimonials',        desc:'Paste real reviews from families', default: true, hasField: 'testimonials' },
      { id:'t-faq',         label:'❓ FAQ Section',                desc:'Answer concerns before they ask', default: true },
      { id:'t-contact',     label:'📧 Intake Form',                desc:'Capture care needs before the first call', default: true }
    ],
    calendlyLabel:       'Your Calendly or booking URL',
    calendlyPlaceholder: 'e.g. calendly.com/gentlehands',

    addonSuggestions: {
      'Senior Care':    ['Medication reminders (+$10/day)','Light housekeeping (+$20)','Grocery runs (+$15)','Doctor appointment transport (+$25)','Weekend premium (+$20/day)','Live-in care (+$50/day)'],
      'Child Care':     ['Homework help (+$15/hr)','School pickup (+$20)','Meal prep (+$10)','Weekend rate (+$15/hr)','Holiday rate (+$20/hr)','Multiple children (-$10)'],
      'Special Needs':  ['Behavioral support (+$20/hr)','Therapy coordination (+$15)','Documentation report (+$25)','Transportation (+$20)','Overnight support (+$40)','Emergency coverage (+$30)'],
      'Medical Support':['Wound care (+$30)','Medication management (+$20)','Physical therapy assist (+$25)','Post-op meal prep (+$15)','Family updates (+$10)','Weekend coverage (+$30)'],
      'Pet Care':       ['Extra walks (+$10)','Grooming (+$25)','Vet transport (+$20)','Holiday rate (+$15)','Multiple pets (-$10)','Overnight stay (+$35)'],
      'Other':          ['Travel fee (+$15)','Holiday rate (+$20/hr)','Last-minute booking (+$25)','Weekend premium (+$15)','Extra hours (+$20/hr)','Family meeting (+$10)']
    },

    promptBusinessLabel: 'Type of care provided',
    promptClientLabel:   'Who they care for',
    promptLocationLabel: 'Care location',
    promptPricingLabel:  'Care rates',
    promptIndustryNote:  'This is a caregiving / home care business. The site should feel warm, trustworthy, and reassuring — families are making a deeply personal decision. Emphasize reliability, compassion, and the caregiver\'s personal story. Social proof (testimonials, certifications) is critical.',

    suggestedPalette: 'Warm Local'
  },

  // ─────────────────────────────────────────────
  'service-provider': {
    label:      'Service Provider',
    navLabel:   'Service Provider',
    icon:       '🔧',
    storageKey: 'builtsy-bp-service-v1',

    step1Title: 'Tell us about your business',
    step1Sub:   'What you do, where you do it, and who you do it for.',

    subjectSectionLabel: 'What type of services do you offer?',
    subjectOptions: [
      { icon:'🔧', name:'Plumbing',      desc:'Repairs, installs, emergency…' },
      { icon:'⚡', name:'Electrical',    desc:'Wiring, panels, lighting…' },
      { icon:'❄️', name:'HVAC',          desc:'Heating, cooling, air quality…' },
      { icon:'🏗️', name:'Construction', desc:'Remodels, additions, repairs…' },
      { icon:'🌿', name:'Landscaping',   desc:'Lawn, design, irrigation…' },
      { icon:'🧹', name:'Cleaning',      desc:'Residential or commercial…' },
      { icon:'✨', name:'Other',         desc:'Describe your trade…' }
    ],

    namePlaceholder:     'e.g. Parker Plumbing Co.',
    nameLabel:           'Business name',
    specificLabel:       'What specific services do you offer?',
    specificPlaceholder: 'e.g. Water heater installs, drain cleaning, leak repairs',
    clientLabel:         'Who do you typically serve?',
    clientPlaceholder:   'e.g. Homeowners and small businesses in Parker, CO',
    clientChips:         ['Homeowners','Renters','Small businesses','Commercial','Residential','Emergency calls','New construction','Renovations'],
    credentialLabel:     'Licenses & certifications',
    credentialPlaceholder: 'e.g. Licensed & insured, 15 years in business, EPA certified',

    locationSectionLabel: 'How do you work?',
    locationOptions: [
      { icon:'🚗', name:'We come to you', desc:'On-site service calls' },
      { icon:'🏢', name:'Shop / studio',  desc:'Clients bring work to you' },
      { icon:'🌐', name:'Both',           desc:'Shop + on-site' }
    ],

    pricingLabel:    'Offer & Pricing',
    pricingTabLabel: 'Services',
    sessionRows: [
      { name:'Service Call',      duration:'1-2 hrs', defaultPrice: 95 },
      { name:'Standard Job',      duration:'Half day', defaultPrice: 350 },
      { name:'Full Day Service',  duration:'Full day', defaultPrice: 650 }
    ],
    packageRows: [
      { name:'Basic Package',     sessions: 1,  defaultPrice: 199 },
      { name:'Standard Package',  sessions: 3,  defaultPrice: 499 },
      { name:'Premium Package',   sessions: 5,  defaultPrice: 850 }
    ],
    signatureNameLabel:       'Signature service name',
    signatureNamePlaceholder: 'e.g. "The Complete Plumbing Checkup"',
    taglinePlaceholder:       'e.g. Done right the first time',
    differentiatorLabel:      'What makes you different?',
    differentiatorPlaceholder:'e.g. Same-day service, upfront pricing, no hidden fees',

    featuresCallout: {
      tag:  '✨ Builtsy signature',
      body: 'The <strong>Interactive Service Estimator</strong> lets visitors build their own service quote — price updates live before they ever call.'
    },
    toggles: [
      { id:'t-interactive', label:'🎯 Service Estimator',       desc:'Live price estimator on your site', default: true },
      { id:'t-booking',     label:'📅 Online Scheduling',       desc:'Calendly or booking link — live on your site', default: true, hasField: 'calendly' },
      { id:'t-sms',         label:'💬 SMS Reminders',           desc:'Appointment confirmations and reminders', default: false },
      { id:'t-testimonials',label:'⭐ Customer Reviews',        desc:'Paste real reviews from clients', default: true, hasField: 'testimonials' },
      { id:'t-faq',         label:'❓ FAQ Section',             desc:'Answer questions before they call', default: true },
      { id:'t-contact',     label:'📧 Quote Request Form',      desc:'Capture job details before the first call', default: true }
    ],
    calendlyLabel:       'Your booking or scheduling URL',
    calendlyPlaceholder: 'e.g. calendly.com/parkerplumbing',

    addonSuggestions: {
      Plumbing:     ['Emergency/after-hours (+$75)','Same-day service (+$50)','Senior/military discount (-$20)','Annual maintenance plan (+$99/yr)','Parts & materials (cost + 15%)','Weekend rate (+$40)'],
      Electrical:   ['Panel upgrade quote (+$0)','Emergency callout (+$85)','Smart home setup (+$120)','Code inspection (+$60)','Same-day (+$55)','Senior discount (-$15)'],
      HVAC:         ['Tune-up (+$89)','Filter replacement (+$25)','Extended warranty (+$150/yr)','Emergency service (+$95)','Air quality test (+$45)','Annual plan (+$199/yr)'],
      Construction: ['Design consultation (+$150)','Material sourcing (+10%)','Permit filing (+$75)','Weekend work (+$200/day)','Rush timeline (+15%)','Cleanup service (+$50)'],
      Landscaping:  ['Seasonal cleanup (+$150)','Irrigation check (+$75)','Fertilization (+$60)','Tree trimming (+$120)','Weed control (+$45)','Snow removal (+$85)'],
      Cleaning:     ['Deep clean (+$80)','Move-in/out (+$120)','Window washing (+$60)','Carpet cleaning (+$100)','Same-week booking (+$30)','Monthly subscription (-$20)'],
      Other:        ['Emergency/rush (+$75)','Weekend rate (+$40)','Senior discount (-$15)','Annual plan (+$99/yr)','Materials (+cost)','Travel fee (+$25)']
    },

    promptBusinessLabel: 'Service type',
    promptClientLabel:   'Target customers',
    promptLocationLabel: 'Service area / method',
    promptPricingLabel:  'Service rates',
    promptIndustryNote:  'This is a local service / trades business. The site should feel professional, trustworthy, and action-oriented. Homeowners and businesses need to quickly trust this contractor. Emphasize licensing, years of experience, response time, and local presence. The CTA should be highly visible — phone number, booking link, or quote form above the fold.',

    suggestedPalette: 'Trust & Pro'
  },

  // ─────────────────────────────────────────────
  'health-wellness': {
    label:      'Health & Wellness',
    navLabel:   'Health & Wellness',
    icon:       '🌿',
    storageKey: 'builtsy-bp-health-v1',

    step1Title: 'Tell us about your practice',
    step1Sub:   'Your specialty, your approach, and who you help.',

    subjectSectionLabel: 'What do you specialize in?',
    subjectOptions: [
      { icon:'💆', name:'Massage',        desc:'Therapeutic, sports, deep tissue…' },
      { icon:'🧘', name:'Yoga / Pilates', desc:'Classes, private sessions…' },
      { icon:'🌿', name:'Nutrition',      desc:'Dietitian, health coaching…' },
      { icon:'🧠', name:'Mental Health',  desc:'Counseling, therapy…' },
      { icon:'💉', name:'Acupuncture',    desc:'TCM, holistic healing…' },
      { icon:'🏃', name:'Physical Therapy',desc:'Rehab, injury recovery…' },
      { icon:'✨', name:'Other',          desc:'Naturopath, energy healing…' }
    ],

    namePlaceholder:     'e.g. Bloom Wellness Studio',
    nameLabel:           'Practice or business name',
    specificLabel:       'What are your specific modalities or services?',
    specificPlaceholder: 'e.g. Swedish massage, prenatal, deep tissue',
    clientLabel:         'Who do you typically work with?',
    clientPlaceholder:   'e.g. Adults managing chronic pain, new moms, athletes',
    clientChips:         ['Athletes','Seniors','New moms','Chronic pain','Stress & anxiety','Injury recovery','General wellness','Couples'],
    credentialLabel:     'Credentials & training',
    credentialPlaceholder: 'e.g. LMT, 500hr RYT, 12 years in practice',

    locationSectionLabel: 'Where do you practice?',
    locationOptions: [
      { icon:'🏢', name:'My studio',     desc:'Clients come to you' },
      { icon:'🏠', name:'Mobile / in-home', desc:'You travel to clients' },
      { icon:'💻', name:'Virtual / both', desc:'Remote or hybrid' }
    ],

    pricingLabel:    'Offer & Pricing',
    pricingTabLabel: 'Sessions',
    sessionRows: [
      { name:'30-Minute Session', duration:'30 min', defaultPrice: 65 },
      { name:'60-Minute Session', duration:'60 min', defaultPrice: 110 },
      { name:'90-Minute Session', duration:'90 min', defaultPrice: 155 }
    ],
    packageRows: [
      { name:'Intro Package',  sessions: 3, defaultPrice: 295 },
      { name:'Wellness Pack',  sessions: 6, defaultPrice: 580 },
      { name:'Monthly Plan',   sessions: 8, defaultPrice: 740 }
    ],
    signatureNameLabel:       'Signature offering name',
    signatureNamePlaceholder: 'e.g. "The Deep Reset Session"',
    taglinePlaceholder:       'e.g. Restore balance. Feel like yourself again.',
    differentiatorLabel:      'What makes your approach different?',
    differentiatorPlaceholder:'e.g. I integrate breathwork with massage for a complete reset',

    featuresCallout: {
      tag:  '✨ Builtsy signature',
      body: 'The <strong>Interactive Session Builder</strong> lets visitors customize their treatment and see pricing live — booking feels personal from the start.'
    },
    toggles: [
      { id:'t-interactive', label:'🎯 Interactive Session Builder', desc:'Live pricing calculator on your site', default: true },
      { id:'t-booking',     label:'📅 Online Booking',              desc:'Calendly booking — live on your site', default: true, hasField: 'calendly' },
      { id:'t-sms',         label:'💬 Appointment Reminders',       desc:'SMS reminders for clients', default: false },
      { id:'t-testimonials',label:'⭐ Client Testimonials',         desc:'Paste real reviews from clients', default: true, hasField: 'testimonials' },
      { id:'t-faq',         label:'❓ FAQ Section',                 desc:'Answer common questions before they book', default: true },
      { id:'t-contact',     label:'📧 Intake Form',                 desc:'Health intake before the first session', default: true }
    ],
    calendlyLabel:       'Your booking link',
    calendlyPlaceholder: 'e.g. calendly.com/bloomwellness',

    addonSuggestions: {
      Massage:           ['Add-on: hot stones (+$20)','Aromatherapy (+$15)','Prenatal upgrade (+$10)','Couples session (+$40)','Mobile/in-home (+$30)','Package of 3 (-$20)'],
      'Yoga / Pilates':  ['Private session upgrade (+$40)','Recorded class (+$20)','Retreat day (+$150)','Partner session (+$30)','Foam roller kit (+$25)','Monthly membership (-$15/mo)'],
      Nutrition:         ['Meal plan (+$60)','Grocery list guide (+$20)','Follow-up call (+$25)','Lab review (+$40)','Supplement plan (+$35)','Group webinar (-$15)'],
      'Mental Health':   ['Extended session (+$40)','Emergency slot (+$75)','Written summary (+$25)','Partner session (+$50)','Sliding scale (varies)','Group session (-$20)'],
      Acupuncture:       ['Cupping (+$25)','Herbal consult (+$30)','Gua sha (+$20)','Extended treatment (+$35)','Package of 4 (-$30)','New patient intake (+$0)'],
      'Physical Therapy':['Home program (+$30)','Equipment loan (+$10)','Progress report (+$20)','Sports clearance (+$40)','Group class (-$15)','Telehealth visit (-$20)'],
      Other:             ['Consultation (+$50)','Follow-up (+$30)','Take-home materials (+$25)','Package deal (-$20)','Group rate (-$15/person)','Workshop (+$75)']
    },

    promptBusinessLabel: 'Specialty / modality',
    promptClientLabel:   'Ideal clients',
    promptLocationLabel: 'Practice setting',
    promptPricingLabel:  'Session rates',
    promptIndustryNote:  'This is a health and wellness practice. The site should feel calm, professional, and nurturing. Visitors are often managing pain, stress, or recovery. Build trust through credentials, testimonials, and a clear description of what to expect. The booking experience should feel frictionless and welcoming.',

    suggestedPalette: 'Sage Light'
  },

  // ─────────────────────────────────────────────
  'beauty': {
    label:      'Beauty & Personal Care',
    navLabel:   'Beauty',
    icon:       '💅',
    storageKey: 'builtsy-bp-beauty-v1',

    step1Title: 'Tell us about your salon or studio',
    step1Sub:   'Your specialty, your vibe, and who you make feel amazing.',

    subjectSectionLabel: 'What do you specialize in?',
    subjectOptions: [
      { icon:'✂️', name:'Hair',          desc:'Cuts, color, styling…' },
      { icon:'💅', name:'Nails',         desc:'Manicure, gel, nail art…' },
      { icon:'😍', name:'Lashes & Brows',desc:'Extensions, tinting, microblading…' },
      { icon:'🧖', name:'Skin Care',     desc:'Facials, peels, treatments…' },
      { icon:'💄', name:'Makeup',        desc:'Bridal, events, lessons…' },
      { icon:'✨', name:'Other',         desc:'Waxing, massage, spray tan…' }
    ],

    namePlaceholder:     'e.g. Studio by Jamie',
    nameLabel:           'Salon or studio name',
    specificLabel:       'What specific services do you offer?',
    specificPlaceholder: 'e.g. Balayage, highlights, keratin treatments',
    clientLabel:         'Who do you love working with?',
    clientPlaceholder:   'e.g. Women 25–45, bridal clients, professionals',
    clientChips:         ['Brides','Women','Men','Teens','Color clients','Extension clients','Natural looks','Transformations'],
    credentialLabel:     'Certifications & experience',
    credentialPlaceholder: 'e.g. Licensed cosmetologist, 8 years, Wella certified',

    locationSectionLabel: 'Where do you work?',
    locationOptions: [
      { icon:'🏢', name:'My salon/studio', desc:'Clients come to you' },
      { icon:'🏠', name:'Mobile',          desc:'You travel to clients' },
      { icon:'🌐', name:'Both',            desc:'Studio + mobile' }
    ],

    pricingLabel:    'Offer & Pricing',
    pricingTabLabel: 'Services',
    sessionRows: [
      { name:'Signature Service', duration:'60–90 min', defaultPrice: 120 },
      { name:'Premium Service',   duration:'2–3 hrs',   defaultPrice: 220 },
      { name:'Full Experience',   duration:'Half day',  defaultPrice: 380 }
    ],
    packageRows: [
      { name:'Starter Package',  sessions: 2, defaultPrice: 200 },
      { name:'VIP Package',      sessions: 4, defaultPrice: 380 },
      { name:'Membership',       sessions: 6, defaultPrice: 550 }
    ],
    signatureNameLabel:       'Signature service name',
    signatureNamePlaceholder: 'e.g. "The Glow Up Package"',
    taglinePlaceholder:       'e.g. Look how you want to feel',
    differentiatorLabel:      'What makes your work different?',
    differentiatorPlaceholder:'e.g. I specialize in color correction and lived-in looks',

    featuresCallout: {
      tag:  '✨ Builtsy signature',
      body: 'The <strong>Interactive Service Builder</strong> lets clients build their look and see pricing before they book — confidence from the first click.'
    },
    toggles: [
      { id:'t-interactive', label:'🎯 Interactive Service Builder', desc:'Live pricing on your site', default: true },
      { id:'t-booking',     label:'📅 Online Booking',              desc:'Calendly or booking link on your site', default: true, hasField: 'calendly' },
      { id:'t-sms',         label:'💬 Appointment Reminders',       desc:'SMS reminders for clients', default: false },
      { id:'t-testimonials',label:'⭐ Client Reviews',              desc:'Paste real reviews', default: true, hasField: 'testimonials' },
      { id:'t-faq',         label:'❓ FAQ Section',                 desc:'Answer common questions before they book', default: true },
      { id:'t-contact',     label:'📧 New Client Form',             desc:'Capture client needs and preferences', default: true }
    ],
    calendlyLabel:       'Your booking link',
    calendlyPlaceholder: 'e.g. calendly.com/studiobyjamie',

    addonSuggestions: {
      Hair:           ['Gloss treatment (+$35)','Toner (+$25)','Deep conditioning (+$20)','Blowout (+$30)','Same-week booking (+$15)','Bridal surcharge (+$75)'],
      Nails:          ['Nail art (+$15–30)','Gel upgrade (+$15)','Remove & redo (+$10)','Hand massage (+$10)','Dip powder (+$20)','Pedicure add-on (+$30)'],
      'Lashes & Brows':['Tint add-on (+$20)','Lamination (+$45)','Removal & redo (+$15)','Lip wax (+$12)','Same-day (+$20)','Fill upgrade (+$15)'],
      'Skin Care':    ['LED therapy (+$30)','Dermaplaning (+$40)','Peel upgrade (+$35)','Eye treatment (+$20)','Extractions (+$15)','Take-home kit (+$40)'],
      Makeup:         ['Airbrush upgrade (+$45)','Lashes (+$15)','Trials (+$80)','Second look (+$60)','Bridal party (-$10/person)','Travel fee (+$35)'],
      Other:          ['Premium products (+$20)','Express service (-$15)','Group discount (-$10/person)','Holiday surcharge (+$25)','Mobile fee (+$30)','Package deal (-$20)']
    },

    promptBusinessLabel: 'Beauty specialty',
    promptClientLabel:   'Ideal clients',
    promptLocationLabel: 'Work location',
    promptPricingLabel:  'Service rates',
    promptIndustryNote:  'This is a beauty / personal care business. The site should feel aspirational, polished, and confidence-inspiring. Visitors want to feel excited and trust your aesthetic eye. Gallery photos and visual portfolio are critical. The booking experience should feel effortless and luxurious.',

    suggestedPalette: 'Soft Pink'
  },

  // ─────────────────────────────────────────────
  'fitness': {
    label:      'Fitness & Sports',
    navLabel:   'Fitness',
    icon:       '🏋️',
    storageKey: 'builtsy-bp-fitness-v1',

    step1Title: 'Tell us about your training',
    step1Sub:   'Your specialty, your methods, and who you train.',

    subjectSectionLabel: 'What do you specialize in?',
    subjectOptions: [
      { icon:'🏋️', name:'Personal Training', desc:'1-on-1 coaching, strength…' },
      { icon:'🧘', name:'Yoga',               desc:'Vinyasa, hot yoga, restorative…' },
      { icon:'🏃', name:'Run / Endurance',    desc:'5K to marathon coaching…' },
      { icon:'⚽', name:'Sports Coaching',    desc:'Youth or adult team sports…' },
      { icon:'🥊', name:'Martial Arts',       desc:'Boxing, BJJ, kickboxing…' },
      { icon:'✨', name:'Other',              desc:'CrossFit, HIIT, dance fitness…' }
    ],

    namePlaceholder:     'e.g. Apex Fitness by Marcus',
    nameLabel:           'Your name or gym name',
    specificLabel:       'What specifically do you train or teach?',
    specificPlaceholder: 'e.g. Strength & conditioning, weight loss, athletic performance',
    clientLabel:         'Who do you train?',
    clientPlaceholder:   'e.g. Adults 30–55, busy professionals, youth athletes',
    clientChips:         ['Beginners','Athletes','Weight loss','Muscle building','Seniors','Youth','Post-injury','Competition prep'],
    credentialLabel:     'Certifications',
    credentialPlaceholder: 'e.g. NASM CPT, 10 years coaching, former D1 athlete',

    locationSectionLabel: 'Where do you train clients?',
    locationOptions: [
      { icon:'🏋️', name:'My gym / studio', desc:'Clients come to you' },
      { icon:'🏠', name:'Client\'s home',  desc:'In-home training' },
      { icon:'🌐', name:'Online / hybrid', desc:'Virtual or both' }
    ],

    pricingLabel:    'Offer & Pricing',
    pricingTabLabel: 'Sessions',
    sessionRows: [
      { name:'30-Minute Session', duration:'30 min', defaultPrice: 55 },
      { name:'60-Minute Session', duration:'60 min', defaultPrice: 90 },
      { name:'90-Minute Session', duration:'90 min', defaultPrice: 130 }
    ],
    packageRows: [
      { name:'Jump Start (4)',   sessions: 4,  defaultPrice: 320 },
      { name:'Monthly (8)',      sessions: 8,  defaultPrice: 620 },
      { name:'Transformation (16)', sessions: 16, defaultPrice: 1100 }
    ],
    signatureNameLabel:       'Signature program name',
    signatureNamePlaceholder: 'e.g. "The 90-Day Transformation"',
    taglinePlaceholder:       'e.g. Train harder. Live better.',
    differentiatorLabel:      'What makes your coaching different?',
    differentiatorPlaceholder:'e.g. I build programs around your life, not a cookie-cutter plan',

    featuresCallout: {
      tag:  '✨ Builtsy signature',
      body: 'The <strong>Interactive Training Estimator</strong> lets prospects build their own program and see investment before they commit.'
    },
    toggles: [
      { id:'t-interactive', label:'🎯 Training Estimator',     desc:'Live program pricing on your site', default: true },
      { id:'t-booking',     label:'📅 Free Consult Booking',   desc:'Calendly link on your site', default: true, hasField: 'calendly' },
      { id:'t-sms',         label:'💬 Session Reminders',      desc:'SMS reminders for clients', default: false },
      { id:'t-testimonials',label:'⭐ Client Results',         desc:'Paste real transformation stories', default: true, hasField: 'testimonials' },
      { id:'t-faq',         label:'❓ FAQ Section',            desc:'Answer common questions', default: true },
      { id:'t-contact',     label:'📧 Fitness Assessment Form',desc:'Capture goals before the first call', default: true }
    ],
    calendlyLabel:       'Your booking or consult link',
    calendlyPlaceholder: 'e.g. calendly.com/apexfitness',

    addonSuggestions: {
      'Personal Training': ['Nutrition guide (+$40)','Progress photos (+$15)','Home workout plan (+$30)','Video form check (+$20)','Partner session (-$10/person)','In-home (+$25)'],
      Yoga:                ['Yoga mat rental (+$5)','Recorded class (+$15)','Workshop (+$45)','Retreat deposit (+$150)','Partner session (+$20)','Monthly pass (-$10)'],
      'Run / Endurance':   ['Race plan (+$50)','Nutrition plan (+$40)','Video gait analysis (+$35)','Group run (-$15)','Track session (+$20)','Marathon prep (+$80)'],
      'Sports Coaching':   ['Video analysis (+$30)','Tournament prep (+$50)','Skills camp (+$75)','Sibling discount (-$15)','Group session (-$10/player)','Travel (+$20)'],
      'Martial Arts':      ['Gear rental (+$10)','Competition prep (+$50)','Private drill (+$30)','Belt test (+$25)','Family discount (-$10)','Seminar (+$60)'],
      Other:               ['Meal plan (+$40)','Progress report (+$20)','Equipment (+$25)','Travel fee (+$20)','Partner rate (-$10/person)','Online check-in (+$15)']
    },

    promptBusinessLabel: 'Training specialty',
    promptClientLabel:   'Target clients',
    promptLocationLabel: 'Training location',
    promptPricingLabel:  'Training rates',
    promptIndustryNote:  'This is a fitness / sports coaching business. The site should feel energetic, motivational, and results-focused. Visitors want to feel inspired and confident. Show transformation results, client testimonials, and a clear path from where they are to where they want to be. The booking CTA should feel like an exciting first step.',

    suggestedPalette: 'Navy & Fire'
  },

  // ─────────────────────────────────────────────
  'food-hospitality': {
    label:      'Food & Hospitality',
    navLabel:   'Food & Hospitality',
    icon:       '🍽️',
    storageKey: 'builtsy-bp-food-v1',

    step1Title: 'Tell us about your food business',
    step1Sub:   'Your cuisine, your vibe, and who you feed.',

    subjectSectionLabel: 'What type of food business?',
    subjectOptions: [
      { icon:'🍽️', name:'Restaurant',   desc:'Dine-in, counter service…' },
      { icon:'🎂', name:'Bakery / Café', desc:'Pastries, coffee, sweets…' },
      { icon:'🍱', name:'Catering',      desc:'Events, weddings, corporate…' },
      { icon:'👨‍🍳', name:'Private Chef', desc:'In-home dining experiences…' },
      { icon:'🚚', name:'Food Truck',    desc:'Mobile, market, pop-up…' },
      { icon:'✨', name:'Other',         desc:'Meal prep, pop-up, supper club…' }
    ],

    namePlaceholder:     'e.g. The Copper Spoon Kitchen',
    nameLabel:           'Restaurant or business name',
    specificLabel:       'What type of cuisine or specialty?',
    specificPlaceholder: 'e.g. New American, farm-to-table, wood-fired pizza',
    clientLabel:         'Who are your typical guests or customers?',
    clientPlaceholder:   'e.g. Date night couples, corporate events, families',
    clientChips:         ['Date night','Families','Corporate','Bridal parties','Foodies','Lunch crowd','Weekend brunch','Special diets'],
    credentialLabel:     'Awards, press & credentials',
    credentialPlaceholder: 'e.g. Best of Parker 2024, featured in Denver Post, trained in Paris',

    locationSectionLabel: 'How do you operate?',
    locationOptions: [
      { icon:'🏠', name:'Dine-in location', desc:'Fixed restaurant or café' },
      { icon:'🚗', name:'We come to you',   desc:'Catering or food truck' },
      { icon:'🌐', name:'Both',             desc:'Location + catering' }
    ],

    pricingLabel:    'Offer & Pricing',
    pricingTabLabel: 'Options',
    sessionRows: [
      { name:'Prix Fixe / Set Menu',  duration:'Per person', defaultPrice: 55 },
      { name:'Private Event',         duration:'Per person', defaultPrice: 85 },
      { name:'Full Catering Package', duration:'Per person', defaultPrice: 120 }
    ],
    packageRows: [
      { name:'Small Event (20)',    sessions: 20,  defaultPrice: 1400 },
      { name:'Medium Event (50)',   sessions: 50,  defaultPrice: 3500 },
      { name:'Large Event (100+)',  sessions: 100, defaultPrice: 6500 }
    ],
    signatureNameLabel:       'Signature dish or experience name',
    signatureNamePlaceholder: 'e.g. "The Chef\'s Tasting Experience"',
    taglinePlaceholder:       'e.g. Where every bite tells a story',
    differentiatorLabel:      'What makes your food or experience unique?',
    differentiatorPlaceholder:'e.g. Everything is locally sourced and made from scratch daily',

    featuresCallout: {
      tag:  '✨ Builtsy signature',
      body: 'The <strong>Interactive Event Builder</strong> lets guests estimate catering costs live — perfect for event inquiries.'
    },
    toggles: [
      { id:'t-interactive', label:'🎯 Event Estimator',        desc:'Live pricing for events and catering', default: true },
      { id:'t-booking',     label:'📅 Reservation / Booking',  desc:'Booking link on your site', default: true, hasField: 'calendly' },
      { id:'t-sms',         label:'💬 Reservation Reminders',  desc:'SMS reminders for reservations', default: false },
      { id:'t-testimonials',label:'⭐ Guest Reviews',          desc:'Paste real reviews and press', default: true, hasField: 'testimonials' },
      { id:'t-faq',         label:'❓ FAQ Section',            desc:'Dietary info, policies, parking…', default: true },
      { id:'t-contact',     label:'📧 Event Inquiry Form',     desc:'Capture event details and headcount', default: true }
    ],
    calendlyLabel:       'Your reservation or booking link',
    calendlyPlaceholder: 'e.g. resy.com/coperspoon or calendly.com/cateringbyname',

    addonSuggestions: {
      Restaurant:    ['Wine pairing (+$25/person)','Private dining room (+$150)','Chef\'s tasting upgrade (+$35/person)','Birthday setup (+$50)','Parking validation (+$0)','Corkage fee (-$15)'],
      'Bakery / Café':['Custom cake (+$85+)','Wholesale box (-$10)','Catering tray (+$60)','Delivery (+$15)','Custom design (+$25)','Dietary upgrade (+$8)'],
      Catering:      ['Bar service (+$20/person)','Rentals (linens, etc. +$15/person)','Staffing (+$25/hr/server)','Gratuity (18%)','Setup/teardown (+$200)','Tasting event (+$50)'],
      'Private Chef': ['Wine/beverage pairing (+$40/person)','Grocery sourcing (+$30)','Menu customization (+$50)','Extra course (+$25/person)','Post-dinner cleanup (+$75)','Travel fee (+$0.67/mi)'],
      'Food Truck':   ['Catering booking (+$200 min)','Branded napkins (+$15)','Extended hours (+$75/hr)','Pre-order discount (-$5/person)','Corporate package (+$10/person)','Festival rate (varies)'],
      Other:         ['Dietary accommodations (+$10/person)','Event setup (+$100)','Custom menu (+$50)','Same-week booking (+$25)','Rush order (+$30)','Group discount (-$5/person)']
    },

    promptBusinessLabel: 'Cuisine type / concept',
    promptClientLabel:   'Target guests / customers',
    promptLocationLabel: 'Operation type',
    promptPricingLabel:  'Pricing / menus',
    promptIndustryNote:  'This is a food and hospitality business. The site should feel appetizing, atmospheric, and inviting — visitors should feel hungry and excited. High-quality food photography placeholders are critical. Emphasize the story, the ingredients, and the experience. For catering or private chef, the inquiry/quote flow is the primary CTA.',

    suggestedPalette: 'Warm Local'
  },

  // ─────────────────────────────────────────────
  'professional-services': {
    label:      'Professional Services',
    navLabel:   'Professional',
    icon:       '💼',
    storageKey: 'builtsy-bp-professional-v1',

    step1Title: 'Tell us about your practice or firm',
    step1Sub:   'Your expertise, your clients, and the problems you solve.',

    subjectSectionLabel: 'What type of professional services?',
    subjectOptions: [
      { icon:'⚖️', name:'Legal',          desc:'Attorney, paralegal, notary…' },
      { icon:'📊', name:'Accounting / CPA',desc:'Tax, bookkeeping, CFO…' },
      { icon:'💡', name:'Consulting',      desc:'Business, strategy, ops…' },
      { icon:'🏠', name:'Real Estate',     desc:'Agent, broker, investor…' },
      { icon:'🖥️', name:'IT / Tech',       desc:'MSP, cybersecurity, support…' },
      { icon:'✨', name:'Other',           desc:'Insurance, finance, HR…' }
    ],

    namePlaceholder:     'e.g. Hernandez & Associates CPA',
    nameLabel:           'Firm or practice name',
    specificLabel:       'What specific services do you provide?',
    specificPlaceholder: 'e.g. Small business tax prep, QuickBooks setup, payroll',
    clientLabel:         'Who are your ideal clients?',
    clientPlaceholder:   'e.g. Small business owners and self-employed professionals',
    clientChips:         ['Small businesses','Startups','Individuals','Families','Corporations','Nonprofits','Real estate investors','High-net-worth'],
    credentialLabel:     'Licenses, certifications & credentials',
    credentialPlaceholder: 'e.g. CPA, 20+ years, member of AICPA, Colorado Bar',

    locationSectionLabel: 'How do you work with clients?',
    locationOptions: [
      { icon:'🏢', name:'In-office',      desc:'Clients come to your office' },
      { icon:'💻', name:'Remote / virtual',desc:'100% online' },
      { icon:'🌐', name:'Both',           desc:'Office + remote' }
    ],

    pricingLabel:    'Offer & Pricing',
    pricingTabLabel: 'Services',
    sessionRows: [
      { name:'Initial Consultation', duration:'30–60 min', defaultPrice: 150 },
      { name:'Hourly Rate',          duration:'Per hour',  defaultPrice: 250 },
      { name:'Project Rate',         duration:'Per project',defaultPrice: 1500 }
    ],
    packageRows: [
      { name:'Starter Engagement',  sessions: 1,  defaultPrice: 750 },
      { name:'Ongoing Monthly',     sessions: 4,  defaultPrice: 1200 },
      { name:'Annual Retainer',     sessions: 12, defaultPrice: 5500 }
    ],
    signatureNameLabel:       'Signature service or program',
    signatureNamePlaceholder: 'e.g. "The Business Foundation Package"',
    taglinePlaceholder:       'e.g. Clarity. Strategy. Results.',
    differentiatorLabel:      'What makes your approach different?',
    differentiatorPlaceholder:'e.g. We treat every client\'s finances like our own — no surprises, ever',

    featuresCallout: {
      tag:  '✨ Builtsy signature',
      body: 'The <strong>Interactive Engagement Estimator</strong> helps prospects understand investment before they book a consultation.'
    },
    toggles: [
      { id:'t-interactive', label:'🎯 Service Estimator',    desc:'Transparent pricing on your site', default: true },
      { id:'t-booking',     label:'📅 Consultation Booking', desc:'Calendly scheduling on your site', default: true, hasField: 'calendly' },
      { id:'t-sms',         label:'💬 Appointment Reminders',desc:'SMS reminders for clients', default: false },
      { id:'t-testimonials',label:'⭐ Client Testimonials',  desc:'Paste real reviews and results', default: true, hasField: 'testimonials' },
      { id:'t-faq',         label:'❓ FAQ Section',          desc:'Answer common questions before they call', default: true },
      { id:'t-contact',     label:'📧 Inquiry Form',         desc:'Capture project details upfront', default: true }
    ],
    calendlyLabel:       'Your scheduling link',
    calendlyPlaceholder: 'e.g. calendly.com/hernandezCPA',

    addonSuggestions: {
      Legal:          ['Rush filing (+$150)','Notarization (+$25)','Document review (+$200)','Mediation (+$300)','Contract template (+$75)','Payment plan available'],
      'Accounting / CPA':['Amended return (+$150)','State filing (+$75)','QuickBooks setup (+$200)','Payroll setup (+$150/mo)','Audit support (+$250/hr)','Year-round bookkeeping (+$200/mo)'],
      Consulting:     ['Strategy deck (+$500)','Workshop facilitation (+$300)','Follow-up session (+$200)','Team training (+$400)','Progress report (+$100)','Ongoing advisory (-$150/mo)'],
      'Real Estate':  ['Staging consult (+$200)','Professional photos (+$300)','Open house (+$150)','Inspection review (+$75)','Buyer rebate (-$500)','Investment analysis (+$200)'],
      'IT / Tech':    ['Emergency support (+$150/hr)','Security audit (+$500)','Staff training (+$200)','Hardware (+cost)','Monthly monitoring (-$50/mo)','After-hours (+$75/hr)'],
      Other:          ['Rush service (+$100)','Report/documentation (+$75)','Presentation (+$200)','Travel fee (+$0.67/mi)','Retainer discount (-$100/mo)','Extended engagement (-$200)']
    },

    promptBusinessLabel: 'Service type',
    promptClientLabel:   'Ideal clients',
    promptLocationLabel: 'Work arrangement',
    promptPricingLabel:  'Rates & engagement',
    promptIndustryNote:  'This is a professional services firm. The site should feel authoritative, clean, and confidence-building. Clients are making high-stakes decisions and need to trust your expertise. Emphasize credentials, years of experience, and clear service descriptions. The consultation CTA is the primary conversion goal.',

    suggestedPalette: 'Steel & Navy'
  },

  // ─────────────────────────────────────────────
  'creative': {
    label:      'Creative & Studio',
    navLabel:   'Creative',
    icon:       '🎨',
    storageKey: 'builtsy-bp-creative-v1',

    step1Title: 'Tell us about your creative work',
    step1Sub:   'Your medium, your style, and who you create for.',

    subjectSectionLabel: 'What do you create or capture?',
    subjectOptions: [
      { icon:'📷', name:'Photography',   desc:'Portraits, weddings, events…' },
      { icon:'🎨', name:'Design / Art',  desc:'Graphic design, illustration…' },
      { icon:'🎬', name:'Video / Film',  desc:'Wedding films, commercials…' },
      { icon:'✍️', name:'Copywriting',   desc:'Content, ads, brand voice…' },
      { icon:'🎵', name:'Music / Audio', desc:'Production, mixing, recording…' },
      { icon:'✨', name:'Other',         desc:'Architecture, ceramics, web…' }
    ],

    namePlaceholder:     'e.g. Luz Photography',
    nameLabel:           'Studio or freelance name',
    specificLabel:       'What specifically do you offer?',
    specificPlaceholder: 'e.g. Wedding & engagement photography, elopements',
    clientLabel:         'Who do you work with?',
    clientPlaceholder:   'e.g. Engaged couples, families, small businesses',
    clientChips:         ['Couples','Families','Small businesses','Brands','Musicians','Nonprofits','Event planners','Real estate'],
    credentialLabel:     'Experience & recognition',
    credentialPlaceholder: 'e.g. 200+ weddings, published in The Knot, 10 years shooting',

    locationSectionLabel: 'How do you work?',
    locationOptions: [
      { icon:'🏢', name:'My studio',    desc:'Clients come to you' },
      { icon:'🌍', name:'On location',  desc:'You travel to the shoot' },
      { icon:'🌐', name:'Both',         desc:'Studio + on-location' }
    ],

    pricingLabel:    'Offer & Pricing',
    pricingTabLabel: 'Packages',
    sessionRows: [
      { name:'Mini Session',    duration:'30 min', defaultPrice: 250 },
      { name:'Standard Session',duration:'2 hrs',  defaultPrice: 550 },
      { name:'Premium Package', duration:'Full day',defaultPrice: 1800 }
    ],
    packageRows: [
      { name:'Starter Package',  sessions: 1, defaultPrice: 499 },
      { name:'Complete Package', sessions: 1, defaultPrice: 1200 },
      { name:'Premium Package',  sessions: 1, defaultPrice: 2500 }
    ],
    signatureNameLabel:       'Signature offering name',
    signatureNamePlaceholder: 'e.g. "The Full Story Wedding Collection"',
    taglinePlaceholder:       'e.g. Your story, told beautifully',
    differentiatorLabel:      'What makes your work unique?',
    differentiatorPlaceholder:'e.g. I focus on authentic moments — no stiff poses, just real emotion',

    featuresCallout: {
      tag:  '✨ Builtsy signature',
      body: 'The <strong>Interactive Package Builder</strong> lets clients customize their shoot and see investment live — makes quoting effortless.'
    },
    toggles: [
      { id:'t-interactive', label:'🎯 Package Builder',       desc:'Live pricing on your site', default: true },
      { id:'t-booking',     label:'📅 Booking & Inquiry',     desc:'Calendly or booking link', default: true, hasField: 'calendly' },
      { id:'t-sms',         label:'💬 Session Reminders',     desc:'SMS reminders for clients', default: false },
      { id:'t-testimonials',label:'⭐ Client Testimonials',   desc:'Paste real reviews and love notes', default: true, hasField: 'testimonials' },
      { id:'t-faq',         label:'❓ FAQ Section',           desc:'What to wear, what to expect, etc.', default: true },
      { id:'t-contact',     label:'📧 Inquiry Form',          desc:'Capture project details upfront', default: true }
    ],
    calendlyLabel:       'Your inquiry or booking link',
    calendlyPlaceholder: 'e.g. calendly.com/luzphotography',

    addonSuggestions: {
      Photography:  ['Rush editing (+$100)','Extra hour (+$150)','Prints / album (+$300+)','Hair & makeup (+$150)','Second shooter (+$300)','Drone footage (+$200)'],
      'Design / Art':['Rush delivery (+$100)','Extra revision (+$50)','Brand guidelines (+$200)','Social kit (+$150)','Print-ready files (+$75)','Unlimited revisions (+$200)'],
      'Video / Film':['Drone footage (+$250)','Same-day highlight (+$350)','Extra editing hour (+$100)','Raw footage (+$150)','Music licensing (+$75)','Second camera (+$300)'],
      Copywriting:   ['Rush delivery (+$100)','SEO optimization (+$75)','Strategy call (+$100)','Content calendar (+$200)','Revisions pack (+$50)','Social adaptation (+$60)'],
      'Music / Audio':['Mastering (+$80)','Stem files (+$50)','Rush delivery (+$100)','Album package (-$50)','Vocal editing (+$75)','Video sync (+$120)'],
      Other:         ['Rush delivery (+$100)','Extra revision (+$50)','Commercial license (+$150)','Print rights (+$75)','Consultation (+$50)','Travel fee (+$0.67/mi)']
    },

    promptBusinessLabel: 'Creative specialty',
    promptClientLabel:   'Ideal clients',
    promptLocationLabel: 'Work style',
    promptPricingLabel:  'Rates & packages',
    promptIndustryNote:  'This is a creative services / photography / design business. The site should function as a portfolio — beautiful, minimal, and gallery-forward. The work should speak first, copy second. Visitors want to feel the aesthetic before they read a word. Gallery sections are critical. The inquiry form is the primary CTA — keep it warm and human.',

    suggestedPalette: 'Pure B&W'
  },

  // ─────────────────────────────────────────────
  'home-trades': {
    label:      'Home & Trades',
    navLabel:   'Home & Trades',
    icon:       '🏠',
    storageKey: 'builtsy-bp-trades-v1',

    step1Title: 'Tell us about your trade or home service',
    step1Sub:   'What you do, where you work, and who you serve.',

    subjectSectionLabel: 'What type of home service?',
    subjectOptions: [
      { icon:'🌿', name:'Landscaping',  desc:'Lawn care, design, irrigation…' },
      { icon:'🧹', name:'Cleaning',     desc:'Residential, move-in/out…' },
      { icon:'🎨', name:'Painting',     desc:'Interior, exterior, cabinets…' },
      { icon:'🪟', name:'Windows / Gutters', desc:'Cleaning, repair, sealing…' },
      { icon:'❄️', name:'Snow / Seasonal',desc:'Removal, salting, prep…' },
      { icon:'✨', name:'Other',        desc:'Pest control, handyman, pool…' }
    ],

    namePlaceholder:     'e.g. Green Thumb Landscaping',
    nameLabel:           'Business name',
    specificLabel:       'What specific services do you offer?',
    specificPlaceholder: 'e.g. Weekly lawn maintenance, spring/fall cleanup, mulching',
    clientLabel:         'Who are your typical customers?',
    clientPlaceholder:   'e.g. Homeowners in Parker and Castle Rock',
    clientChips:         ['Homeowners','HOAs','Rental properties','Commercial','New construction','Seasonal','One-time jobs','Recurring service'],
    credentialLabel:     'Licenses, insurance & experience',
    credentialPlaceholder: 'e.g. Licensed & insured, 12 years, locally owned',

    locationSectionLabel: 'How do you serve customers?',
    locationOptions: [
      { icon:'🚗', name:'We come to you', desc:'On-site service' },
      { icon:'🏢', name:'Drop-off',       desc:'Clients bring work to you' },
      { icon:'🌐', name:'Both',           desc:'On-site + shop' }
    ],

    pricingLabel:    'Offer & Pricing',
    pricingTabLabel: 'Services',
    sessionRows: [
      { name:'One-Time Service', duration:'Varies',  defaultPrice: 120 },
      { name:'Monthly Plan',     duration:'Monthly', defaultPrice: 180 },
      { name:'Seasonal Package', duration:'Season',  defaultPrice: 450 }
    ],
    packageRows: [
      { name:'Basic Package',    sessions: 4,  defaultPrice: 400 },
      { name:'Standard Package', sessions: 8,  defaultPrice: 750 },
      { name:'Premium Package',  sessions: 12, defaultPrice: 1050 }
    ],
    signatureNameLabel:       'Signature service name',
    signatureNamePlaceholder: 'e.g. "The Complete Lawn Care Plan"',
    taglinePlaceholder:       'e.g. Your home, beautifully maintained',
    differentiatorLabel:      'What makes your service different?',
    differentiatorPlaceholder:'e.g. Same crew every time, always on schedule, guaranteed satisfaction',

    featuresCallout: {
      tag:  '✨ Builtsy signature',
      body: 'The <strong>Interactive Service Estimator</strong> lets homeowners build their own service plan and see pricing before they call.'
    },
    toggles: [
      { id:'t-interactive', label:'🎯 Service Estimator',    desc:'Live pricing on your site', default: true },
      { id:'t-booking',     label:'📅 Online Scheduling',    desc:'Booking link on your site', default: true, hasField: 'calendly' },
      { id:'t-sms',         label:'💬 Service Reminders',    desc:'SMS reminders for appointments', default: false },
      { id:'t-testimonials',label:'⭐ Customer Reviews',     desc:'Paste real reviews', default: true, hasField: 'testimonials' },
      { id:'t-faq',         label:'❓ FAQ Section',          desc:'Answer common questions', default: true },
      { id:'t-contact',     label:'📧 Quote Request Form',   desc:'Capture job details before the estimate', default: true }
    ],
    calendlyLabel:       'Your booking or scheduling link',
    calendlyPlaceholder: 'e.g. calendly.com/greenthumbco',

    addonSuggestions: {
      Landscaping:  ['Mulch delivery (+$75)','Irrigation check (+$60)','Fertilization (+$45)','Flower bed design (+$120)','Aeration (+$80)','Fall cleanup (+$150)'],
      Cleaning:     ['Deep clean (+$80)','Move-in/out (+$120)','Window washing (+$60)','Carpet cleaning (+$100)','Refrigerator clean (+$25)','Same-week (+$30)'],
      Painting:     ['Primer coat (+$75)','Ceiling (+$150)','Trim & doors (+$200)','Deck stain (+$250)','Color consultation (+$50)','Furniture moving (+$25)'],
      'Windows / Gutters':['Gutter guards (+$200)','Screen repair (+$15/screen)','Soft wash (+$75)','Caulking (+$50)','Dryer vent cleaning (+$65)','Pressure wash (+$100)'],
      'Snow / Seasonal':['Salt application (+$30)','Roof raking (+$85)','De-icing (+$40)','Priority response (+$50/season)','Commercial lot (+$200)','24hr emergency (+$75)'],
      Other:        ['Emergency/rush (+$75)','Weekend rate (+$40)','Senior discount (-$15)','Annual contract (-$100)','Materials (+cost)','Travel fee (+$25)']
    },

    promptBusinessLabel: 'Service type',
    promptClientLabel:   'Target customers',
    promptLocationLabel: 'Service delivery',
    promptPricingLabel:  'Service rates',
    promptIndustryNote:  'This is a home services / trades business. The site should feel reliable, clean, and local. Homeowners want to feel safe inviting this company onto their property. Emphasize licensing, insurance, years in business, and local ties. Before/after photos (gallery) are highly effective. The CTA should be a quick quote or booking form.',

    suggestedPalette: 'Deep Forest'
  }

};

// ─────────────────────────────────────────────
// HELPER — get config from URL param
// Usage: var cfg = getBlueprintConfig();
// ─────────────────────────────────────────────
function getBlueprintConfig() {
  var params = new URLSearchParams(window.location.search);
  var type = params.get('type') || 'private-lessons';
  return BUILTSY_CONFIGS[type] || BUILTSY_CONFIGS['private-lessons'];
}

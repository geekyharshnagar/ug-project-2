// CURATED interaction dataset used ONLY by the Drug Interaction Checker.
// openFDA labels and RxNorm are NOT complete interaction-checking services, so this list is
// deliberately small, referenced, and separate from live search. Each entry cites the type of
// source (FDA prescribing-information "Drug Interactions" section) and links to DailyMed search.
// It was compiled for this educational project and is NOT exhaustive: verify against the current
// label and with a pharmacist before relying on it. Add your own entries in the same format.
const dm = (q) => `https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query=${encodeURIComponent(q)}`
const lab = (drug, q = drug) => ({ label: `FDA prescribing information – ${drug}, Drug Interactions section`, url: dm(q) })

export const INTERACTIONS = [
  { a: 'warfarin', b: 'aspirin', severity: 'Major', mechanism: 'Aspirin inhibits platelet function and can injure the stomach lining, adding to warfarin\'s reduction of clotting.', effects: 'Higher risk of serious bleeding, including gastrointestinal bleeding.', source: lab('warfarin') },
  { a: 'warfarin', b: 'ibuprofen', severity: 'Major', mechanism: 'NSAIDs impair platelet function and irritate the gastric mucosa; they may also displace warfarin from protein binding.', effects: 'Increased risk of bleeding, especially gastrointestinal bleeding.', source: lab('warfarin') },
  { a: 'warfarin', b: 'paracetamol', severity: 'Moderate', mechanism: 'Regular paracetamol (acetaminophen) use has been associated with rises in INR. The mechanism is not fully established.', effects: 'Higher INR and bleeding risk with sustained use.', source: lab('warfarin') },
  { a: 'warfarin', b: 'amoxicillin', severity: 'Moderate', mechanism: 'Antibiotics can alter gut flora that produce vitamin K; prolongation of prothrombin time has been reported with oral anticoagulants.', effects: 'Possible increase in INR and bleeding risk.', source: lab('amoxicillin') },
  { a: 'aspirin', b: 'ibuprofen', severity: 'Moderate', mechanism: 'Ibuprofen can compete with aspirin for access to the platelet COX-1 binding site.', effects: 'May reduce the antiplatelet (cardioprotective) effect of low-dose aspirin; additive gastrointestinal irritation.', source: { label: 'FDA information for healthcare professionals – ibuprofen and aspirin', url: dm('ibuprofen') } },
  { a: 'lisinopril', b: 'ibuprofen', severity: 'Moderate', mechanism: 'NSAIDs inhibit prostaglandin synthesis, which can reduce renal blood flow and blunt the effect of ACE inhibitors.', effects: 'Reduced blood-pressure lowering; risk of worsening kidney function, especially in older or dehydrated patients.', source: lab('lisinopril') },
  { a: 'lisinopril', b: 'spironolactone', severity: 'Major', mechanism: 'Both medicines reduce potassium excretion.', effects: 'Hyperkalaemia (high blood potassium), which can affect heart rhythm.', source: lab('lisinopril') },
  { a: 'lisinopril', b: 'potassium chloride', severity: 'Moderate', mechanism: 'ACE inhibitors reduce potassium excretion; potassium supplements add to potassium intake.', effects: 'Hyperkalaemia.', source: lab('lisinopril') },
  { a: 'lisinopril', b: 'lithium', severity: 'Major', mechanism: 'ACE inhibitors can reduce renal lithium clearance.', effects: 'Raised lithium levels and lithium toxicity.', source: lab('lithium') },
  { a: 'lithium', b: 'ibuprofen', severity: 'Major', mechanism: 'NSAIDs can reduce renal lithium clearance.', effects: 'Raised lithium levels and lithium toxicity.', source: lab('lithium') },
  { a: 'simvastatin', b: 'clarithromycin', severity: 'Contraindicated', mechanism: 'Clarithromycin strongly inhibits CYP3A4, greatly increasing simvastatin exposure.', effects: 'Myopathy and rhabdomyolysis (serious muscle breakdown).', source: lab('simvastatin') },
  { a: 'atorvastatin', b: 'clarithromycin', severity: 'Major', mechanism: 'Clarithromycin inhibits CYP3A4 and increases atorvastatin exposure. The label advises a dose limit.', effects: 'Increased risk of myopathy and rhabdomyolysis.', source: lab('atorvastatin') },
  { a: 'simvastatin', b: 'amlodipine', severity: 'Moderate', mechanism: 'Amlodipine raises simvastatin exposure; the simvastatin label sets a maximum dose with amlodipine.', effects: 'Increased risk of myopathy.', source: lab('simvastatin') },
  { a: 'simvastatin', b: 'gemfibrozil', severity: 'Contraindicated', mechanism: 'Gemfibrozil raises statin exposure and carries its own myopathy risk.', effects: 'Myopathy and rhabdomyolysis.', source: lab('simvastatin') },
  { a: 'atorvastatin', b: 'gemfibrozil', severity: 'Major', mechanism: 'Fibrates can cause myopathy on their own, and gemfibrozil raises statin exposure.', effects: 'Increased risk of myopathy and rhabdomyolysis.', source: lab('atorvastatin') },
  { a: 'sildenafil', b: 'nitroglycerin', severity: 'Contraindicated', mechanism: 'PDE5 inhibition potentiates nitrate-induced cGMP-mediated vasodilation.', effects: 'Severe, potentially life-threatening drop in blood pressure.', source: lab('sildenafil') },
  { a: 'metformin', b: 'cimetidine', severity: 'Moderate', mechanism: 'Cimetidine reduces renal tubular secretion of metformin.', effects: 'Higher metformin exposure and greater risk of lactic acidosis.', source: lab('metformin') },
  { a: 'fluoxetine', b: 'tramadol', severity: 'Major', mechanism: 'Both increase serotonergic activity; fluoxetine also inhibits CYP2D6, which activates tramadol.', effects: 'Serotonin syndrome, seizure risk, and possibly reduced pain relief.', source: lab('tramadol') },
  { a: 'sertraline', b: 'tramadol', severity: 'Major', mechanism: 'Additive serotonergic activity.', effects: 'Serotonin syndrome and increased seizure risk.', source: lab('tramadol') },
  { a: 'sertraline', b: 'linezolid', severity: 'Major', mechanism: 'Linezolid is a reversible non-selective MAO inhibitor, which adds to serotonergic activity.', effects: 'Serotonin syndrome.', source: lab('linezolid') },
  { a: 'clopidogrel', b: 'omeprazole', severity: 'Major', mechanism: 'Omeprazole inhibits CYP2C19, which converts clopidogrel to its active form.', effects: 'Reduced antiplatelet effect of clopidogrel. The clopidogrel label advises avoiding the combination.', source: lab('clopidogrel') },
  { a: 'methotrexate', b: 'ibuprofen', severity: 'Major', mechanism: 'NSAIDs can reduce renal clearance of methotrexate.', effects: 'Methotrexate toxicity (bone marrow, kidney, gastrointestinal). Risk is greatest with high-dose methotrexate.', source: lab('methotrexate') },
  { a: 'methotrexate', b: 'amoxicillin', severity: 'Moderate', mechanism: 'Penicillins can reduce renal clearance of methotrexate.', effects: 'Increased methotrexate levels and toxicity.', source: lab('methotrexate') },
  { a: 'methotrexate', b: 'omeprazole', severity: 'Moderate', mechanism: 'Proton pump inhibitors may delay methotrexate elimination, mainly with high-dose therapy.', effects: 'Increased methotrexate levels.', source: lab('methotrexate') },
  { a: 'digoxin', b: 'amiodarone', severity: 'Major', mechanism: 'Amiodarone reduces digoxin clearance.', effects: 'Raised digoxin levels and digoxin toxicity.', source: lab('digoxin') },
  { a: 'ciprofloxacin', b: 'tizanidine', severity: 'Contraindicated', mechanism: 'Ciprofloxacin strongly inhibits CYP1A2, which metabolises tizanidine.', effects: 'Marked rise in tizanidine levels: severe low blood pressure and sedation.', source: lab('tizanidine') },
  { a: 'ciprofloxacin', b: 'calcium carbonate', severity: 'Moderate', mechanism: 'Calcium and other polyvalent cations bind ciprofloxacin in the gut (chelation).', effects: 'Reduced antibiotic absorption and possible treatment failure.', source: lab('ciprofloxacin') },
  { a: 'amoxicillin', b: 'allopurinol', severity: 'Minor', mechanism: 'Not established. The label notes it is unclear whether allopurinol or the underlying condition is responsible.', effects: 'Higher incidence of skin rash than with amoxicillin alone.', source: lab('amoxicillin') },
  { a: 'levothyroxine', b: 'calcium carbonate', severity: 'Moderate', mechanism: 'Calcium binds levothyroxine in the gut.', effects: 'Reduced levothyroxine absorption. Labels advise separating doses.', source: lab('levothyroxine') },
  { a: 'ibuprofen', b: 'prednisone', severity: 'Moderate', mechanism: 'NSAIDs and corticosteroids both injure the gastric lining.', effects: 'Higher risk of gastrointestinal ulceration and bleeding.', source: lab('ibuprofen') },
]

export const ALIASES = {
  paracetamol: ['acetaminophen', 'tylenol', 'panadol', 'crocin', 'dolo'],
  ibuprofen: ['advil', 'motrin', 'brufen'],
  aspirin: ['acetylsalicylic acid', 'asa', 'disprin', 'ecosprin'],
  warfarin: ['coumadin'], omeprazole: ['prilosec', 'omez'], atorvastatin: ['lipitor'], simvastatin: ['zocor'],
  sildenafil: ['viagra'], nitroglycerin: ['glyceryl trinitrate', 'gtn', 'nitroglycerine'],
  amoxicillin: ['amoxil', 'amoxycillin'], metformin: ['glucophage'], clopidogrel: ['plavix'], digoxin: ['lanoxin'],
  ciprofloxacin: ['cipro'], sertraline: ['zoloft'], fluoxetine: ['prozac'], tramadol: ['ultram'],
  lisinopril: ['zestril', 'prinivil'], levothyroxine: ['synthroid', 'thyroxine'],
  'calcium carbonate': ['calcium', 'tums'], 'potassium chloride': ['kcl'], lithium: ['lithium carbonate'], prednisone: ['deltasone'],
}

export const DRUGS = [...new Set(INTERACTIONS.flatMap((i) => [i.a, i.b]))].sort()

export function canonicalName(input) {
  const t = input.toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!t) return null
  const words = t.split(' ')
  for (const d of DRUGS) {
    if (t === d || ALIASES[d]?.includes(t)) return d
  }
  for (const d of DRUGS) {
    if (words.includes(d) || ALIASES[d]?.some((a) => words.includes(a))) return d
  }
  return null
}

export function checkPair(x, y) {
  return INTERACTIONS.find((i) => (i.a === x && i.b === y) || (i.a === y && i.b === x)) || null
}

export const NO_MATCH_TEXT = 'No known interaction found in the available interaction dataset. This does not establish that the combination is safe.'
export const LIMITATIONS = 'This is a small curated educational dataset, not a complete clinical interaction database. It does not consider dose, timing, kidney or liver function, age, other medicines, supplements, food or alcohol. Always check the current prescribing information and ask a pharmacist or doctor.'

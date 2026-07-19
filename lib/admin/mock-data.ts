import type { AuditDocument, Correction, EvaluationRun, FailureRecord, FieldMetric } from "./types";

export const evaluationRuns: EvaluationRun[] = [
  {id:"run-004",name:"Test Run 004",modelVersion:"v1.2",documentCount:486,successRate:92.8,correctionRate:9.8,failureRate:4.9,averageConfidence:87.4,averageProcessingTime:31.6,status:"completed",startedAt:"2026-07-14 08:00",completedAt:"2026-07-14 15:42"},
  {id:"run-003",name:"Test Run 003",modelVersion:"v1.1",documentCount:450,successRate:89.6,correctionRate:12.4,failureRate:6.2,averageConfidence:84.9,averageProcessingTime:36.8,status:"completed",startedAt:"2026-07-07 08:20",completedAt:"2026-07-07 16:10"},
  {id:"run-002",name:"Test Run 002",modelVersion:"v1.1",documentCount:420,successRate:87.1,correctionRate:14.2,failureRate:7.4,averageConfidence:82.7,averageProcessingTime:39.2,status:"completed",startedAt:"2026-06-30 09:00",completedAt:"2026-06-30 17:38"},
  {id:"run-005",name:"Test Run 005",modelVersion:"v1.3-rc",documentCount:214,successRate:94.1,correctionRate:8.1,failureRate:3.7,averageConfidence:89.2,averageProcessingTime:28.9,status:"running",startedAt:"2026-07-16 08:30",completedAt:"—"},
];

export const fieldMetrics: FieldMetric[] = [
  {key:"consignee",name:"Consignee Address",occurrences:486,coverage:96.5,confidence:72,reviewRate:38,correctionRate:31,missingRate:3.5,validationRate:12,issue:"Line grouping and OCR ambiguity",trend:"down"},
  {key:"shipper",name:"Shipper Address",occurrences:486,coverage:97.1,confidence:76,reviewRate:34,correctionRate:27,missingRate:2.9,validationRate:9,issue:"Multi-line address parsing",trend:"down"},
  {key:"goods",name:"Goods Description",occurrences:472,coverage:93.2,confidence:79,reviewRate:29,correctionRate:23,missingRate:6.8,validationRate:8,issue:"Free-text normalization",trend:"stable"},
  {key:"handling",name:"Handling Information",occurrences:401,coverage:82.5,confidence:74,reviewRate:35,correctionRate:22,missingRate:17.5,validationRate:11,issue:"Handwritten and abbreviated text",trend:"down"},
  {key:"flightDate",name:"Flight Date",occurrences:468,coverage:96.3,confidence:84,reviewRate:17,correctionRate:14,missingRate:3.7,validationRate:7,issue:"Date formatting",trend:"up"},
  {key:"weight",name:"Gross Weight",occurrences:486,coverage:99.2,confidence:91,reviewRate:8,correctionRate:7,missingRate:.8,validationRate:3,issue:"Decimal separator",trend:"up"},
  {key:"awb",name:"AWB Number",occurrences:486,coverage:99.8,confidence:96,reviewRate:3,correctionRate:2,missingRate:.2,validationRate:1,issue:"Character substitution",trend:"up"},
  {key:"origin",name:"Origin Airport",occurrences:486,coverage:99.4,confidence:94,reviewRate:4,correctionRate:3,missingRate:.6,validationRate:2,issue:"IATA validation",trend:"stable"},
];

export const corrections: Correction[] = [
  {id:"c1",documentId:"AWB-2026-00481",awbNumber:"020-44711230",field:"Flight Date",original:"08.08.2025ggg",corrected:"08.08.2025",confidence:62,type:"OCR character correction",reviewer:"J. Marlow",correctedAt:"2026-07-14 09:47",modelVersion:"v1.2"},
  {id:"c2",documentId:"AWB-2026-00472",awbNumber:"176-88590122",field:"Consignee Address",original:"DUBAI LOGISTCS ZONE",corrected:"DUBAI LOGISTICS ZONE",confidence:69,type:"Text correction",reviewer:"S. Novak",correctedAt:"2026-07-14 09:31",modelVersion:"v1.2"},
  {id:"c3",documentId:"AWB-2026-00455",awbNumber:"125-77214309",field:"Handling Information",original:"FRAGILE HANDLE W CARE",corrected:"FRAGILE — HANDLE WITH CARE",confidence:68,type:"OCR character correction",reviewer:"S. Novak",correctedAt:"2026-07-13 15:22",modelVersion:"v1.2"},
  {id:"c4",documentId:"AWB-2026-00398",awbNumber:"020-88210014",field:"Gross Weight",original:"1250 lb",corrected:"1250 kg",confidence:81,type:"Unit correction",reviewer:"J. Marlow",correctedAt:"2026-07-13 13:04",modelVersion:"v1.2"},
  {id:"c5",documentId:"AWB-2026-00299",awbNumber:"607-12933108",field:"Weight Unit",original:"lb",corrected:"kg",confidence:83,type:"Unit correction",reviewer:"S. Novak",correctedAt:"2026-07-13 17:05",modelVersion:"v1.1"},
];

export const auditDocuments: AuditDocument[] = [
  {id:"AWB-2026-00486",date:"2026-07-14 10:12",file:"awb_00486.pdf",company:"DHL Global",awbNumber:"020-44711230",modelVersion:"v1.2",fieldsExtracted:42,fieldsCorrected:0,confidence:96,processingTime:22.4,status:"Issued"},
  {id:"AWB-2026-00481",date:"2026-07-14 09:44",file:"awb_00481.pdf",company:"DB Schenker",awbNumber:"176-88590122",modelVersion:"v1.2",fieldsExtracted:39,fieldsCorrected:6,confidence:72,processingTime:38.7,status:"Review Required"},
  {id:"AWB-2026-00472",date:"2026-07-14 09:20",file:"awb_00472.pdf",company:"Kuehne + Nagel",awbNumber:"125-77214309",modelVersion:"v1.2",fieldsExtracted:41,fieldsCorrected:2,confidence:84,processingTime:31.3,status:"Validated"},
  {id:"AWB-2026-00455",date:"2026-07-13 15:18",file:"scan_00455.png",company:"Maersk Logistics",awbNumber:"020-88210014",modelVersion:"v1.2",fieldsExtracted:35,fieldsCorrected:8,confidence:66,processingTime:48.2,status:"Review Required"},
  {id:"AWB-2026-00439",date:"2026-07-13 14:05",file:"awb_00439.pdf",company:"DHL Global",awbNumber:"—",modelVersion:"v1.2",fieldsExtracted:0,fieldsCorrected:0,confidence:0,processingTime:66.1,status:"Failed"},
];

export const failures: FailureRecord[] = [
  {id:"f1",time:"2026-07-14 10:05",documentId:"AWB-2026-00439",company:"DHL Global",stage:"OCR",category:"OCR failure",message:"Document text could not be recognized",retries:2,status:"Open"},
  {id:"f2",time:"2026-07-14 09:11",documentId:"AWB-2026-00421",company:"DB Schenker",stage:"Validation",category:"Validation",message:"Required AWB number was not found",retries:1,status:"Resolved"},
  {id:"f3",time:"2026-07-13 14:05",documentId:"AWB-2026-00288",company:"Kuehne + Nagel",stage:"Field Extraction",category:"Extraction",message:"Extraction service returned an empty response",retries:3,status:"Resolved"},
];

export const qualityTrend = [
  {day:"D1",confidence:84,correction:13.2},{day:"D2",confidence:85.5,correction:12.1},{day:"D3",confidence:86,correction:11.4},{day:"D4",confidence:86.8,correction:10.8},{day:"D5",confidence:87.1,correction:10.2},{day:"D6",confidence:87.9,correction:9.5},{day:"D7",confidence:87.4,correction:9.8},
];

export const performanceDistribution = [{bucket:"<20s",count:61},{bucket:"20–30s",count:184},{bucket:"30–40s",count:151},{bucket:"40–50s",count:62},{bucket:">50s",count:28}];

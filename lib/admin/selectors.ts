import { auditDocuments, corrections, evaluationRuns, failures, fieldMetrics, performanceDistribution, qualityTrend } from "./mock-data";
export const getEvaluationRuns=()=>evaluationRuns;
export const getFieldMetrics=()=>fieldMetrics;
export const getCorrections=()=>corrections;
export const getAuditDocuments=()=>auditDocuments;
export const getPerformanceMetrics=()=>({distribution:performanceDistribution,failures,slowest:[...auditDocuments].sort((a,b)=>b.processingTime-a.processingTime).slice(0,5)});
export const getAdminOverviewMetrics=()=>({metrics:[
  ["Documents Tested","486","Test Run 004","blue"],["Successful Extractions","451","92.8% success rate","green"],["Review Required","63","13.0% of documents","amber"],["Failed Documents","24","4.9% of documents","red"],["Average AI Confidence","87.4%","Up 2.5 points vs Run 003","violet"],["Human Correction Rate","9.8%","Down 2.6 points","cyan"],["Average Processing Time","31.6s","Median 28.4 seconds","blue"],["Zero-Correction Documents","172","35.4% of documents","green"],
] as const,qualityTrend,problemFields:fieldMetrics.slice().sort((a,b)=>b.correctionRate-a.correctionRate).slice(0,5),recentCorrections:corrections.slice(0,4),highRisk:auditDocuments.filter(d=>d.status!=="Issued"&&d.status!=="Validated").slice(0,4),currentRun:evaluationRuns[0]});

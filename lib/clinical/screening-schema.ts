// FHIR-aligned data model — ไม่ใช่ FHIR REST resource จริง ไม่ validate ตาม FHIR
// profile ไม่มี FHIR server ใดๆ ทั้งสิ้น แค่ยืม field name/shape จาก FHIR resource
// (QuestionnaireResponse, Observation) เพื่อให้ migrate ไปเป็น FHIR compliant จริง
// ในอนาคตทำได้ง่ายขึ้น ตามที่ตกลงกันไว้ว่า full compliance ยังอยู่ roadmap

export interface QuestionnaireItem {
  linkId: string;
  text: string;
  answerValue: number;
}

export interface QuestionnaireResponse {
  resourceType: "QuestionnaireResponse";
  id: string;
  questionnaire: "9Q" | "8Q";
  status: "completed";
  subjectId: string; // เทียบเท่า subject reference ใน FHIR
  authored: string; // ISO datetime
  item: QuestionnaireItem[];
  totalScore: number;
  severityBand: string;
}

export interface ScreeningObservation {
  resourceType: "Observation";
  id: string;
  code: "9Q-total-score" | "8Q-total-score";
  subjectId: string;
  effectiveDateTime: string;
  value: number;
  interpretation: string;
}

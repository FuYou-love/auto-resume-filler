export type Gender = "" | "男" | "女" | "其他";

export interface PersonalInfo {
  fullName: string;
  phone: string;
  email: string;
  gender: Gender;
  birthDate: string;
  location: string;
  hometown: string;
  address: string;
  postalCode: string;
  idNumber: string;
  wechat: string;
  website: string;
}

export interface JobTarget {
  role: string;
  city: string;
  salary: string;
  employmentType: string;
}

export interface EducationEntry {
  id: string;
  school: string;
  major: string;
  degree: string;
  startDate: string;
  endDate: string;
  gpa: string;
  rank: string;
  description: string;
}

export interface WorkEntry {
  id: string;
  company: string;
  department: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface ProjectEntry {
  id: string;
  name: string;
  role: string;
  startDate: string;
  endDate: string;
  link: string;
  description: string;
}

export interface CampusEntry {
  id: string;
  organization: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface AdditionalInfo {
  skills: string;
  languages: string;
  certificates: string;
  awards: string;
  selfIntroduction: string;
}

export interface Profile {
  id: string;
  name: string;
  updatedAt: number;
  personal: PersonalInfo;
  target: JobTarget;
  education: EducationEntry[];
  work: WorkEntry[];
  projects: ProjectEntry[];
  campus: CampusEntry[];
  additional: AdditionalInfo;
  resumeName: string;
}

export interface FillSettings {
  fillEmptyOnly: boolean;
  highlightFilled: boolean;
  minConfidence: number;
}

export interface AppState {
  profiles: Profile[];
  activeProfileId: string;
  settings: FillSettings;
}

export interface FillResult {
  filled: number;
  skipped: number;
  needsResume: boolean;
  detected: number;
  message?: string;
}

export type ImportMode = "merge" | "overwrite" | "reset";

export interface ParsedResume {
  resumeName: string;
  personal: PersonalInfo;
  target: JobTarget;
  education: EducationEntry[];
  work: WorkEntry[];
  projects: ProjectEntry[];
  campus: CampusEntry[];
  additional: AdditionalInfo;
  warnings: string[];
}

export type ContentRequest =
  | { type: "OFFERPILOT_PING" }
  | { type: "OFFERPILOT_SCAN" }
  | { type: "OFFERPILOT_FILL"; profile: Profile; settings: FillSettings };

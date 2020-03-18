export type TermCode = string;

export interface CompassDepartment {
  code: string;
  description: string;
  courses: {[key: string]: CompassCourse};
}

export interface CompassSectionFaculty {
  bannerId: string;
  category: null;
  class: string;
  courseReferenceNumber: string;
  displayName: string;
  emailAddress: string | null;
  id: null;
  primaryIndicator: boolean;
  term: TermCode;
  version: null;
}

export interface CompassSectionMeetingsFaculty {
  category: string;
  class: string;
  courseReferenceNumber: string;
  faculty: [];
  meetingTime: {
    beginTime: string;
    building: string;
    buildingDescription: string;
    campus: string;
    campusDescription: string;
    category: string;
    class: string;
    courseReferenceNumber: string;
    creditHourSession: number;
    endDate: string;
    endTime: string;
    friday: boolean;
    hoursWeek: number;
    meetingScheduleType: string;
    meetingType: string;
    meetingTypeDescription: string;
    monday: boolean;
    room: string;
    saturday: boolean;
    startDate: string;
    sunday: boolean;
    term: TermCode;
    thursday: boolean;
    tuesday: boolean;
    wednesday: boolean;
  };
  term: TermCode;
}

export interface CompassSectionAttribute {
  class: string;
  code: string;
  courseReferenceNumber: string;
  description: string;
  isZTCAttribute: boolean;
  termCode: TermCode;
}

export interface CompassSection {
  id: number;
  term: TermCode;
  termDesc: string;
  courseReferenceNumber: string;
  partOfTerm: string;
  courseNumber: string;
  subject: string;
  subjectDescription: string;
  sequenceNumber: string;
  campusDescription: string;
  scheduleTypeDescription: string;
  courseTitle: string;
  creditHours: null;
  crossListCapacity: null;
  crossListCount: null;
  crossListAvailable: null;
  creditHourHigh: null | null;
  creditHourLow: number;
  creditHourIndicator: null;
  openSection: boolean;
  linkIdentifier: null;
  isSectionLinked: boolean;
  subjectCourse: string;
  faculty: CompassSectionFaculty[] | CompassFaculty[];
  meetingsFaculty: CompassSectionMeetingsFaculty[];
  reservedSeatSummary: null;
  sectionAttributes: CompassSectionAttribute[];
  termType: string;
  instructionalMethod: string;
  classRoster: string;
  isAdvisor: null;
}

export interface PaginatedCompassResponse<T> {
  success: boolean;
  totalCount: number;
  data: T[];
  pageOffset: number;
  pageMaxSize: number;
  sectionsFetchedCount: number;
  pathMode: string;
  tamuCapacityTotal: number;
  tamuActualTotal: number;
  tamuRemainingTotal: number;
}

export interface CompassFaculty {
  lastName: string;
  firstName: string;
  middleName: string;
  fullName: string;
  displayName: string;
  preferenceFirstName: string | null;
  namePrefix: string | null;
  nameSuffix: string | null;
  scheduleIndicator: string;
  advisorIndicator: null;
  title: string | null;
  deptAndCollegeInformation: null;
  address: null;
  telephone: null;
  email: null;
  bannerId: string;
  cvExists: boolean;
  cvUrl: string | null;
  tamuDirEmail: string;
  tamuDirTitle: string;
  tamutelephoneNumber: string;
}

export interface CompassCourse {
  id: number;
  termEffective: TermCode;
  courseNumber: string;
  subject: string;
  subjectCode: string;
  college: string;
  collegeCode: string;
  department: string;
  departmentCode: string;
  courseTitle: string;
  durationUnit: null;
  numberOfUnits: null;
  attributes: null;
  gradeModes: null;
  ceu: null;
  courseScheduleTypes: null;
  courseLevels: null;
  creditHourHigh: number | null;
  creditHourLow: number;
  creditHourIndicator: string | null;
  lectureHourLow: number | null;
  lectureHourHigh: number | null;
  lectureHourIndicator: string | null;
  billHourLow: number | null;
  billHourHigh: number | null;
  billHourIndicator: string;
  labHourLow: number | null;
  labHourHigh: number | null;
  labHourIndicator: string | null;
  otherHourLow: number | null;
  otherHourHigh: number | null;
  otherHourIndicator: string | null;
  subjectDescription: string;
  courseDescription: string;
  division: string;
  termStart: TermCode;
  termEnd: TermCode;
  preRequisiteCheckMethodCde: string;
  anySections: null;
  sections: CompassSection[] | undefined;
}

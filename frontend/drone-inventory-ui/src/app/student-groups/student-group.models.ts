/** Maximum length of a student group name, as in the backend (REQ-003). */
export const MAX_STUDENT_GROUP_NAME_LENGTH = 100;

export interface StudentGroup {
  id: number;
  name: string;
}

export interface CreateStudentGroupRequest {
  name: string;
}

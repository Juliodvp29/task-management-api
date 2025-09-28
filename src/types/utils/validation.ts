
export interface ValidatorConstraints {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  min?: number;
  max?: number;
  enum?: readonly any[];
  custom?: (value: any) => boolean | string;
}

export interface FieldValidation {
  [fieldName: string]: ValidatorConstraints;
}
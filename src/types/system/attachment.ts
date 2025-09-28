export interface Attachment extends BaseEntity {
  filename: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  file_path: string;
  entity_type: string;
  entity_id: number;
  uploaded_by: number;

  // Relación
  uploader?: User;
}

export interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
}
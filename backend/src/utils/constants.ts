export const ROLES = ["READER", "LIBRARIAN", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const READER_TYPES = ["STUDENT", "LECTURER", "STAFF"] as const;
export const READER_STATUS = ["ACTIVE", "SUSPENDED"] as const;

export const DOC_TYPES = ["GIAO_TRINH", "TLTK"] as const;
export const COPY_STATUS = ["AVAILABLE", "BORROWED", "DAMAGED", "LOST", "LIQUIDATED"] as const;

export const LOAN_TYPES = ["HOME", "ONSITE"] as const;
export const RETURN_CONDITIONS = ["GOOD", "DAMAGED", "LOST"] as const;
export const VIOLATION_TYPES = ["LATE", "DAMAGED", "LOST", "OTHER"] as const;

export const ROOM_TYPES = ["READING", "GROUP"] as const;
export const BOOKING_BLOCKING = ["PENDING", "APPROVED", "IN_USE"];

export const MATERIAL_FORMATS = ["PRINT", "DIGITAL"] as const;
export const PAYMENT_METHODS = ["CASH", "TRANSFER"] as const;

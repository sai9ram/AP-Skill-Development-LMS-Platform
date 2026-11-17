import { ValidationError } from "./apiError";

export const STUDENT_TRANSITIONS: Record<string, string[]> = {
  ACTIVE: ["ACTIVE", "INACTIVE", "TRANSFERRED", "COMPLETED", "DROPPED"],
  INACTIVE: ["INACTIVE", "ACTIVE", "DROPPED"],
  TRANSFERRED: ["TRANSFERRED", "ACTIVE"],
  COMPLETED: ["COMPLETED"],
  DROPPED: ["DROPPED", "ACTIVE"],
};

export const BATCH_TRANSITIONS: Record<string, string[]> = {
  PLANNED: ["PLANNED", "ACTIVE", "CANCELLED"],
  ACTIVE: ["ACTIVE", "COMPLETED", "CANCELLED", "SUSPENDED"],
  SUSPENDED: ["SUSPENDED", "ACTIVE", "CANCELLED"],
  COMPLETED: ["COMPLETED"],
  CANCELLED: ["CANCELLED"],
};

export const INSTITUTION_TRANSITIONS: Record<string, string[]> = {
  PENDING_APPROVAL: ["PENDING_APPROVAL", "ACTIVE", "INACTIVE"],
  PENDING: ["PENDING", "ACTIVE", "INACTIVE"],
  ACTIVE: ["ACTIVE", "SUSPENDED", "INACTIVE"],
  SUSPENDED: ["SUSPENDED", "ACTIVE", "INACTIVE"],
  INACTIVE: ["INACTIVE", "ACTIVE"],
};

export function assertValidTransition(
  transitions: Record<string, string[]>,
  currentStatus: string,
  nextStatus: string,
  entityName: string
) {
  const cur = currentStatus.toUpperCase();
  const next = nextStatus.toUpperCase();
  const allowed = transitions[cur];
  if (!allowed) {
    throw new ValidationError(`Unknown ${entityName} status: ${currentStatus}`);
  }
  if (!allowed.includes(next)) {
    throw new ValidationError(
      `Invalid ${entityName} status transition from ${cur} to ${next}. Allowed: ${allowed.join(", ")}`
    );
  }
}

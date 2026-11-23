import type { ValidatorFn } from "../types";

/**
 * Run the Whole Workflow
 * Manual validation — learner self-reports completion.
 */
export const validateDynamicVariablesRunTheWholeWorkflow: ValidatorFn = async (_apiKey, _context) => {
  return { success: true, message: "Self-verified by learner." };
};

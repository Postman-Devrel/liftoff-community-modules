import { ValidatorFn } from "@/types/validation";

/**
 * Stub for a manual validation step.
 *
 * Manual steps (module.json has "manual": true) let the learner
 * self-report completion. The validator still runs but can simply
 * return success, or do a lightweight check.
 */
export const validateMyModuleNameDoSomething: ValidatorFn = async (
  apiKey,
  context
) => {
  return {
    success: true,
    message: "Step completed (self-reported).",
    pointsAwarded: 10,
  };
};

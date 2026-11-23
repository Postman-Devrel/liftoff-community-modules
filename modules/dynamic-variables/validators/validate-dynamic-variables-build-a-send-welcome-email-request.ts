import type { ValidatorFn } from "../types";

/**
 * Build a Send Welcome Email Request
 * TODO: Implement validation logic.
 * Hint: A POST request named "Send Welcome Email" exists in the "User Lifecycle" collection. Its body references `{{userEmail}}` and `{{createdUserId}}` and uses at least one `{{$...}}` dynamic variable.
 */
export const validateDynamicVariablesBuildASendWelcomeEmailRequest: ValidatorFn = async (apiKey, context) => {
  // Example: call the Postman API to verify the step
  // const workspaces = await listWorkspaces(apiKey);
  // const found = workspaces.find(ws => ws.name.includes("..."));

  return {
    success: false,
    message: "Validator not yet implemented — replace this stub with real logic.",
  };
};

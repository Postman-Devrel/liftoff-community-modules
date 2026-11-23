import type { ValidatorFn } from "../types";

/**
 * Send Your First Dynamic Variable
 * TODO: Implement validation logic.
 * Hint: A GET request named "Echo Dynamic Values" exists in the "User Lifecycle" collection. Its URL contains `{{$guid}}` and it has a header whose value contains a `{{$...}}` dynamic variable.
 */
export const validateDynamicVariablesSendYourFirstDynamicVariable: ValidatorFn = async (apiKey, context) => {
  // Example: call the Postman API to verify the step
  // const workspaces = await listWorkspaces(apiKey);
  // const found = workspaces.find(ws => ws.name.includes("..."));

  return {
    success: false,
    message: "Validator not yet implemented — replace this stub with real logic.",
  };
};

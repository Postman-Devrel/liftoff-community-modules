import { ValidatorFn } from "@/types/validation";

/**
 * Validator stub — replace with your actual validation logic.
 *
 * Validators receive the user's Postman API key and a context object
 * with any saved state (workspace IDs, collection UIDs, user inputs).
 *
 * Return a ValidationResult:
 *   { success: boolean, message: string, pointsAwarded: number, context?: ... }
 *
 * Use the Postman API (via apiKey) to check the user's workspace.
 * Example: GET https://api.getpostman.com/workspaces
 */
export const validateMyModuleNameCreateWorkspace: ValidatorFn = async (
  apiKey,
  context
) => {
  // Example: check that a workspace exists with the expected name
  //
  // const res = await fetch("https://api.getpostman.com/workspaces", {
  //   headers: { "X-Api-Key": apiKey },
  // });
  // const data = await res.json();
  // const workspace = data.workspaces?.find(
  //   (w) => w.name.toLowerCase().includes("my module name")
  // );
  //
  // if (!workspace) {
  //   return {
  //     success: false,
  //     message: "Workspace not found. Create a workspace named 'My Module Name'.",
  //     pointsAwarded: 0,
  //   };
  // }
  //
  // return {
  //   success: true,
  //   message: "Workspace found!",
  //   pointsAwarded: 10,
  //   context: { ...context, myModuleWorkspaceId: workspace.id },
  // };

  return {
    success: false,
    message: "This is a stub validator — replace with real validation logic.",
    pointsAwarded: 0,
  };
};

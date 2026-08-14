import { ValidatorFn } from "@/types/validation";

/**
 * Stub for a step with an inputField.
 *
 * When a step has an inputField, the value the learner enters is
 * available in context.userInputs[key]. Use it in your validation.
 */
export const validateMyModuleNameBuildTheThing: ValidatorFn = async (
  apiKey,
  context
) => {
  // The inputField key from module.json is "someValue"
  // const userValue = context.userInputs?.someValue;
  //
  // if (!userValue) {
  //   return {
  //     success: false,
  //     message: "Please enter a value in the input field.",
  //     pointsAwarded: 0,
  //   };
  // }
  //
  // ... validate using userValue and the Postman API ...

  return {
    success: false,
    message: "This is a stub validator — replace with real validation logic.",
    pointsAwarded: 0,
  };
};

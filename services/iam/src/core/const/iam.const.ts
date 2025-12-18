export const PasswordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@.#$!%*?&_-])[A-Za-z\d@.#$!%*?&_-]{8,15}$/;
export const InvalidPasswordMessage =
  'Passwords must be 8 to 16 characters long and include uppercase letters, lowercase letters, numbers, and at least one of the following special characters: @ . # $ ! % * ? & _ -';
export const UsernameRegex = /^[\w-._]+(@([\w-]+\.)+[\w-]{2,4})*$/;
export const InvalidUsernameMessage =
  'Usernames must be in the format of more than 6 characters, including letters, numbers, and the underscore (_) or dot (.) character, or in the form of an email address.';
// add email validation regex
export const EmailRegex =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

import { InternalServerErrorException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PasswordHashAlgorithms } from '../enums/other.enum';

export async function hashPasswordWithAlgorithm(
  password,
  algorithm: PasswordHashAlgorithms,
): Promise<string> {
  let hashedValue: string = password;
  try {
    switch (algorithm) {
      case PasswordHashAlgorithms.BCrypt: {
        const saltRounds = 10;
        hashedValue = await bcrypt.hash(password, saltRounds);
        break;
      }
      default: {
        throw new InternalServerErrorException('Error hashing password');
      }
    }
    return hashedValue;
  } catch (err) {
    throw new InternalServerErrorException('Error hashing password');
  }
}

export async function verifyPasswordWithAlgorithm(
  plainPassword,
  hashedValue,
  algorithm: PasswordHashAlgorithms,
): Promise<boolean> {
  if (algorithm === PasswordHashAlgorithms.BCrypt) {
    // Xác minh với bcrypt
    const result = await bcrypt.compare(plainPassword, hashedValue);
    return result;
  }
  else {
    throw new Error(`Unsupported algorithm: ${algorithm}`);
  }
}

export async function decodeBase64(base64String: string) {
  let decodedString = undefined;
  try {
    const buff = new Buffer(base64String, 'base64');
    decodedString = buff.toString('ascii');
  } catch (error) {}

  return decodedString;
}

export function encodeBase64(rawString: string) {
  let encodedString = undefined;
  try {
    const buff = new Buffer(rawString);
    encodedString = buff.toString('base64');
  } catch (error) {}

  return encodedString;
}
import { InternalServerErrorException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PasswordHashAlgorithms } from '../app/misc/types';

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

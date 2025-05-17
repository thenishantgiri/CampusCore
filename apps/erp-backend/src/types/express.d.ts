import { SafeUser } from 'src/auth/types/safe-user.interface';

declare global {
  namespace Express {
    // Extend the existing Request interface
    interface User extends SafeUser {
      // You can add any additional properties here if needed
      // beyond what's in SafeUser
    }
  }
}

// This empty export is needed to make this a module
export {};
